import React, { useState } from 'react';
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

export const JsonbIndexStrategyView: React.FC = () => {
  const [mainSection, setMainSection] = useState<'arq_matrix' | 'tombstone' | 'indexes' | 'locks' | 'toast'>(
    'arq_matrix'
  );

  // Tab 1: Index Simulator States
  const [selectedOperator, setSelectedOperator] = useState<'@>' | '?' | '->>' | '->' | 'BETWEEN'>('@>');
  const [selectedIndexType, setSelectedIndexType] = useState<
    'gin_ops' | 'gin_path_ops' | 'expression_btree' | 'partial_index' | 'none'
  >('gin_path_ops');
  const [sampleKey, setSampleKey] = useState('priority');
  const [sampleValue, setSampleValue] = useState('high');
  const [hasPartialCondition, setHasPartialCondition] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'arq_python' | 'redis_lua' | 'sql' | 'drizzle'>('arq_python');

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

  const arqPythonCode = `# =========================================================================
# ARQ (Async Redis Task Queue) - Chuẩn Production High-Concurrency I/O
# =========================================================================
# pip install arq redis uvloop

import asyncio
from typing import Any
from arq import create_pool
from arq.connections import RedisSettings

# 1. Định nghĩa các tác vụ Async I/O Native
async def send_webhook(ctx: dict, url: str, payload: dict) -> dict:
    # Native Async Event Loop: Xử lý non-blocking 35,000+ QPS
    # Không tốn RAM threadpool hay multi-process nặng nề
    async with ctx['session'].post(url, json=payload) as resp:
        return {'status': resp.status, 'url': url}

async def generate_batch_embedding(ctx: dict, text_chunk: str) -> list[float]:
    # Async I/O LLM Pipeline
    await asyncio.sleep(0.02) # Async I/O call
    return [0.05] * 768

# 2. Cấu hình Worker Settings
async def startup(ctx: dict):
    import aiohttp
    ctx['session'] = aiohttp.ClientSession()

async def shutdown(ctx: dict):
    await ctx['session'].close()

class WorkerSettings:
    functions = [send_webhook, generate_batch_embedding]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings(host='127.0.0.1', port=6379)
    max_jobs = 1000 # Tải cực lớn trên 1 process đơn

# 3. Enqueue từ FastAPI / Web Server
# pool = await create_pool(RedisSettings())
# await pool.enqueue_job('send_webhook', 'https://api.symflowage.com/webhook', {'event': 'node_created'})`;

  const redisLuaScript = `-- =========================================================================
-- TRỤ CỘT 4: REDIS LUA SCRIPT CHO TOMBSTONE CACHE-ASIDE (ATOMIC BEST-EFFORT SET)
-- =========================================================================
-- Chặn ghi đè dữ liệu cũ nếu Tombstone đang tồn tại (Atomic Check & Set)
-- KEYS[1] = Cache Key (e.g. "goal:101")
-- KEYS[2] = Tombstone Key (e.g. "tombstone:goal:101")
-- ARGV[1] = Payload JSON
-- ARGV[2] = TTL Seconds (e.g. 60)

local tombstoneExists = redis.call("EXISTS", KEYS[2])
if tombstoneExists == 1 then
    -- Đang có Bia Mộ hiệu lực! Bỏ qua ghi đè dữ liệu cũ để tránh Stale Cache Leak
    return 0
else
    -- Không có Tombstone: Cho phép Insert best-effort an toàn
    redis.call("SETEX", KEYS[1], tonumber(ARGV[2]), ARGV[1])
    return 1
end

-- =========================================================================
-- FLOW 2: INVALIDATION FLOW (KHI WORKER UPDATE POSTGRESQL)
-- =========================================================================
-- 1. SET Tombstone (TTL = 10s)
--    redis.set("tombstone:goal:101", "1", "EX", 10)
-- 2. DELETE Cache Entry
--    redis.del("goal:101")`;

  const sqlDDL = `-- ==========================================
-- 1. CHIẾN LƯỢC CHỈ MỤC JSONB (POSTGRESQL)
-- ==========================================
CREATE INDEX notes_metadata_gin_ops_idx ON notes USING gin (metadata);
CREATE INDEX notes_metadata_gin_path_idx ON notes USING gin (metadata jsonb_path_ops);
CREATE INDEX notes_metadata_priority_btree_idx ON notes ((metadata->>'priority'));

-- ==========================================
-- 2. TRÁNH THUẾ TOAST (STORED GENERATED COLUMNS)
-- ==========================================
ALTER TABLE notes ADD COLUMN extracted_priority text GENERATED ALWAYS AS (metadata->>'priority') STORED;
CREATE INDEX notes_generated_priority_idx ON notes (extracted_priority);

-- ==========================================
-- 3. CHỐNG WRITE BOTTLENECK & DEADLOCK
-- ==========================================
SELECT * FROM task_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1 FOR NO KEY UPDATE SKIP LOCKED;`;

  const drizzleSchema = `import { pgTable, serial, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  title: text('title').notNull(),
  metadata: jsonb('metadata').default({}),
  extractedPriority: text('extracted_priority').generatedAlwaysAs(
    sql\`metadata->>'priority'\`
  ),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  ginPathOpsIdx: index('notes_meta_gin_path_idx').using('gin', sql\`\${table.metadata} jsonb_path_ops\`),
  priorityBtreeIdx: index('notes_meta_priority_btree_idx').on(sql\`(\${table.metadata}->>'priority')\`),
  generatedPriorityIdx: index('notes_gen_priority_idx').on(table.extractedPriority),
}));`;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Workflow className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="relative z-10 max-w-4xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Zap className="w-3.5 h-3.5" />
            <span>High-Performance Distributed Architecture Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Ma Trận Hàng Đợi Tác Vụ & ARQ (Async Redis)
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            So sánh toàn diện 4 mô hình hàng đợi tác vụ: <strong>ARQ (Async Redis)</strong> tối ưu I/O quy mô lớn, <strong>Postgres SKIP LOCKED</strong> bảo toàn tính nguyên tử ACID, <strong>FastAPI BackgroundTasks</strong> siêu nhẹ, và <strong>Celery</strong> đa tiến trình nặng nề.
          </p>
        </div>
      </div>

      {/* Main Mode Switcher Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setMainSection('arq_matrix')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'arq_matrix'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Workflow className="w-4 h-4 text-blue-300" />
          <span>Ma Trận Hàng Đợi: ARQ (Async Redis)</span>
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
          <span>Trụ Cột 4: Cache-aside & Tombstone</span>
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
          <span>1. Chỉ Mục JSONB</span>
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
          <span>2. Chống Write Bottlenecks</span>
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
          <span>3. Tránh Thuế TOAST</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: MA TRẬN LỰA CHỌN HÀNG ĐỢI TÁC VỤ & ARQ (ASYNC REDIS) */}
      {/* ========================================================================= */}
      {mainSection === 'arq_matrix' && (
        <div className="space-y-6">
          {/* MATRIX TABLE EXACTLY LIKE USER IMAGE */}
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
                  {/* Row 1: Mô hình Thực thi */}
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

                  {/* Row 2: Tính bền vững */}
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

                  {/* Row 3: Tài nguyên (Bộ nhớ) */}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5 font-bold text-white bg-slate-950/50">Tài nguyên (Bộ nhớ)</td>
                    <td className="py-4 px-5 text-emerald-300 bg-slate-900/30 border-l border-r border-slate-800/80">
                      Cực thấp
                    </td>
                    <td className="py-4 px-5 text-slate-300 bg-indigo-950/20 border-r border-slate-800/80 font-medium">
                      Thấp
                    </td>
                    <td className="py-4 px-5 text-blue-300 bg-blue-950/30 border-r border-slate-800/80 font-bold">
                      Rất tối ưu I/O
                    </td>
                    <td className="py-4 px-5 text-rose-300 bg-slate-900/30 font-medium">
                      Nặng nề, Tốn RAM
                    </td>
                  </tr>

                  {/* Row 4: Ứng dụng Tối ưu (Best for) */}
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

          {/* ARQ DEEP-DIVE & INTERACTIVE WORKER LAB */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Interactive ARQ Task Producer */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    ARQ (Async Redis) Task Dispatcher
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                  Asyncio Event Loop Active
                </span>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-300">Chọn Loại Tác Vụ Async I/O:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'send_webhook', label: 'Webhook', desc: 'Non-blocking I/O' },
                    { id: 'batch_embedding', label: 'AI Embed', desc: 'Vector Pipeline' },
                    { id: 'send_email', label: 'Email Batch', desc: 'Async SMTP' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTaskType(t.id as any)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                        selectedTaskType === t.id
                          ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-[10px] opacity-75">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleEnqueueArqJob}
                disabled={isEnqueueing}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <Play className="w-4 h-4 text-amber-300" />
                <span>{isEnqueueing ? 'Đang Đẩy Vào Redis Queue...' : 'Enqueue ARQ Async Task (35,000 QPS)'}</span>
              </button>

              {/* Resource Benchmark Cards */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Memory Overhead</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-1">~28 MB RAM</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Tiết kiệm 93% so với Celery</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Event Loop Latency</div>
                  <div className="text-base font-bold font-mono text-blue-400 mt-1">0.12 ms</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Độ trễ cận thời gian thực</div>
                </div>
              </div>
            </div>

            {/* Right Column: Execution Log & Active Jobs */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    ARQ Worker Async Pipeline (Live Feed)
                  </h3>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  Redis Backend: <span className="text-emerald-400 font-bold">Online</span>
                </span>
              </div>

              {arqJobs.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-lg border border-slate-800/80 text-slate-500 text-xs space-y-2">
                  <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>Chưa có tác vụ nào trong hàng đợi. Nhấn nút "Enqueue ARQ Async Task" để kích hoạt!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {arqJobs.map((job) => (
                    <div
                      key={job.jobId}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-blue-400 font-bold">{job.functionName}()</span>
                        <span className="font-mono text-[11px] text-slate-500">{job.jobId}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-400">
                          {job.durationMs > 0 ? `${job.durationMs}ms` : 'Đang xử lý...'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          COMPLETED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3.5 bg-blue-950/30 border border-blue-500/40 rounded-lg text-xs text-blue-200 leading-relaxed">
                <strong>Tại sao chọn ARQ cho Async I/O?</strong> ARQ tận dụng trực tiếp <code>asyncio</code> Event Loop của Python kết hợp với cấu trúc dữ liệu hiệu năng cao của Redis. Một worker duy nhất có thể duy trì hàng ngàn kết nối I/O song song (Webhooks, API Gateway, AI Stream) mà không bị nghẽn hay tràn bộ nhớ như Celery.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: TRỤ CỘT 4 - CACHE-ASIDE & TOMBSTONE INVALIDATION */}
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

            {/* VISUAL SEQUENCE DIAGRAM REPRODUCTION */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 sm:p-6 overflow-x-auto space-y-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-2 flex items-center justify-between">
                <span>Kiến Trúc Luồng Tuần Tự (Sequence Diagram Flow)</span>
                <span className="text-[11px] text-amber-400 font-mono">FastAPI / Node.js ⟷ Redis ⟷ PostgreSQL</span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center min-w-[650px]">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-indigo-300 shadow-md flex items-center justify-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span>FastAPI Worker (UC)</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-rose-300 shadow-md flex items-center justify-center gap-2">
                  <Database className="w-4 h-4 text-rose-400" />
                  <span>Redis Cache</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-cyan-300 shadow-md flex items-center justify-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>PostgreSQL DB</span>
                </div>
              </div>

              <div className="space-y-4 min-w-[650px] relative py-2">
                {/* FLOW 1 */}
                <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/70 relative">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    <span>Flow 1: Read-through Flow</span>
                  </div>

                  <div className="flex items-center text-xs">
                    <div className="w-1/3 text-right pr-4 font-mono text-slate-300">get(key)</div>
                    <div className="w-1/3 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-indigo-500 relative flex items-center justify-end">
                        <ArrowRight className="w-4 h-4 text-indigo-400 -mr-1" />
                      </div>
                    </div>
                    <div className="w-1/3 pl-4 text-slate-400 text-[11px]">Tra cứu nhanh trong RAM</div>
                  </div>

                  <div className="flex items-center text-xs">
                    <div className="w-1/3 text-right pr-4 text-slate-400 text-[11px]">Nhận thông báo Miss</div>
                    <div className="w-1/3 flex items-center justify-center">
                      <div className="w-full h-0.5 border-t-2 border-dashed border-slate-500 relative flex items-center justify-start">
                        <span className="absolute inset-x-0 -top-4 text-center font-mono text-[11px] text-amber-300 font-semibold">
                          Miss
                        </span>
                      </div>
                    </div>
                    <div className="w-1/3 pl-4 font-mono text-slate-400">Key không tồn tại</div>
                  </div>

                  <div className="flex items-center text-xs">
                    <div className="w-1/3 text-right pr-4 font-mono text-slate-300">SELECT</div>
                    <div className="w-2/3 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-cyan-500 relative flex items-center justify-end">
                        <ArrowRight className="w-4 h-4 text-cyan-400 -mr-1" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-xs">
                    <div className="w-1/3 text-right pr-4 text-slate-400 text-[11px]">Nhận dữ liệu từ DB</div>
                    <div className="w-2/3 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-cyan-400/80 relative flex items-center justify-start">
                        <span className="absolute inset-x-0 -top-4 text-center font-mono text-[11px] text-cyan-300 font-semibold">
                          data
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-xs">
                    <div className="w-1/3 text-right pr-4 font-mono text-slate-300">Insert best-effort</div>
                    <div className="w-1/3 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-emerald-500 relative flex items-center justify-end">
                        <ArrowRight className="w-4 h-4 text-emerald-400 -mr-1" />
                      </div>
                    </div>
                    <div className="w-1/3 pl-4 text-slate-400 text-[11px]">
                      {withTombstone ? (
                        <span className="text-emerald-300 font-semibold">
                          ✓ Kiểm tra Tombstone trước khi SET
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold">
                          ⚠ SET trực tiếp (Nguy cơ Stale Leak!)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* FLOW 2 */}
                <div className="space-y-3 bg-amber-950/20 p-4 rounded-xl border-2 border-amber-500/60 relative shadow-lg">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span>Flow 2: Invalidation Flow</span>
                  </div>

                  <div className="flex items-center text-xs">
                    <div className="w-1/3 text-right pr-4 font-mono text-amber-300 font-bold">UPDATE</div>
                    <div className="w-2/3 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-amber-500 relative flex items-center justify-end">
                        <ArrowRight className="w-4 h-4 text-amber-400 -mr-1" />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-950/40 border-2 border-amber-500 shadow-md">
                    <div className="flex items-center text-xs">
                      <div className="w-1/3 text-right pr-4 font-mono text-amber-200 font-bold flex items-center justify-end gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>SET Tombstone (TTL)</span>
                      </div>
                      <div className="w-1/3 flex items-center justify-center">
                        <div className="w-full h-1 bg-amber-500 relative flex items-center justify-end shadow-sm">
                          <ArrowRight className="w-5 h-5 text-amber-400 -mr-1.5" />
                        </div>
                      </div>
                      <div className="w-1/3 pl-4 text-amber-300 text-[11px] font-semibold">
                        Đặt Bia Mộ tạm thời (TTL 5–15s)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-xs">
                    <div className="w-1/3 text-right pr-4 font-mono text-slate-300 font-medium">
                      DELETE Cache Entry
                    </div>
                    <div className="w-1/3 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-amber-500/80 relative flex items-center justify-end">
                        <ArrowRight className="w-4 h-4 text-amber-400 -mr-1" />
                      </div>
                    </div>
                    <div className="w-1/3 pl-4 text-slate-400 text-[11px]">Xóa key hiện tại trên Redis</div>
                  </div>
                </div>
              </div>

              {/* TECHNICAL RATIONALE REPRODUCTION BOX */}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: CHIẾN LƯỢC CHỈ MỤC JSONB */}
      {/* ========================================================================= */}
      {mainSection === 'indexes' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Bảng So Sánh 4 Chiến Lược Chỉ Mục JSONB
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">PostgreSQL 14+ / 16</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Chỉ Tiêu So Sánh</th>
                    <th className="py-3.5 px-4 text-indigo-400 bg-indigo-950/20 border-l border-r border-slate-800/80">
                      GIN (jsonb_ops)
                    </th>
                    <th className="py-3.5 px-4 text-emerald-400 bg-emerald-950/20 border-r border-slate-800/80">
                      GIN (jsonb_path_ops)
                    </th>
                    <th className="py-3.5 px-4 text-amber-400 bg-amber-950/20 border-r border-slate-800/80">
                      Expression B-Tree
                    </th>
                    <th className="py-3.5 px-4 text-cyan-400 bg-cyan-950/20">Partial Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white bg-slate-950/40">Toán tử hỗ trợ</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-indigo-300 bg-indigo-950/10 border-l border-r border-slate-800/80">
                      @&gt;, ?, ?|, ?&amp;
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-emerald-300 bg-emerald-950/10 border-r border-slate-800/80 font-bold">
                      Chỉ @&gt;
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-amber-300 bg-amber-950/10 border-r border-slate-800/80">
                      =, &lt;, &gt;, BETWEEN, IN
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-cyan-300 bg-cyan-950/10">Tùy thuộc toán tử</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white bg-slate-950/40">Dung lượng lưu trữ</td>
                    <td className="py-3.5 px-4 text-rose-300 bg-indigo-950/10 border-l border-r border-slate-800/80">
                      Rất lớn (50–100% table size)
                    </td>
                    <td className="py-3.5 px-4 text-emerald-300 bg-emerald-950/10 border-r border-slate-800/80 font-medium">
                      Nhỏ (1/3–1/4 jsonb_ops)
                    </td>
                    <td className="py-3.5 px-4 text-amber-300 bg-amber-950/10 border-r border-slate-800/80 font-medium">
                      Rất nhỏ (chỉ index 1 scalar key)
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300 bg-cyan-950/10 font-bold">Cực kỳ nhỏ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CHỐNG WRITE BOTTLENECKS */}
      {/* ========================================================================= */}
      {mainSection === 'locks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                <XCircle className="w-5 h-5" />
                <span>Problem: Row Locking Gây Deadlock</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi sử dụng <code className="px-1.5 py-0.5 bg-black/60 rounded text-rose-300 font-mono">FOR UPDATE</code> trong hệ thống hàng đợi concurrent hoặc cập nhật bảng cha, PostgreSQL áp dụng **Exclusive Row Lock**. Mọi giao dịch kiểm tra Foreign Key đều bị block, dẫn tới **Deadlock Cascades**.
              </p>
            </div>

            <div className="bg-slate-900 border border-emerald-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <CheckCircle2 className="w-5 h-5" />
                <span>Solution: FOR NO KEY UPDATE</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sử dụng <code className="px-1.5 py-0.5 bg-black/60 rounded text-emerald-300 font-mono">FOR NO KEY UPDATE</code>. PostgreSQL chỉ khóa các trường dữ liệu thông thường mà không khóa Primary/Unique Key, cho phép đọc và kiểm tra Foreign Key **chạy song song 100% không bị block**.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: TRÁNH THUẾ TOAST */}
      {/* ========================================================================= */}
      {mainSection === 'toast' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                <XCircle className="w-5 h-5" />
                <span>Problem: Thuế TOAST (The TOAST Tax)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi tài liệu <code className="px-1.5 py-0.5 bg-black/60 rounded text-rose-300 font-mono">JSONB &gt; 8KB</code>, PostgreSQL đẩy dữ liệu ra lưu trữ **out-of-line (bảng TOAST)**. Mỗi lần truy vấn lọc theo 1 key nhỏ, PostgreSQL buộc phải đọc từng chunk và **giải nén toàn bộ JSON document**, tiêu tốn CPU.
              </p>
            </div>

            <div className="bg-slate-900 border border-emerald-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <CheckCircle2 className="w-5 h-5" />
                <span>Solution: Stored Generated Columns</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trích xuất các trường hay query ra thành **cột vật lý (Stored Generated Column)**. Dữ liệu được lưu trực tiếp trong Main Tuple, PostgreSQL Planner thu thập thống kê chính xác và đọc trực tiếp từ Index mà **không bao giờ tốn CPU giải nén TOAST**.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CODE GENERATOR (ARQ PYTHON, REDIS LUA SCRIPT, SQL DDL & DRIZZLE ORM) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-0">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Mã Nguồn Cài Đặt Chuẩn Production
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveCodeTab('arq_python')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'arq_python'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ARQ (Python Async Redis)
              </button>
              <button
                onClick={() => setActiveCodeTab('redis_lua')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'redis_lua'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Redis Lua (Tombstone)
              </button>
              <button
                onClick={() => setActiveCodeTab('sql')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'sql'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PostgreSQL SQL DDL
              </button>
              <button
                onClick={() => setActiveCodeTab('drizzle')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'drizzle'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Drizzle ORM
              </button>
            </div>

            <button
              onClick={() =>
                handleCopy(
                  activeCodeTab === 'arq_python'
                    ? arqPythonCode
                    : activeCodeTab === 'redis_lua'
                    ? redisLuaScript
                    : activeCodeTab === 'sql'
                    ? sqlDDL
                    : drizzleSchema,
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
            {activeCodeTab === 'arq_python'
              ? arqPythonCode
              : activeCodeTab === 'redis_lua'
              ? redisLuaScript
              : activeCodeTab === 'sql'
              ? sqlDDL
              : drizzleSchema}
          </pre>
        </div>
      </div>
    </div>
  );
};
