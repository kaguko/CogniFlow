import { globalMultiTierCache } from './multiTieredCache';

/**
 * Asynchronous Message Queue & Decoupled Worker Pool
 *
 * For High-Frequency Agents executing continuous reasoning loops:
 * 1. Instant ACK (< 2ms): Request enters queue, client gets ACK immediately without waiting for computation.
 * 2. Decoupled Workers: Pull jobs from queue to compute Drift Scores, evaluate assertions, and update state.
 * 3. Backpressure Management: Absorbs spikes, sheds load gracefully with 429 when queue limit is reached,
 *    preventing memory leaks or Event Loop starvation.
 */

export interface AsyncAgentJob {
  id: string;
  agentId: string;
  actionType: 'NANO_STEP_EVAL' | 'TOOL_ASSERTION' | 'CONTRACT_CHECK' | 'SOCRATIC_QUERY';
  payload: any;
  receivedAt: number;
  priority?: 'high' | 'normal' | 'low';
}

export interface JobResult {
  jobId: string;
  agentId: string;
  driftScore: number;
  circuitBreakerTripped: boolean;
  status: 'completed' | 'drift_alert' | 'circuit_halt';
  processedAt: number;
  executionDurationMs: number;
  outputSummary: string;
}

export interface QueueTelemetry {
  queueDepth: number;
  maxQueueCapacity: number;
  totalEnqueued: number;
  totalProcessed: number;
  totalShedDueToBackpressure: number;
  averageAckLatencyMs: number;
  activeWorkerCount: number;
  workerThroughputPerSec: number;
  backpressureState: 'NORMAL' | 'ELEVATED' | 'BACKPRESSURE_ACTIVE';
  recentCompletedJobs: JobResult[];
}

export class AsyncWorkerQueue {
  private queue: AsyncAgentJob[] = [];
  private maxCapacity: number;
  private workerCount: number;
  private isProcessing = false;
  private totalEnqueued = 0;
  private totalProcessed = 0;
  private totalShedDueToBackpressure = 0;
  private ackLatencies: number[] = [];
  private recentCompletedJobs: JobResult[] = [];
  private throughputCounter = 0;
  private throughputRate = 0;
  private workerIntervalId: NodeJS.Timeout | null = null;
  private throughputIntervalId: NodeJS.Timeout | null = null;

  constructor(maxCapacity = 10000, workerCount = 4) {
    this.maxCapacity = maxCapacity;
    this.workerCount = workerCount;

    // Start background worker poll loop
    this.startWorkerPool();

    // Measure throughput every second
    this.throughputIntervalId = setInterval(() => {
      this.throughputRate = this.throughputCounter;
      this.throughputCounter = 0;
    }, 1000);
  }

  /**
   * Enqueue job with Instant ACK (< 2ms)
   */
  public enqueue(jobData: Omit<AsyncAgentJob, 'id' | 'receivedAt'>): {
    acknowledged: boolean;
    jobId: string;
    queuePosition: number;
    ackLatencyMs: number;
    backpressureState: 'NORMAL' | 'ELEVATED' | 'BACKPRESSURE_ACTIVE';
    error?: string;
  } {
    const startTime = performance.now();
    const currentDepth = this.queue.length;

    // Backpressure Shedding Check
    if (currentDepth >= this.maxCapacity) {
      this.totalShedDueToBackpressure++;
      const ackLatencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        acknowledged: false,
        jobId: '',
        queuePosition: currentDepth,
        ackLatencyMs,
        backpressureState: 'BACKPRESSURE_ACTIVE',
        error: 'BACKPRESSURE_SHED: Hàng đợi tác tử đã đạt giới hạn tối đa. Vui lòng giảm tần suất gọi.',
      };
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: AsyncAgentJob = {
      ...jobData,
      id: jobId,
      receivedAt: Date.now(),
    };

    if (job.priority === 'high') {
      this.queue.unshift(job);
    } else {
      this.queue.push(job);
    }

    this.totalEnqueued++;
    const ackLatencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    this.ackLatencies.push(ackLatencyMs);
    if (this.ackLatencies.length > 100) this.ackLatencies.shift();

    const fillRatio = (currentDepth + 1) / this.maxCapacity;
    const backpressureState =
      fillRatio > 0.85 ? 'ELEVATED' : fillRatio > 0.98 ? 'BACKPRESSURE_ACTIVE' : 'NORMAL';

    return {
      acknowledged: true,
      jobId,
      queuePosition: this.queue.length,
      ackLatencyMs,
      backpressureState,
    };
  }

