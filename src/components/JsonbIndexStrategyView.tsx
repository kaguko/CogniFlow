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
} from 'lucide-react';
import { analyzeJsonbQueryPlan } from '../utils/jsonbAnalyzer';
import {
  simulateLockContention,
  simulateToastTax,
} from '../utils/postgresPerformanceEngine';

export const JsonbIndexStrategyView: React.FC = () => {
  const [mainSection, setMainSection] = useState<'indexes' | 'locks' | 'toast'>('indexes');

  // Tab 1: Index Simulator States
  const [selectedOperator, setSelectedOperator] = useState<'@>' | '?' | '->>' | '->' | 'BETWEEN'>('@>');
  const [selectedIndexType, setSelectedIndexType] = useState<
    'gin_ops' | 'gin_path_ops' | 'expression_btree' | 'partial_index' | 'none'
  >('gin_path_ops');
  const [sampleKey, setSampleKey] = useState('priority');
  const [sampleValue, setSampleValue] = useState('high');
  const [hasPartialCondition, setHasPartialCondition] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'sql' | 'drizzle'>('sql');

  // Tab 2: Lock Contention States
  const [lockMode, setLockMode] = useState<'FOR UPDATE' | 'FOR NO KEY UPDATE'>('FOR NO KEY UPDATE');
  const [workersCount, setWorkersCount] = useState<number>(25);

  // Tab 3: TOAST Tax States
  const [toastApproach, setToastApproach] = useState<'Raw JSONB Fetch (>8KB)' | 'Stored Generated Column'>(
    'Stored Generated Column'
  );
  const [docSizeKb, setDocSizeKb] = useState<number>(32);

  const [copiedType, setCopiedType] = useState<string | null>(null);

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

  const sqlDDL = `-- ==========================================
-- 1. CHIẾN LƯỢC CHỈ MỤC JSONB (POSTGRESQL)
-- ==========================================
-- GIN (jsonb_ops): Hỗ trợ @>, ?, ?|, ?&
CREATE INDEX notes_metadata_gin_ops_idx ON notes USING gin (metadata);

-- GIN (jsonb_path_ops): Chỉ hỗ trợ @> (Tiết kiệm 70% dung lượng)
CREATE INDEX notes_metadata_gin_path_idx ON notes USING gin (metadata jsonb_path_ops);

-- Expression B-Tree: Tối ưu cho toán tử ->> trên key cố định (=, <, >, BETWEEN, IN)
CREATE INDEX notes_metadata_priority_btree_idx ON notes ((metadata->>'priority'));

-- Partial Index: Siêu nhẹ cho bản ghi active
CREATE INDEX notes_active_metadata_partial_idx ON notes USING gin (metadata jsonb_path_ops) 
WHERE is_active = true;

-- ==========================================
-- 2. TRÁNH THUẾ TOAST (STORED GENERATED COLUMNS)
-- ==========================================
ALTER TABLE notes 
ADD COLUMN extracted_priority text 
GENERATED ALWAYS AS (metadata->>'priority') STORED;

CREATE INDEX notes_generated_priority_idx ON notes (extracted_priority);

-- ==========================================
-- 3. CHỐNG WRITE BOTTLENECK & DEADLOCK TRONG TASK QUEUE
-- ==========================================
-- Dùng FOR NO KEY UPDATE SKIP LOCKED để đọc/ghi song song không block Foreign Keys
SELECT * FROM task_queue 
WHERE status = 'pending' 
ORDER BY id ASC 
LIMIT 1 
FOR NO KEY UPDATE SKIP LOCKED;`;

  const drizzleSchema = `import { pgTable, serial, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  title: text('title').notNull(),
  metadata: jsonb('metadata').default({}),
  
  // Tránh Thuế TOAST: Trích xuất trường hay query ra cột vật lý
  extractedPriority: text('extracted_priority').generatedAlwaysAs(
    sql\`metadata->>'priority'\`
  ),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  // GIN (jsonb_path_ops)
  ginPathOpsIdx: index('notes_meta_gin_path_idx').using('gin', sql\`\${table.metadata} jsonb_path_ops\`),

  // Expression B-Tree
  priorityBtreeIdx: index('notes_meta_priority_btree_idx').on(sql\`(\${table.metadata}->>'priority')\`),

  // Partial Index
  activeNotesGinIdx: index('notes_active_meta_idx')
    .using('gin', sql\`\${table.metadata} jsonb_path_ops\`)
    .where(sql\`\${table.isActive} = true\`),
    
  // B-Tree trên Generated Column
  generatedPriorityIdx: index('notes_gen_priority_idx').on(table.extractedPriority),
}));

// Hàng đợi chịu tải cao (Hỗ trợ FOR NO KEY UPDATE)
export const taskQueue = pgTable('task_queue', {
  id: serial('id').primaryKey(),
  noteId: serial('note_id').references(() => notes.id),
  taskPayload: jsonb('task_payload').default({}),
  status: text('status').notNull().default('pending'),
  workerId: text('worker_id'),
  lockedAt: timestamp('locked_at'),
  createdAt: timestamp('created_at').defaultNow(),
});`;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Database className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Zap className="w-3.5 h-3.5" />
            <span>PostgreSQL High-Performance Architecture Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Khắc Phục Thắt Cổ Chai Hiệu Năng PostgreSQL
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Bộ giải pháp kiến trúc giải quyết triệt để 3 vấn đề hiệu năng lớn nhất trong PostgreSQL: Lập chỉ mục JSONB tối ưu, Chống Write Bottlenecks / Lock Contention bằng `FOR NO KEY UPDATE`, và Triệt tiêu Thuế TOAST (The TOAST Tax) bằng Stored Generated Columns.
          </p>
        </div>
      </div>

      {/* Main Mode Switcher Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setMainSection('indexes')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'indexes'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>1. Chiến Lược Chỉ Mục JSONB</span>
        </button>

        <button
          onClick={() => setMainSection('locks')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'locks'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>2. Chống Write Bottlenecks & Lock Contention</span>
        </button>

        <button
          onClick={() => setMainSection('toast')}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            mainSection === 'toast'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Minimize2 className="w-4 h-4" />
          <span>3. Tránh Thuế TOAST (The TOAST Tax)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CHIẾN LƯỢC CHỈ MỤC JSONB */}
      {/* ========================================================================= */}
      {mainSection === 'indexes' && (
        <div className="space-y-6">
          {/* Matrix Table */}
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
                    <td className="py-3.5 px-4 font-semibold text-white bg-slate-950/40">
                      Toán tử hỗ trợ
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-indigo-300 bg-indigo-950/10 border-l border-r border-slate-800/80">
                      @&gt;, ?, ?|, ?&amp;
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-emerald-300 bg-emerald-950/10 border-r border-slate-800/80 font-bold">
                      Chỉ @&gt;
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-amber-300 bg-amber-950/10 border-r border-slate-800/80">
                      =, &lt;, &gt;, BETWEEN, IN
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-cyan-300 bg-cyan-950/10">
                      Tùy thuộc toán tử
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white bg-slate-950/40">
                      Dung lượng lưu trữ
                    </td>
                    <td className="py-3.5 px-4 text-rose-300 bg-indigo-950/10 border-l border-r border-slate-800/80">
                      Rất lớn (50–100% table size)
                    </td>
                    <td className="py-3.5 px-4 text-emerald-300 bg-emerald-950/10 border-r border-slate-800/80 font-medium">
                      Nhỏ (1/3–1/4 jsonb_ops)
                    </td>
                    <td className="py-3.5 px-4 text-amber-300 bg-amber-950/10 border-r border-slate-800/80 font-medium">
                      Rất nhỏ (chỉ index 1 scalar key)
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300 bg-cyan-950/10 font-bold">
                      Cực kỳ nhỏ
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white bg-slate-950/40">
                      Chi phí cập nhật (Overhead)
                    </td>
                    <td className="py-3.5 px-4 text-rose-400 bg-indigo-950/10 border-l border-r border-slate-800/80">
                      Rất cao
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 bg-emerald-950/10 border-r border-slate-800/80">
                      Trung bình
                    </td>
                    <td className="py-3.5 px-4 text-amber-300 bg-amber-950/10 border-r border-slate-800/80">
                      Thấp
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300 bg-cyan-950/10 font-medium">
                      Rất thấp
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white bg-slate-950/40">
                      Use-case Tối ưu
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 bg-indigo-950/10 border-l border-r border-slate-800/80 leading-relaxed text-xs">
                      Khi không biết trước schema hoặc cần tìm key tồn tại (`?`).
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 bg-emerald-950/10 border-r border-slate-800/80 leading-relaxed text-xs">
                      Truy vấn bao hàm document-level hiệu năng cao (`@&gt;`).
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 bg-amber-950/10 border-r border-slate-800/80 leading-relaxed text-xs">
                      Truy vấn bằng toán tử `-&gt;&gt;` trên các key cố định (priority, status).
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 bg-cyan-950/10 leading-relaxed text-xs">
                      Lọc các document thỏa mãn điều kiện tĩnh (VD: `WHERE is_active = true`).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Anti-Pattern Warning */}
          <div className="p-4 sm:p-5 rounded-xl bg-amber-950/30 border-2 border-amber-600/80 shadow-lg flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                ANTI-PATTERN CẢNH BÁO:
              </h3>
              <p className="text-sm text-amber-100 font-medium leading-relaxed">
                Đừng bao giờ tạo <span className="underline font-bold text-white">GIN index</span> rồi dùng toán tử{' '}
                <code className="px-1.5 py-0.5 bg-black/60 rounded text-amber-300 font-mono text-xs border border-amber-500/30">
                  -&gt;&gt;
                </code>{' '}
                để truy vấn. PostgreSQL sẽ <span className="text-rose-400 font-bold">bỏ qua Index</span> và thực hiện{' '}
                <span className="text-rose-400 font-bold uppercase">Sequential Scan (Full Table Scan)</span> làm nghẽn toàn bộ cơ sở dữ liệu!
              </p>
            </div>
          </div>

          {/* Simulator & EXPLAIN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Cấu Hình Thử Nghiệm
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Tình huống thực tế:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedIndexType('gin_path_ops');
                      setSelectedOperator('@>');
                      setHasPartialCondition(false);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedIndexType === 'gin_path_ops' && selectedOperator === '@>'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" /> GIN Path Ops
                    </div>
                    <div className="text-[10px] text-slate-500">Toán tử @&gt; chuẩn</div>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedIndexType('gin_path_ops');
                      setSelectedOperator('->>');
                      setHasPartialCondition(false);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      (selectedIndexType === 'gin_path_ops' || selectedIndexType === 'gin_ops') &&
                      selectedOperator === '->>'
                        ? 'bg-rose-950/70 border-rose-500 text-rose-200 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-400" /> Anti-Pattern!
                    </div>
                    <div className="text-[10px] text-slate-500">GIN index + -&gt;&gt;</div>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedIndexType('expression_btree');
                      setSelectedOperator('->>');
                      setHasPartialCondition(false);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedIndexType === 'expression_btree'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" /> Expression B-Tree
                    </div>
                    <div className="text-[10px] text-slate-500">Toán tử -&gt;&gt; cực nhanh</div>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedIndexType('partial_index');
                      setSelectedOperator('@>');
                      setHasPartialCondition(true);
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedIndexType === 'partial_index'
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Partial Index
                    </div>
                    <div className="text-[10px] text-slate-500">Lọc is_active = true</div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Loại Index Được Khởi Tạo:</label>
                <select
                  value={selectedIndexType}
                  onChange={(e) => setSelectedIndexType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="gin_path_ops">GIN (jsonb_path_ops) - Khuyên dùng cho @&gt;</option>
                  <option value="gin_ops">GIN (jsonb_ops) - Hỗ trợ đa toán tử</option>
                  <option value="expression_btree">Expression B-Tree ((metadata-&gt;&gt;'priority'))</option>
                  <option value="partial_index">Partial Index (WHERE is_active = true)</option>
                  <option value="none">Không có Index (No Index)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Toán Tử Truy Vấn Trong SQL:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['@>', '->>', '?', 'BETWEEN'] as const).map((op) => (
                    <button
                      key={op}
                      onClick={() => setSelectedOperator(op)}
                      className={`py-2 px-2 text-center rounded-lg border font-mono text-xs transition-all ${
                        selectedOperator === op
                          ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Mô Phỏng EXPLAIN ANALYZE
                  </h3>
                </div>
                <div>
                  {analysis.isAntiPattern ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      <XCircle className="w-3.5 h-3.5" /> Anti-Pattern Phát Hiện
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Index Hợp Lệ
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto">
                {analysis.querySql}
              </div>

              {analysis.isAntiPattern && (
                <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/60 text-xs text-rose-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-4 h-4" /> Bẫy Hiệu Năng Phổ Biến!
                  </div>
                  <p className="leading-relaxed">{analysis.antiPatternWarning}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Scan Method</div>
                  <div
                    className={`text-xs font-bold mt-1 truncate ${
                      analysis.estimatedCost.indexScanType.includes('Sequential')
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {analysis.estimatedCost.indexScanType}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Execution Time</div>
                  <div
                    className={`text-xs font-bold font-mono mt-1 ${
                      analysis.estimatedCost.executionTimeMs > 10 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {analysis.estimatedCost.executionTimeMs} ms
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Buffer Reads</div>
                  <div className="text-xs font-bold font-mono text-slate-200 mt-1">
                    {analysis.estimatedCost.bufferReads} blocks
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Index Storage</div>
                  <div className="text-[11px] font-semibold text-slate-300 mt-1 truncate">
                    {analysis.estimatedCost.storageOverheadRelative.split('(')[0]}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Khuyến Nghị Tối Ưu:
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{analysis.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CHỐNG WRITE BOTTLENECKS & LOCK CONTENTION */}
      {/* ========================================================================= */}
      {mainSection === 'locks' && (
        <div className="space-y-6">
          {/* Visual Architecture Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Problem Box */}
            <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                <XCircle className="w-5 h-5" />
                <span>Problem: Row Locking Gây Deadlock</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi sử dụng <code className="px-1.5 py-0.5 bg-black/60 rounded text-rose-300 font-mono">FOR UPDATE</code> trong hệ thống hàng đợi concurrent hoặc cập nhật bảng cha, PostgreSQL áp dụng **Exclusive Row Lock**. Mọi giao dịch kiểm tra Foreign Key hoặc update bảng con đều bị block, dẫn tới **Deadlock Cascades**.
              </p>
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-200 font-mono">
                SELECT * FROM task_queue WHERE status = 'pending' LIMIT 1 FOR UPDATE; -- ⚠️ Blocking FK & Deadlock
              </div>
            </div>

            {/* Solution Box */}
            <div className="bg-slate-900 border border-emerald-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <CheckCircle2 className="w-5 h-5" />
                <span>Solution: FOR NO KEY UPDATE</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sử dụng <code className="px-1.5 py-0.5 bg-black/60 rounded text-emerald-300 font-mono">FOR NO KEY UPDATE</code>. PostgreSQL chỉ khóa các trường dữ liệu thông thường mà không khóa Primary/Unique Key, cho phép đọc và kiểm tra Foreign Key **chạy song song 100% không bị block**.
              </p>
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200 font-mono">
                SELECT * FROM task_queue WHERE status = 'pending' LIMIT 1 FOR NO KEY UPDATE SKIP LOCKED; -- ✅ Zero Lock Wait
              </div>
            </div>
          </div>

          {/* Interactive Concurrent Throughput Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Mô Phỏng Tải Concurrent Queue & Đo Lường Lock Contention
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thử nghiệm thay đổi số lượng Worker song song để xem nguy cơ Deadlock và Throughput (QPS).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLockMode('FOR UPDATE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    lockMode === 'FOR UPDATE'
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'bg-slate-950 border border-slate-800 text-slate-400'
                  }`}
                >
                  FOR UPDATE (Nguy hiểm)
                </button>
                <button
                  onClick={() => setLockMode('FOR NO KEY UPDATE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    lockMode === 'FOR NO KEY UPDATE'
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-slate-950 border border-slate-800 text-slate-400'
                  }`}
                >
                  FOR NO KEY UPDATE (Chuẩn)
                </button>
              </div>
            </div>

            {/* Sliders & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Số lượng Worker song song:</span>
                    <span className="font-mono font-bold text-indigo-400">{workersCount} Workers</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={workersCount}
                    onChange={(e) => setWorkersCount(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-400">Trực quan hóa luồng dữ liệu:</div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-indigo-300 font-semibold">Đọc (Read / FK Check)</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="text-emerald-300 font-semibold font-mono">
                      {lockMode === 'FOR NO KEY UPDATE' ? 'Song song 100% (No Lock)' : 'Bị Chặn (Blocked)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-amber-300 font-semibold">Ghi (Write / Update Task)</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="text-emerald-300 font-semibold font-mono">
                      {lockMode === 'FOR NO KEY UPDATE' ? 'Xử lý tuần tự cực êm' : 'Tranh chấp khóa cao'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benchmark Results */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Throughput QPS</div>
                    <div
                      className={`text-lg font-bold font-mono mt-1 ${
                        lockBenchmark.throughputQps > 5000 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {lockBenchmark.throughputQps.toLocaleString()} QPS
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Avg Lock Wait Time</div>
                    <div
                      className={`text-lg font-bold font-mono mt-1 ${
                        lockBenchmark.avgLockWaitTimeMs < 1 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {lockBenchmark.avgLockWaitTimeMs.toFixed(2)} ms
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Deadlock Risk</div>
                    <div
                      className={`text-xs font-bold mt-1.5 ${
                        lockBenchmark.deadlockRisk.includes('Zero') ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {lockBenchmark.deadlockRisk.split('(')[0]}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <p>{lockBenchmark.explanation}</p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto">
                  <pre>{lockBenchmark.sqlSnippet}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: TRÁNH THUẾ TOAST (THE TOAST TAX) */}
      {/* ========================================================================= */}
      {mainSection === 'toast' && (
        <div className="space-y-6">
          {/* Visual Architecture Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                <XCircle className="w-5 h-5" />
                <span>Problem: Thuế TOAST (The TOAST Tax)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi tài liệu <code className="px-1.5 py-0.5 bg-black/60 rounded text-rose-300 font-mono">JSONB &gt; 8KB</code>, PostgreSQL đẩy dữ liệu ra lưu trữ **out-of-line (bảng TOAST)**. Mỗi lần truy vấn lọc theo 1 key nhỏ, PostgreSQL buộc phải đọc từng chunk và **giải nén toàn bộ 8KB–32KB JSON document**, tiêu tốn lượng lớn CPU.
              </p>
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-200 font-mono">
                SELECT * FROM notes WHERE metadata-&gt;&gt;'priority' = 'high'; -- ⚠️ Phải decompress TOAST chunk!
              </div>
            </div>

            <div className="bg-slate-900 border border-emerald-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <CheckCircle2 className="w-5 h-5" />
                <span>Solution: Stored Generated Columns</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trích xuất các trường hay query ra thành **cột vật lý (Stored Generated Column)**. Dữ liệu được lưu trực tiếp trong Main Tuple, PostgreSQL Planner thu thập thống kê Histogram chính xác và đọc trực tiếp từ Index mà **không bao giờ chạm vào TOAST hay tốn CPU giải nén**.
              </p>
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200 font-mono">
                ALTER TABLE notes ADD COLUMN extracted_priority text GENERATED ALWAYS AS (metadata-&gt;&gt;'priority') STORED;
              </div>
            </div>
          </div>

          {/* Interactive Benchmark Calculator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Minimize2 className="w-5 h-5 text-indigo-400" />
                  Đo Lường Tiết Kiệm CPU & Độ Trễ TOAST Decompression
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Đối chiếu giữa việc quét JSONB thô &gt;8KB so với cột trích xuất Stored Generated Column.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setToastApproach('Raw JSONB Fetch (>8KB)')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    toastApproach === 'Raw JSONB Fetch (>8KB)'
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'bg-slate-950 border border-slate-800 text-slate-400'
                  }`}
                >
                  Raw JSONB (Chịu Thuế TOAST)
                </button>
                <button
                  onClick={() => setToastApproach('Stored Generated Column')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    toastApproach === 'Stored Generated Column'
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-slate-950 border border-slate-800 text-slate-400'
                  }`}
                >
                  Stored Generated Column (Tối Ưu)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Kích thước tài liệu JSONB:</span>
                    <span className="font-mono font-bold text-indigo-400">{docSizeKb} KB / document</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="128"
                    step="8"
                    value={docSizeKb}
                    onChange={(e) => setDocSizeKb(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <div className="font-semibold text-slate-300">Cơ chế lưu trữ vật lý:</div>
                  <div className="text-slate-400 leading-relaxed">
                    {toastApproach === 'Stored Generated Column' ? (
                      <span className="text-emerald-300 font-medium">
                        ✓ Lưu trong Main Tuple. B-Tree Index trỏ thẳng vào scalar string mà không đọc trường JSONB khổng lồ.
                      </span>
                    ) : (
                      <span className="text-rose-300 font-medium">
                        ⚠ Dữ liệu nén trong pg_toast_*. PostgreSQL phải giải nén toàn bộ document mỗi khi kiểm tra filter predicate!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Output */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Decompress CPU Time</div>
                    <div
                      className={`text-lg font-bold font-mono mt-1 ${
                        toastBenchmark.toastDecompressionCpuMs < 0.1 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {toastBenchmark.toastDecompressionCpuMs.toFixed(2)} ms
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Query Latency</div>
                    <div
                      className={`text-lg font-bold font-mono mt-1 ${
                        toastBenchmark.queryExecutionTimeMs < 1 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {toastBenchmark.queryExecutionTimeMs.toFixed(2)} ms
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Memory Buffer Reads</div>
                    <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                      {toastBenchmark.memoryBufferReads} blocks
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <p>{toastBenchmark.explanation}</p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto">
                  <pre>{toastBenchmark.sqlSnippet}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CODE GENERATOR (SQL DDL & DRIZZLE ORM) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Mã Nguồn Cài Đặt Hoàn Chỉnh (SQL DDL & Drizzle ORM)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-xs">
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
                Drizzle ORM (TypeScript)
              </button>
            </div>

            <button
              onClick={() => handleCopy(activeCodeTab === 'sql' ? sqlDDL : drizzleSchema, 'fullCode')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              {copiedType === 'fullCode' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedType === 'fullCode' ? 'Đã chép' : 'Sao chép tất cả'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto">
          <pre>{activeCodeTab === 'sql' ? sqlDDL : drizzleSchema}</pre>
        </div>
      </div>
    </div>
  );
};
