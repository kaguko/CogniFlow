import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Zap,
  Layers,
  ArrowRight,
  HardDrive,
  Cpu,
  Code2,
  FileCode,
  Sliders,
  Play,
  Flame,
  Lock,
  Unlock,
  ShieldCheck,
  FileText,
  Activity,
  Minimize2,
  FastForward,
  Server,
  RefreshCw,
  Clock,
  ShieldAlert,
  ArrowDown,
  Workflow,
  Sparkles,
  Terminal,
  Box,
  Droplets,
  Users,
  ShieldX,
  Gauge,
  Cpu as CpuIcon,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import { analyzeJsonbQueryPlan } from '../utils/jsonbAnalyzer';
import {
  simulateLockContention,
  simulateToastTax,
} from '../utils/postgresPerformanceEngine';
import {
  tombstoneCacheEngine,
  SimulationResult,
} from '../utils/cacheAsideTombstoneEngine';
import {
  TASK_QUEUE_MATRIX,
  arqEngine,
  ArqJobState,
} from '../utils/taskQueueMatrixEngine';
import {
  calculateProductionSizing,
  SizingConfig,
} from '../utils/dockerSizingEngine';
import {
  MODEL_TIERS,
  RATE_LIMIT_TIERS,
  rateLimiter,
  smartCache,
  classifyTaskComplexity,
  TaskComplexity,
} from '../utils/smartCacheRateLimitEngine';