  /**
   * Decoupled Worker Pool processing jobs in batches
   */
  private startWorkerPool(): void {
    this.workerIntervalId = setInterval(async () => {
      if (this.isProcessing || this.queue.length === 0) return;
      this.isProcessing = true;

      try {
        const batchSize = Math.min(this.workerCount * 2, this.queue.length);
        const batch = this.queue.splice(0, batchSize);

        for (const job of batch) {
          const result = this.processSingleJob(job);
          this.totalProcessed++;
          this.throughputCounter++;

          this.recentCompletedJobs.unshift(result);
          if (this.recentCompletedJobs.length > 20) {
            this.recentCompletedJobs.pop();
          }

          // Update Tier 1 Cache with latest evaluation
          globalMultiTierCache.setTier1(`agent:latest_eval:${job.agentId}`, result, 60000);

          // Write-behind audit log to Tier 3
          globalMultiTierCache.enqueueTier3WriteBehind(job.id, {
            agentId: job.agentId,
            action: job.actionType,
            driftScore: result.driftScore,
            status: result.status,
          });
        }
      } finally {
        this.isProcessing = false;
      }
    }, 10); // Check every 10ms
  }

  /**
   * Simulates sub-millisecond evaluation logic
   */
  private processSingleJob(job: AsyncAgentJob): JobResult {
    const start = performance.now();

    // Derive drift score based on payload or simulated heuristics
    let driftScore = 5;
    const text = JSON.stringify(job.payload || {});

    if (text.includes('rabbit_hole') || text.includes('over_engineering')) {
      driftScore = 75;
    } else if (text.includes('distributed') || text.includes('cluster') || text.includes('graphql')) {
      driftScore = 48;
    } else if (text.includes('test') || text.includes('verify') || text.includes('contract')) {
      driftScore = 8;
    } else {
      driftScore = Math.floor(Math.random() * 20) + 5;
    }

    const circuitBreakerTripped = driftScore >= 65;
    const status: JobResult['status'] = circuitBreakerTripped
      ? 'circuit_halt'
      : driftScore > 35
      ? 'drift_alert'
      : 'completed';

    const duration = Math.round((performance.now() - start) * 100) / 100;

    return {
      jobId: job.id,
      agentId: job.agentId,
      driftScore,
      circuitBreakerTripped,
      status,
      processedAt: Date.now(),
      executionDurationMs: duration,
      outputSummary: `Đã thẩm định vi bước ${job.actionType} trong ${duration}ms (Drift: ${driftScore}%)`,
    };
  }

  public getTelemetry(): QueueTelemetry {
    const avgAck =
      this.ackLatencies.length > 0
        ? this.ackLatencies.reduce((a, b) => a + b, 0) / this.ackLatencies.length
        : 0.8;

    const fillRatio = this.queue.length / this.maxCapacity;
    const backpressureState =
      fillRatio > 0.85 ? 'ELEVATED' : fillRatio > 0.98 ? 'BACKPRESSURE_ACTIVE' : 'NORMAL';

    return {
      queueDepth: this.queue.length,
      maxQueueCapacity: this.maxCapacity,
      totalEnqueued: this.totalEnqueued,
      totalProcessed: this.totalProcessed,
      totalShedDueToBackpressure: this.totalShedDueToBackpressure,
      averageAckLatencyMs: Math.round(avgAck * 100) / 100,
      activeWorkerCount: this.workerCount,
      workerThroughputPerSec: this.throughputRate,
      backpressureState,
      recentCompletedJobs: this.recentCompletedJobs,
    };
  }

  public destroy(): void {
    if (this.workerIntervalId) clearInterval(this.workerIntervalId);
    if (this.throughputIntervalId) clearInterval(this.throughputIntervalId);
  }
}

export const globalAsyncWorkerQueue = new AsyncWorkerQueue(10000, 8);
