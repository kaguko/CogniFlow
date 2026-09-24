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
} from 'lucide-react';
import { analyzeJsonbQueryPlan } from '../utils/jsonbAnalyzer';

export const JsonbIndexStrategyView: React.FC = () => {
  const [selectedOperator, setSelectedOperator] = useState<'@>' | '?' | '->>' | '->' | 'BETWEEN'>('@>');
  const [selectedIndexType, setSelectedIndexType] = useState<
    'gin_ops' | 'gin_path_ops' | 'expression_btree' | 'partial_index' | 'none'
  >('gin_path_ops');
  const [sampleKey, setSampleKey] = useState('priority');
  const [sampleValue, setSampleValue] = useState('high');
  const [hasPartialCondition, setHasPartialCondition] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'sql' | 'drizzle'>('sql');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const analysis = analyzeJsonbQueryPlan(
    selectedOperator,
    selectedIndexType,
    hasPartialCondition,
    sampleKey,
    sampleValue
  );

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const sqlDDL = `-- 1. GIN (jsonb_ops): Hỗ trợ @>, ?, ?|, ?&
CREATE INDEX notes_metadata_gin_ops_idx ON notes USING gin (metadata);

-- 2. GIN (jsonb_path_ops): Chỉ hỗ trợ @> (Tiết kiệm 70% dung lượng)
CREATE INDEX notes_metadata_gin_path_idx ON notes USING gin (metadata jsonb_path_ops);

-- 3. Expression B-Tree: Tối ưu cho toán tử ->> trên key cố định (=, <, >, BETWEEN, IN)
CREATE INDEX notes_metadata_priority_btree_idx ON notes ((metadata->>'priority'));

-- 4. Partial Index: Siêu nhẹ, chỉ index các bản ghi thỏa mãn điều kiện tĩnh
CREATE INDEX notes_active_metadata_partial_idx ON notes USING gin (metadata jsonb_path_ops) 
WHERE is_active = true;`;

  const drizzleSchema = `import { pgTable, serial, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  title: text('title').notNull(),
  metadata: jsonb('metadata').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  // 1. GIN (jsonb_ops)
  ginOpsIdx: index('notes_meta_gin_ops_idx').using('gin', table.metadata),

  // 2. GIN (jsonb_path_ops)
  ginPathOpsIdx: index('notes_meta_gin_path_idx').using('gin', sql\`\${table.metadata} jsonb_path_ops\`),

  // 3. Expression B-Tree
  priorityBtreeIdx: index('notes_meta_priority_btree_idx').on(sql\`(\${table.metadata}->>'priority')\`),

  // 4. Partial Index
  activeNotesGinIdx: index('notes_active_meta_idx')
    .using('gin', sql\`\${table.metadata} jsonb_path_ops\`)
    .where(sql\`\${table.isActive} = true\`),
}));`;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Database className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Database className="w-3.5 h-3.5" />
            <span>PostgreSQL Performance Lab & Index Optimization</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Chiến Lược Lập Chỉ Mục JSONB trong PostgreSQL
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            So sánh toàn diện 4 chiến lược index JSONB (`jsonb_ops`, `jsonb_path_ops`, Expression B-Tree, Partial Index), phân tích chi phí bộ nhớ đệm, thời gian thực thi và bộ nhận diện Anti-Pattern Sequential Scan.
          </p>
        </div>
      </div>

      {/* CORE MATRIX TABLE */}
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

      {/* ANTI-PATTERN WARNING BOX */}
      <div className="p-4 sm:p-5 rounded-xl bg-amber-950/30 border-2 border-amber-600/80 shadow-lg flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/40">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
            <span>ANTI-PATTERN CẢNH BÁO:</span>
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

      {/* INTERACTIVE QUERY BENCHMARK & ANTI-PATTERN DETECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Cấu Hình Thử Nghiệm Truy Vấn
            </h3>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Tình huống thực tế (Presets):</label>
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

          {/* Index Type Selection */}
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

          {/* Operator Selection */}
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

          {/* Key / Value Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400">JSON Key:</label>
              <input
                type="text"
                value={sampleKey}
                onChange={(e) => setSampleKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400">Giá trị so sánh:</label>
              <input
                type="text"
                value={sampleValue}
                onChange={(e) => setSampleValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1"
              />
            </div>
          </div>
        </div>

        {/* Real-time EXPLAIN & Benchmark Output */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Mô Phỏng EXPLAIN ANALYZE & Tối Ưu Hóa
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
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

            {/* Generated Query Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Câu Lệnh SQL Sinh Ra:</span>
                <button
                  onClick={() => handleCopy(analysis.querySql, 'query')}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 text-[11px]"
                >
                  {copiedType === 'query' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedType === 'query' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto">
                {analysis.querySql}
              </div>
            </div>

            {/* Anti Pattern Banner */}
            {analysis.isAntiPattern && (
              <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/60 text-xs text-rose-200 space-y-1 animate-fade-in">
                <div className="font-bold flex items-center gap-1.5 text-rose-400">
                  <AlertTriangle className="w-4 h-4" /> Bẫy Hiệu Năng Phổ Biến!
                </div>
                <p className="leading-relaxed">{analysis.antiPatternWarning}</p>
              </div>
            )}

            {/* Performance Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Scan Method
                </div>
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
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Execution Time
                </div>
                <div
                  className={`text-xs font-bold font-mono mt-1 ${
                    analysis.estimatedCost.executionTimeMs > 10 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {analysis.estimatedCost.executionTimeMs} ms
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Buffer Reads
                </div>
                <div className="text-xs font-bold font-mono text-slate-200 mt-1">
                  {analysis.estimatedCost.bufferReads} blocks
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Index Storage
                </div>
                <div className="text-[11px] font-semibold text-slate-300 mt-1 truncate" title={analysis.estimatedCost.storageOverheadRelative}>
                  {analysis.estimatedCost.storageOverheadRelative.split('(')[0]}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Khuyến Nghị Tối Ưu Hóa:
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {analysis.recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CODE GENERATOR (SQL DDL & DRIZZLE ORM) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Mã Nguồn Cài Đặt (SQL DDL & Drizzle ORM)
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