export const JsonbIndexStrategyView: React.FC = () => {
  const [mainSection, setMainSection] = useState<
    'smart_cache' | 'docker_sizing' | 'arq_matrix' | 'tombstone' | 'indexes' | 'locks' | 'toast'
  >('smart_cache');

  // Smart Cache & Rate Limit States
  const [selectedTierKey, setSelectedTierKey] = useState<string>('ai_simple');
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);
  const [testPrompt, setTestPrompt] = useState<string>('Chia nhỏ task setup Docker container');
  const [cacheResultNotice, setCacheResultNotice] = useState<string | null>(null);
  const [cacheStatsState, setCacheStatsState] = useState(smartCache.getStats());

  // Trigger test rate limit token
  const handleTestRateLimit = () => {
    const res = rateLimiter.check('demo_user_client', selectedTierKey, 1);
    setRateLimitStatus(res);
  };

  const handleTestSmartCache = () => {
    const complexity = classifyTaskComplexity(testPrompt, testPrompt.length);
    const cached = smartCache.get(testPrompt);
    if (cached.hit) {
      setCacheResultNotice(`⚡ CACHE HIT! Trả kết quả tức thì trong ${cached.latencySavedMs}ms, tiết kiệm 100% token gọi LLM.`);
    } else {
      smartCache.set(testPrompt, { result: 'Phân rã 3 vi bước thành công', complexity }, complexity);
      setCacheResultNotice(`💾 CACHE MISS -> Đã định tuyến sang ${MODEL_TIERS[complexity].name} (${MODEL_TIERS[complexity].modelId}) và lưu vào cache.`);
    }
    setCacheStatsState(smartCache.getStats());
  };

  // Docker & Sizing Config State
  const [sizingConfig, setSizingConfig] = useState<SizingConfig>({
    cpuCores: 2,
    containerRamMb: 1024,
    postgresMaxConnections: 100,
    containerReplicas: 1,
    hasArqWorker: true,
  });

  // Tab 1: Index Simulator States
  const [selectedOperator, setSelectedOperator] = useState<'@>' | '?' | '->>' | '->' | 'BETWEEN'>('@>');
  const [selectedIndexType, setSelectedIndexType] = useState<
    'gin_ops' | 'gin_path_ops' | 'expression_btree' | 'partial_index' | 'none'
  >('gin_path_ops');
  const [sampleKey, setSampleKey] = useState('priority');
  const [sampleValue, setSampleValue] = useState('high');
  const [hasPartialCondition, setHasPartialCondition] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<
    'dockerfile' | 'gunicorn_conf' | 'docker_compose' | 'arq_python' | 'redis_lua' | 'sql' | 'drizzle'
  >('dockerfile');

  // Tab 2: Lock Contention States
  const [lockMode, setLockMode] = useState<'FOR UPDATE' | 'FOR NO KEY UPDATE'>('FOR NO KEY UPDATE');
  const [workersCount, setWorkersCount] = useState<number>(25);

  // Tab 3: TOAST Tax States
  const [toastApproach, setToastApproach] = useState<'Raw JSONB Fetch (>8KB)' | 'Stored Generated Column'>(
    'Stored Generated Column'
  );
  const [docSizeKb, setDocSizeKb] = useState<number>(32);

  // Tab 4: Tombstone Cache Invalidation States
  const [withTombstone, setWithTombstone] = useState<boolean>(true);
  const [simulationResult, setSimulationResult] = useState<SimulationResult>(() =>
    tombstoneCacheEngine.simulateRaceCondition(true)
  );

  // Tab 5: ARQ Engine Interactive Simulation
  const [arqJobs, setArqJobs] = useState<ArqJobState[]>([]);
  const [isEnqueueing, setIsEnqueueing] = useState<boolean>(false);
  const [selectedTaskType, setSelectedTaskType] = useState<'send_webhook' | 'batch_embedding' | 'send_email'>(
    'send_webhook'
  );

  const [copiedType, setCopiedType] = useState<string | null>(null);

  const sizingResult = calculateProductionSizing(sizingConfig);

  const handleRunTombstoneSimulation = (useTombstone: boolean) => {
    setWithTombstone(useTombstone);
    setSimulationResult(tombstoneCacheEngine.simulateRaceCondition(useTombstone));
  };

  const handleEnqueueArqJob = async () => {
    setIsEnqueueing(true);
    const newJob = await arqEngine.enqueue(selectedTaskType, {
      payloadSizeKb: Math.floor(Math.random() * 50) + 5,
      targetEndpoint: 'https://api.symflowage.internal/v1/webhook',
      priority: 'high',
    });
    setArqJobs((prev) => [newJob, ...prev.slice(0, 7)]);
    setTimeout(() => setIsEnqueueing(false), 300);
  };

  const analysis = analyzeJsonbQueryPlan(
    selectedOperator,
    selectedIndexType,
    hasPartialCondition,
    sampleKey,
    sampleValue
  );

  const lockBenchmark = simulateLockContention(lockMode, workersCount);
  const toastBenchmark = simulateToastTax(toastApproach, docSizeKb);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const dockerfileCode = `# =========================================================================
# Multi-Stage Production Dockerfile (Security Hardened & Non-Root)
# =========================================================================

# --- STAGE 1: Builder ---
FROM python:3.11-slim-bookworm AS builder
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv && \\
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \\
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# --- STAGE 2: Runner (Bọc code an toàn, Non-Root User 10001:10001) ---
FROM python:3.11-slim-bookworm AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    libpq5 dumb-init curl && rm -rf /var/lib/apt/lists/*

# BẢO MẬT: Tạo Non-Root User & Group (Không chạy Root tránh bị hack leo thang)
RUN groupadd -g 10001 appgroup && \\
    useradd -u 10001 -g appgroup -s /bin/bash -m -d /home/appuser appuser

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \\
    PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1

COPY --chown=appuser:appgroup . /app
USER appuser:appgroup
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
    CMD curl -f http://localhost:8000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["gunicorn", "-c", "gunicorn.conf.py", "server:app"]`;

  const gunicornConfCode = `# =========================================================================
# Gunicorn Configuration File (gunicorn.conf.py)
# =========================================================================
import multiprocessing
import os

# TÍNH TOÁN VỪA ĐỦ ĐẦU BẾP (WORKERS): (2 x CPU Cores) + 1
cpu_cores = os.cpu_count() or 1
workers_calculated = (2 * cpu_cores) + 1
workers = int(os.getenv("WEB_CONCURRENCY", workers_calculated))

worker_class = "uvicorn.workers.UvicornWorker"
bind = os.getenv("BIND", "0.0.0.0:8000")
backlog = 2048

# Tự động restart worker sau 10,000 requests để chống rò rỉ bộ nhớ (Memory Leak)
max_requests = int(os.getenv("MAX_REQUESTS", 10000))
max_requests_jitter = int(os.getenv("MAX_REQUESTS_JITTER", 2000))

timeout = int(os.getenv("TIMEOUT", 30))
graceful_timeout = int(os.getenv("GRACEFUL_TIMEOUT", 30))
keepalive = 5
preload_app = True

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")`;

  const dockerComposeCode = `version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: symflowage-api
    restart: unless-stopped
    user: "10001:10001" # Non-Root Execution
    ports:
      - "8000:8000"
    environment:
      - BIND=0.0.0.0:8000
      - WEB_CONCURRENCY=${sizingResult.recommendedWorkers} # (2 x ${sizingConfig.cpuCores} Cores) + 1 = ${sizingResult.recommendedWorkers} Workers
      - DB_POOL_SIZE=${sizingResult.safePoolSizePerWorker} # Chia vòi nước an toàn mỗi Worker
      - DB_MAX_OVERFLOW=${sizingResult.safeMaxOverflowPerWorker}
      - DATABASE_URL=postgresql://symflow_user:symflow_secret@postgres:5432/symflowage_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '${sizingConfig.cpuCores}.0'
          memory: ${sizingConfig.containerRamMb}M

  postgres:
    image: postgres:16-alpine
    container_name: symflowage-postgres
    restart: unless-stopped
    command:
      - "postgres"
      - "-c"
      - "max_connections=${sizingConfig.postgresMaxConnections}"
      - "-c"
      - "shared_buffers=256MB"
    environment:
      - POSTGRES_USER=symflow_user
      - POSTGRES_PASSWORD=symflow_secret
      - POSTGRES_DB=symflowage_db
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U symflow_user -d symflowage_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: symflowage-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5`;

  const arqPythonCode = `# =========================================================================
# ARQ (Async Redis Task Queue) - Chuẩn Production High-Concurrency I/O
# =========================================================================
import asyncio
from arq import create_pool
from arq.connections import RedisSettings

async def send_webhook(ctx: dict, url: str, payload: dict) -> dict:
    async with ctx['session'].post(url, json=payload) as resp:
        return {'status': resp.status, 'url': url}

class WorkerSettings:
    functions = [send_webhook]
    redis_settings = RedisSettings(host='127.0.0.1', port=6379)
    max_jobs = 1000`;

  const redisLuaScript = `-- TRỤ CỘT 4: REDIS LUA SCRIPT CHO TOMBSTONE CACHE-ASIDE
local tombstoneExists = redis.call("EXISTS", KEYS[2])
if tombstoneExists == 1 then
    return 0 -- Có Bia Mộ hiệu lực -> Chặn ghi đè dữ liệu cũ
else
    redis.call("SETEX", KEYS[1], tonumber(ARGV[2]), ARGV[1])
    return 1
end`;

  const sqlDDL = `-- TỐI ƯU POSTGRESQL DDL
CREATE INDEX notes_metadata_gin_path_idx ON notes USING gin (metadata jsonb_path_ops);
ALTER TABLE notes ADD COLUMN extracted_priority text GENERATED ALWAYS AS (metadata->>'priority') STORED;
CREATE INDEX notes_generated_priority_idx ON notes (extracted_priority);
SELECT * FROM task_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1 FOR NO KEY UPDATE SKIP LOCKED;`;

  const drizzleSchema = `import { pgTable, serial, text, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  metadata: jsonb('metadata').default({}),
  extractedPriority: text('extracted_priority').generatedAlwaysAs(sql\`metadata->>'priority'\`),
}, (table) => ({
  ginPathOpsIdx: index('notes_meta_gin_path_idx').using('gin', sql\`\${table.metadata} jsonb_path_ops\`),
  generatedPriorityIdx: index('notes_gen_priority_idx').on(table.extractedPriority),
}));`;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Box className="w-48 h-48 text-blue-400" />
        </div>
        <div className="relative z-10 max-w-4xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Production Hardening & Resource Sizing Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Gói Docker An Toàn (Non-Root) & Phân Bổ Tài Nguyên Chuẩn Xác
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Bọc code an toàn không chạy Root (chống hack leo thang), thuê vừa đủ <strong>Đầu bếp (Gunicorn Workers = (2 × Cores) + 1)</strong> để không quá tải CPU, và chia vừa đủ <strong>Vòi nước (DB Connection Pool)</strong> để không làm sập Database.
          </p>
        </div>
      </div>

      {/* Main Mode Switcher Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setMainSection('smart_cache')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'smart_cache'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-300" />
          <span>⚡ Smart Cache & Rate Limit (Flash/Lite)</span>
        </button>

        <button
          onClick={() => setMainSection('docker_sizing')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'docker_sizing'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Box className="w-4 h-4 text-blue-300" />
          <span>🐳 Gói Docker & Sizing Lab</span>
        </button>

        <button
          onClick={() => setMainSection('arq_matrix')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'arq_matrix'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Workflow className="w-4 h-4 text-indigo-300" />
          <span>Ma Trận Hàng Đợi: ARQ</span>
        </button>

        <button
          onClick={() => setMainSection('tombstone')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'tombstone'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-300" />
          <span>Trụ Cột 4: Tombstone Cache</span>
        </button>

        <button
          onClick={() => setMainSection('indexes')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'indexes'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Chỉ Mục JSONB</span>
        </button>

        <button
          onClick={() => setMainSection('locks')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'locks'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Chống Write Bottlenecks</span>
        </button>

        <button
          onClick={() => setMainSection('toast')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'toast'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Minimize2 className="w-4 h-4" />
          <span>Tránh Thuế TOAST</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: SMART CACHING, RATE LIMITING & MODEL ROUTING */}
      {/* ========================================================================= */}
      {mainSection === 'smart_cache' && (
        <div className="space-y-6">
          {/* 3 Pillars of AI Optimization */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Model Routing */}
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <Zap className="w-5 h-5" />
                <span>1. Model Nhẹ Flash/Lite Ngay Từ Đầu</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tự động phân loại tác vụ: vi bước, định dạng JSON và đo ma sát nhận thức chuyển thẳng sang <code className="px-1.5 py-0.5 bg-black/60 rounded text-emerald-300 font-mono">gemini-3.1-flash-lite</code> (~140ms, tiết kiệm <strong>88% chi phí</strong>).
              </p>
              <div className="pt-1 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Simple: Flash-Lite | Medium: Flash | Complex: Pro
              </div>
            </div>

            {/* Card 2: Smart Semantic & Exact Cache */}
            <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
                <HardDrive className="w-5 h-5" />
                <span>2. Caching Thông Minh (Adaptive TTL)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Chuẩn hóa truy vấn & Exact SHA-256 Hash. Trả kết quả tính trước chỉ trong <strong>&lt; 5ms</strong>, triệt tiêu 100% chi phí token và độ trễ upstream.
              </p>
              <div className="pt-1 text-[11px] font-mono text-blue-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Hit Rate: {cacheStatsState.hitRatioPct}% | Latency Saved: {cacheStatsState.totalLatencySavedMs}ms
              </div>
            </div>

            {/* Card 3: Token Bucket Rate Limiting */}
            <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                <Gauge className="w-5 h-5" />
                <span>3. Token Bucket Rate Limiting</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kiểm soát quota đa tầng (IP/Client). Trả về chuẩn header <code className="px-1.5 py-0.5 bg-black/60 rounded text-amber-300 font-mono">X-RateLimit-*</code> và mã <code className="px-1.5 py-0.5 bg-black/60 rounded text-amber-300 font-mono">429 Retry-After</code> bảo vệ backend.
              </p>
              <div className="pt-1 text-[11px] font-mono text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 60 req/min (AI Simple), 30 req/min (Standard)
              </div>
            </div>
          </div>

          {/* Model Matrix Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CpuIcon className="w-4 h-4 text-emerald-400" />
                <span>Ma Trận Phân Cấp Model (Intelligent Model Routing Tiering)</span>
              </h3>
              <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-500/30">
                ACTIVE IN PRODUCTION
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Tầng (Tier)</th>
                    <th className="py-3 px-4">Model Gemini</th>
                    <th className="py-3 px-4">Tác vụ Tối ưu</th>
                    <th className="py-3 px-4">Độ Trễ TB</th>
                    <th className="py-3 px-4">Tiết Kiệm Token</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  <tr className="bg-emerald-950/20 hover:bg-emerald-950/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Tier 1 (Lightweight)
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">gemini-3.1-flash-lite</td>
                    <td className="py-3.5 px-4 text-slate-300">{MODEL_TIERS.simple.recommendedTask}</td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">~140ms</td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">Tiết kiệm 88%</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-blue-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Tier 2 (Balanced)
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">gemini-2.5-flash</td>
                    <td className="py-3.5 px-4 text-slate-300">{MODEL_TIERS.medium.recommendedTask}</td>
                    <td className="py-3.5 px-4 font-mono text-blue-400 font-bold">~420ms</td>
                    <td className="py-3.5 px-4 font-mono text-blue-400 font-bold">Tiết kiệm 65%</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Tier 3 (Deep Reasoning)
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">gemini-2.5-pro</td>
                    <td className="py-3.5 px-4 text-slate-300">{MODEL_TIERS.complex.recommendedTask}</td>
                    <td className="py-3.5 px-4 font-mono text-purple-400 font-bold">~1,250ms</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">Chuỗi suy luận sâu</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Lab: Rate Limiter & Smart Cache Test */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Token Bucket Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span>Trình Giả Lập Token Bucket Rate Limiting</span>
              </h3>

              <div className="space-y-3">
                <label className="text-xs text-slate-400">Chọn Phân Tầng Rate Limit:</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(RATE_LIMIT_TIERS).slice(0, 3).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => {
                        setSelectedTierKey(k);
                        setRateLimitStatus(null);
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                        selectedTierKey === k
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {v.tierName}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Hạn mức (Burst Capacity):</span>
                    <span className="font-mono text-white font-bold">{RATE_LIMIT_TIERS[selectedTierKey]?.maxTokens} tokens</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tốc độ hồi phục:</span>
                    <span className="font-mono text-emerald-400 font-bold">{RATE_LIMIT_TIERS[selectedTierKey]?.refillRatePerSec} tokens/giây</span>
                  </div>
                  {rateLimitStatus && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Tokens còn lại:</span>
                        <span className={`font-mono font-bold ${rateLimitStatus.allowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {rateLimitStatus.remainingTokens} / {rateLimitStatus.maxTokens}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Trạng thái:</span>
                        <span className={`font-bold ${rateLimitStatus.allowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {rateLimitStatus.allowed ? '200 OK (Allowed)' : `429 Too Many Requests (Retry sau ${rateLimitStatus.retryAfterSec}s)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleTestRateLimit}
                  className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Bắn 1 Request Thử Nghiệm Token Bucket</span>
                </button>
              </div>
            </div>

            {/* Right: Smart Caching Lab */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span>Trình Giả Lập Smart Caching (Adaptive TTL)</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400">Nhập Prompt / Tác vụ mẫu:</label>
                  <input
                    type="text"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {cacheResultNotice && (
                  <div className="p-3 bg-slate-950 border border-blue-500/40 rounded-xl text-xs text-blue-300 font-mono">
                    {cacheResultNotice}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Total Requests</div>
                    <div className="text-lg font-mono font-bold text-white mt-0.5">{cacheStatsState.totalRequests}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/30">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Cache Hit Rate</div>
                    <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">{cacheStatsState.hitRatioPct}%</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-blue-500/30">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Latency Saved</div>
                    <div className="text-lg font-mono font-bold text-blue-400 mt-0.5">{cacheStatsState.totalLatencySavedMs}ms</div>
                  </div>
                </div>

                <button
                  onClick={handleTestSmartCache}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kiểm Tra Cache & Phân Tuyến Model</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 0: DOCKER & RESOURCE SIZING LAB */}
      {/* ========================================================================= */}
      {mainSection === 'docker_sizing' && (
        <div className="space-y-6">
          {/* 3 CORE PILLARS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Docker Non-Root Security */}
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>1. Bọc Code An Toàn (Non-Root)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tạo user & group riêng biệt <code className="px-1.5 py-0.5 bg-black/60 rounded text-emerald-300 font-mono">appuser:appgroup (UID 10001)</code>. Nếu ứng dụng có lỗ hổng, hacker <strong>không thể chiếm quyền root host</strong> để can thiệp hệ thống.
              </p>
              <div className="pt-1 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> USER appuser:appgroup + dumb-init PID 1
              </div>
            </div>

            {/* Card 2: Workers Sizing */}
            <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
                <Users className="w-5 h-5" />
                <span>2. Vừa Đủ Đầu Bếp (Workers)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Áp dụng công thức vàng: <code className="px-1.5 py-0.5 bg-black/60 rounded text-blue-300 font-mono font-bold">(2 × Cores) + 1</code>. Quá nhiều worker sẽ làm nghẽn CPU do Context-Switching; quá ít worker sẽ lãng phí tài nguyên.
              </p>
              <div className="pt-1 text-[11px] font-mono text-blue-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-300" /> {sizingConfig.cpuCores} Cores ➔ {sizingResult.recommendedWorkers} Workers tối ưu
              </div>
            </div>

            {/* Card 3: DB Connection Pool Sizing */}
            <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                <Droplets className="w-5 h-5" />
                <span>3. Chia Vòi Nước (DB Pool) Vừa Đủ</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Phân bổ <code className="px-1.5 py-0.5 bg-black/60 rounded text-amber-300 font-mono font-bold">DB_POOL_SIZE</code> cho từng worker sao cho tổng kết nối luôn thấp hơn <code className="px-1.5 py-0.5 bg-black/60 rounded text-amber-300 font-mono">max_connections</code> của PostgreSQL, <strong>triệt tiêu nguy cơ sập Database</strong>.
              </p>
              <div className="pt-1 text-[11px] font-mono text-amber-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Pool Size: {sizingResult.safePoolSizePerWorker} | Dự phòng: {sizingResult.dbHeadroomReserved} slots
              </div>
            </div>
          </div>

          {/* INTERACTIVE SIZING LAB CONTROLS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-400" />
                  Bảng Điều Khiển Sizing & Giả Lập Tải Phần Cứng
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thay đổi thông số hạ tầng để hệ thống tự động tính toán số Worker và Connection Pool an toàn.
                </p>
              </div>

              {/* Status Indicator Badge */}
              <div
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                  sizingResult.dbStatusSeverity === 'safe'
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300'
                    : sizingResult.dbStatusSeverity === 'warning'
                    ? 'bg-amber-950/60 border-amber-500/80 text-amber-300'
                    : 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                }`}
              >
                {sizingResult.dbStatusSeverity === 'safe' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>
                  {sizingResult.dbStatusSeverity === 'safe'
                    ? 'Cấu Hình An Toàn'
                    : sizingResult.dbStatusSeverity === 'warning'
                    ? 'Cảnh Báo Vòi Nước Hẹp'
                    : 'CẢNH BÁO SẬP DATABASE!'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sliders Input Column */}
              <div className="lg:col-span-6 space-y-5">
                {/* CPU Cores */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-blue-400" /> CPU Cores được cấp phát:
                    </span>
                    <span className="font-mono font-bold text-blue-400">{sizingConfig.cpuCores} Cores</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    step="1"
                    value={sizingConfig.cpuCores}
                    onChange={(e) =>
                      setSizingConfig((prev) => ({ ...prev, cpuCores: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-500 bg-slate-950 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>1 Core</span>
                    <span>4 Cores</span>
                    <span>8 Cores</span>
                    <span>16 Cores</span>
                  </div>
                </div>

                {/* Container RAM */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-indigo-400" /> RAM Giới hạn của Container:
                    </span>
                    <span className="font-mono font-bold text-indigo-400">
                      {sizingConfig.containerRamMb >= 1024
                        ? `${(sizingConfig.containerRamMb / 1024).toFixed(1)} GB`
                        : `${sizingConfig.containerRamMb} MB`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="8192"
                    step="512"
                    value={sizingConfig.containerRamMb}
                    onChange={(e) =>
                      setSizingConfig((prev) => ({ ...prev, containerRamMb: Number(e.target.value) }))
                    }
                    className="w-full accent-indigo-500 bg-slate-950 cursor-pointer"
                  />
                </div>

                {/* Postgres max_connections */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-amber-400" /> PostgreSQL max_connections:
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {sizingConfig.postgresMaxConnections} vòi nước tối đa
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="10"
                    value={sizingConfig.postgresMaxConnections}
                    onChange={(e) =>
                      setSizingConfig((prev) => ({
                        ...prev,
                        postgresMaxConnections: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 bg-slate-950 cursor-pointer"
                  />
                </div>

                {/* Container Replicas */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-emerald-400" /> Số lượng Pods / Replicas App:
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{sizingConfig.containerReplicas} Pod(s)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={sizingConfig.containerReplicas}
                    onChange={(e) =>
                      setSizingConfig((prev) => ({
                        ...prev,
                        containerReplicas: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500 bg-slate-950 cursor-pointer"
                  />
                </div>
              </div>

              {/* Realtime Calculated Sizing Display */}
              <div className="lg:col-span-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Workers Stat */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Số Đầu Bếp (Workers)</div>
                    <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                      {sizingResult.recommendedWorkers} Workers
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Công thức: (2 × {sizingConfig.cpuCores}) + 1
                    </div>
                  </div>

                  {/* RAM per worker */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Bộ nhớ / Worker</div>
                    <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                      ~{sizingResult.memoryPerWorkerMb} MB
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Mức an toàn chống OOM</div>
                  </div>

                  {/* DB Pool per worker */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Vòi Nước (Pool Size / Worker)</div>
                    <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                      {sizingResult.safePoolSizePerWorker} vòi
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      + {sizingResult.safeMaxOverflowPerWorker} overflow dự phòng
                    </div>
                  </div>

                  {/* Total DB Conns vs Max */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Tổng Vòi Nước Cluster</div>
                    <div
                      className={`text-2xl font-bold font-mono mt-1 ${
                        sizingResult.isDbOverloaded ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {sizingResult.totalMaxDbConnections} / {sizingConfig.postgresMaxConnections}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Còn dư {sizingResult.dbHeadroomReserved} slots cho DBA
                    </div>
                  </div>
                </div>

                {/* Status Advice Box */}
                <div
                  className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                    sizingResult.dbStatusSeverity === 'safe'
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                      : sizingResult.dbStatusSeverity === 'warning'
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                      : 'bg-rose-950/40 border-rose-500/80 text-rose-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    <span>Đánh Giá Tải & Khuyến Nghị Kiến Trúc:</span>
                  </div>
                  <p>{sizingResult.dbStatusNote}</p>
                  <p className="opacity-80">{sizingResult.workerCpuNote}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: MA TRẬN LỰA CHỌN HÀNG ĐỢI TÁC VỤ & ARQ */}
      {/* ========================================================================= */}
      {mainSection === 'arq_matrix' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Ma trận Lựa chọn Hàng đợi Tác vụ (Task Queue Engine)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bảng ma trận kiến trúc lựa chọn công nghệ hàng đợi phù hợp cho từng bài toán backend.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold">
                  RECOMMENDED FOR I/O: ARQ
                </span>
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold">
                  RECOMMENDED FOR ACID: Postgres
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-5 text-slate-300 bg-slate-950/90 w-44">Tiêu chí</th>
                    <th className="py-4 px-5 text-slate-300 bg-slate-900/60 border-l border-r border-slate-800/80">
                      FastAPI BackgroundTasks
                    </th>
                    <th className="py-4 px-5 bg-indigo-950/40 border-r border-slate-800/80 relative">
                      <div className="inline-block px-2 py-0.5 mb-1.5 rounded bg-blue-600 text-white font-mono text-[10px] font-extrabold uppercase tracking-wide shadow-sm">
                        RECOMMENDED FOR ACID
                      </div>
                      <div className="text-white font-bold text-sm">Postgres SKIP LOCKED</div>
                    </th>
                    <th className="py-4 px-5 bg-blue-950/60 border-r border-slate-800/80 relative shadow-inner">
                      <div className="inline-block px-2 py-0.5 mb-1.5 rounded bg-blue-500 text-white font-mono text-[10px] font-extrabold uppercase tracking-wide shadow-sm">
                        RECOMMENDED FOR I/O
                      </div>
                      <div className="text-blue-200 font-bold text-sm flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>ARQ (Async Redis)</span>
                      </div>
                    </th>
                    <th className="py-4 px-5 text-slate-300 bg-slate-900/60">Celery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans text-xs sm:text-sm">
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5 font-bold text-white bg-slate-950/50">Mô hình Thực thi</td>
                    <td className="py-4 px-5 text-slate-300 bg-slate-900/30 border-l border-r border-slate-800/80">
                      In-process Threadpool / Event Loop
                    </td>
                    <td className="py-4 px-5 text-slate-200 bg-indigo-950/20 border-r border-slate-800/80 font-medium">
                      Polling DB Locks
                    </td>
                    <td className="py-4 px-5 text-blue-200 bg-blue-950/30 border-r border-slate-800/80 font-bold">
                      Native Async Event Loop
                    </td>
                    <td className="py-4 px-5 text-slate-300 bg-slate-900/30">Distributed Multi-process</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5 font-bold text-white bg-slate-950/50">Tính bền vững</td>
                    <td className="py-4 px-5 text-rose-300 bg-slate-900/30 border-l border-r border-slate-800/80">
                      Volatile (Mất khi crash)
                    </td>
                    <td className="py-4 px-5 text-emerald-300 bg-indigo-950/20 border-r border-slate-800/80 font-bold">
                      ACID Persistent
                    </td>
                    <td className="py-4 px-5 text-blue-200 bg-blue-950/30 border-r border-slate-800/80 font-semibold">
                      Redis Persistent
                    </td>
                    <td className="py-4 px-5 text-slate-300 bg-slate-900/30">RabbitMQ/Redis</td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5 font-bold text-white bg-slate-950/50">Tài nguyên (Bộ nhớ)</td>
                    <td className="py-4 px-5 text-emerald-300 bg-slate-900/30 border-l border-r border-slate-800/80">
                      Cực thấp (~12 MB)
                    </td>
                    <td className="py-4 px-5 text-slate-300 bg-indigo-950/20 border-r border-slate-800/80 font-medium">
                      Thấp (~45 MB)
                    </td>
                    <td className="py-4 px-5 text-blue-300 bg-blue-950/30 border-r border-slate-800/80 font-bold">
                      Rất tối ưu I/O (~28 MB)
                    </td>
                    <td className="py-4 px-5 text-rose-300 bg-slate-900/30 font-medium">
                      Nặng nề, Tốn RAM (~420 MB)
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5 font-bold text-white bg-slate-950/50">Ứng dụng Tối ưu (Best for)</td>
                    <td className="py-4 px-5 text-slate-400 bg-slate-900/30 border-l border-r border-slate-800/80 text-xs leading-relaxed">
                      Log nhẹ, fire-and-forget.
                    </td>
                    <td className="py-4 px-5 text-indigo-200 bg-indigo-950/20 border-r border-slate-800/80 text-xs leading-relaxed font-medium">
                      Task cần tính ACID nguyên tử cao cùng state DB.
                    </td>
                    <td className="py-4 px-5 text-blue-100 bg-blue-950/30 border-r border-slate-800/80 text-xs leading-relaxed font-semibold">
                      High-concurrency I/O, Webhooks, Emails.
                    </td>
                    <td className="py-4 px-5 text-slate-400 bg-slate-900/30 text-xs leading-relaxed">
                      CPU-heavy tasks, Multi-node workflows.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: TRỤ CỘT 4 - TOMBSTONE INVALIDATION */}
      {/* ========================================================================= */}
      {mainSection === 'tombstone' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  Trụ cột 4: Cache-aside & Tombstone Invalidation
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Mô hình tuần tự bảo vệ bộ nhớ đệm phân tán Redis trước nguy cơ Async Race Condition.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunTombstoneSimulation(true)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    withTombstone
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Có Tombstone Shield (Bảo Vệ)</span>
                </button>

                <button
                  onClick={() => handleRunTombstoneSimulation(false)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    !withTombstone
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-4 h-4 text-rose-300" />
                  <span>Không Dùng Tombstone (Lỗ Hổng)</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-slate-900 border-2 border-indigo-500/80 shadow-md space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold uppercase tracking-wide">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>Technical Rationale: Tại sao cần "Bia mộ" (Tombstone)?</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-sans">
                <strong>Ngăn chặn Race-condition trong môi trường bất đồng bộ.</strong> Khi một luồng đọc (chậm) lấy dữ liệu cũ từ DB và định ghi đè lên Redis sau khi luồng ghi đã cập nhật DB. <strong>Tombstone chặn các thao tác ghi dữ liệu cũ lên cache mới.</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: CHIẾN LƯỢC CHỈ MỤC JSONB */}
      {/* ========================================================================= */}
      {mainSection === 'indexes' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Chiến Lược Chỉ Mục JSONB & Anti-Pattern Detection
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tối ưu hóa dung lượng đĩa bằng GIN <code>jsonb_path_ops</code> và Expression B-Tree, tránh hoàn toàn lỗi quét toàn bảng Sequential Scan khi dùng sai toán tử <code>-&gt;&gt;</code>.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CHỐNG WRITE BOTTLENECKS */}
      {/* ========================================================================= */}
      {mainSection === 'locks' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Chống Deadlock Hàng Đợi Bằng FOR NO KEY UPDATE
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cho phép các tác vụ đọc và kiểm tra Foreign Key chạy song song 100% không bị block, triệt tiêu nguy cơ Deadlock khi nhiều worker cùng xử lý hàng đợi.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: TRÁNH THUẾ TOAST */}
      {/* ========================================================================= */}
      {mainSection === 'toast' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Tránh Thuế TOAST (Stored Generated Columns)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Trích xuất các trường hay lọc ra cột vật lý trong Main Tuple, loại bỏ 100% chi phí CPU giải nén tài liệu JSONB &gt;8KB.
            </p>
          </div>
        </div>
      )}

      {/* CODE GENERATOR (DOCKERFILE, GUNICORN CONF, DOCKER-COMPOSE, ARQ PYTHON, REDIS LUA, SQL DDL) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-0">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Mã Nguồn Cài Đặt Chuẩn Production
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveCodeTab('dockerfile')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'dockerfile'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dockerfile (Non-Root)
              </button>
              <button
                onClick={() => setActiveCodeTab('gunicorn_conf')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'gunicorn_conf'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                gunicorn.conf.py
              </button>
              <button
                onClick={() => setActiveCodeTab('docker_compose')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'docker_compose'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                docker-compose.yml
              </button>
              <button
                onClick={() => setActiveCodeTab('arq_python')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'arq_python'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ARQ (Python)
              </button>
              <button
                onClick={() => setActiveCodeTab('sql')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'sql'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SQL DDL
              </button>
            </div>

            <button
              onClick={() =>
                handleCopy(
                  activeCodeTab === 'dockerfile'
                    ? dockerfileCode
                    : activeCodeTab === 'gunicorn_conf'
                    ? gunicornConfCode
                    : activeCodeTab === 'docker_compose'
                    ? dockerComposeCode
                    : activeCodeTab === 'arq_python'
                    ? arqPythonCode
                    : activeCodeTab === 'redis_lua'
                    ? redisLuaScript
                    : sqlDDL,
                  'fullCode'
                )
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              {copiedType === 'fullCode' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedType === 'fullCode' ? 'Đã chép' : 'Sao chép mã nguồn'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto">
          <pre>
            {activeCodeTab === 'dockerfile'
              ? dockerfileCode
              : activeCodeTab === 'gunicorn_conf'
              ? gunicornConfCode
              : activeCodeTab === 'docker_compose'
              ? dockerComposeCode
              : activeCodeTab === 'arq_python'
              ? arqPythonCode
              : activeCodeTab === 'redis_lua'
              ? redisLuaScript
              : sqlDDL}
          </pre>
        </div>
      </div>
    </div>
  );
};
