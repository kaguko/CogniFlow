import React, { useState } from 'react';
import { useAgentSwarm } from '../hooks/useAgentSwarm';
import { M2M_INTEGRATION_SNIPPETS } from '../valueObjects/m2m';
import { AgentNode, AgentRole } from '../entities/agent';

export function AgentSwarmDashboard() {
  const {
    swarmState,
    apiKeys,
    isRunningSimulation,
    runSwarmCycle,
    triggerCircuitBreaker,
    resetCircuitBreaker,
    generateApiKey,
  } = useAgentSwarm();

  const [activeSubTab, setActiveSubTab] = useState<'mesh' | 'guardrails' | 'logs' | 'memory' | 'm2m_api'>('mesh');
  const [swarmGoalInput, setSwarmGoalInput] = useState(swarmState.objective);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedSnippetIdx, setSelectedSnippetIdx] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    generateApiKey(newKeyName);
    setNewKeyName('');
  };

  const getStatusBadge = (status: AgentNode['status']) => {
    switch (status) {
      case 'executing':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Đang Thực Thi</span>;
      case 'thinking':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Đang Suy Luận</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Hoàn Tất Vi Bước</span>;
      case 'guardrail_blocked':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Bị Ngắt Mạch</span>;
      case 'drift_alert':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Cảnh Báo Drift</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Sẵn Sàng (Idle)</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: SymFlowAge Multi-Agent Swarm Orchestrator & M2M Hub */}
      <div className="relative overflow-hidden rounded-xl border border-indigo-900/60 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-semibold tracking-wide uppercase">
                M2M Multi-Agent Orchestrator & Guardrails
              </span>
              <span className="text-slate-500 text-xs font-mono">•</span>
              <span className="text-emerald-400 text-xs font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Mesh Active (4 Nodes)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              SymFlowAge — Tầng Điều Phối & Rào Chắn Tác Tử AI
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Biến SymFlowAge thành hệ điều hành cho các AI Agent độc lập (CrewAI, LangGraph, AutoGen, Devin). Tự động phân rã vi bước 5-15 phút, tính toán <span className="text-indigo-300 font-semibold">Drift Score & Hallucination Guardrail</span> theo thời gian thực và cung cấp <span className="text-indigo-300 font-semibold">Socratic Decision Matrix</span> để AI không bị lạc đề.
            </p>
          </div>

          {/* Circuit Breaker & Health Stats */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-4 rounded-lg border border-slate-800">
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Drift Score TB</div>
              <div className={`text-xl font-bold font-mono ${swarmState.averageDriftScore > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {swarmState.averageDriftScore}%
              </div>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Độ Khỏe Swarm</div>
              <div className="text-xl font-bold font-mono text-indigo-400">
                {swarmState.overallHealthScore}%
              </div>
            </div>

            {/* Circuit Breaker Action Button */}
            <div>
              {swarmState.circuitBreaker.isTriggered ? (
                <button
                  onClick={resetCircuitBreaker}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Tái Khởi Động Mạch An Toàn
                </button>
              ) : (
                <button
                  onClick={() => triggerCircuitBreaker('Human Operator Manual Halt: Nghi ngờ trôi dạt kiến trúc')}
                  className="px-3 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Ngắt Mạch Khẩn Cấp (Circuit Break)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Warning if Circuit Breaker Triggered */}
        {swarmState.circuitBreaker.isTriggered && (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-950/70 border border-rose-600 text-rose-200 text-xs flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-base">🚨</span>
              <span><strong>MẠCH AN TOÀN ĐANG ĐÓNG:</strong> {swarmState.circuitBreaker.lastHaltedReason || 'Toàn bộ Agent đã tạm dừng để bảo vệ an toàn hệ thống.'}</span>
            </div>
            <span className="font-mono text-[11px] text-rose-300">Ngắt lúc: {swarmState.circuitBreaker.haltedAt}</span>
          </div>
        )}
      </div>

      {/* Interactive Goal Dispatcher */}
      <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/80 shadow-md">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          🎯 Nạp Yêu Cầu Sản Phẩm Cho Đội Quân Tác Tử (Dispatch Objective to Swarm)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={swarmGoalInput}
            onChange={(e) => setSwarmGoalInput(e.target.value)}
            placeholder="Ví dụ: Xây dựng Module OAuth Google và phân rã vi bước xác thực bảo mật..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => runSwarmCycle(swarmGoalInput)}
            disabled={isRunningSimulation || swarmState.circuitBreaker.isTriggered}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isRunningSimulation ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Swarm Đang Điều Phối...
              </>
            ) : (
              <>
                <span>🚀</span> Kích Hoạt Đội Quân AI (Run Cycle)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('mesh')}
          className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSubTab === 'mesh'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>🕸️</span> Swarm Mesh (4 Nodes)
        </button>
        <button
          onClick={() => setActiveSubTab('guardrails')}
          className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSubTab === 'guardrails'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>🛡️</span> Rào Chắn Drift & Hallucination
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSubTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>📜</span> Event Log Thời Gian Thực
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
            {swarmState.executionLogs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('memory')}
          className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSubTab === 'memory'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>🧠</span> Agentic Memory (Vector RAG)
        </button>
        <button
          onClick={() => setActiveSubTab('m2m_api')}
          className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSubTab === 'm2m_api'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>🔑</span> M2M Gateway & SDK Snippets
        </button>
      </div>

      {/* SUB-TAB 1: Swarm Mesh Visualization */}
      {activeSubTab === 'mesh' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {swarmState.agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-5 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                  agent.status === 'executing'
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/50 shadow-lg'
                    : agent.status === 'guardrail_blocked'
                    ? 'border-rose-600 bg-rose-950/20'
                    : 'border-slate-800 bg-slate-900/90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{agent.avatar}</span>
                    {getStatusBadge(agent.status)}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{agent.name}</h3>
                    <p className="text-xs text-indigo-300 font-medium line-clamp-1">{agent.roleTitle}</p>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                    "{agent.systemPromptSnippet}"
                  </p>

                  {agent.currentTaskTitle && (
                    <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/50">
                      <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold mb-1">Tác Vụ Hiện Tại:</div>
                      <div className="text-xs text-slate-200 font-medium">{agent.currentTaskTitle}</div>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Drift Score:</span>
                    <span className={`font-mono font-bold ${agent.activeDriftScore > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {agent.activeDriftScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${agent.activeDriftScore > 40 ? 'bg-rose-500' : agent.activeDriftScore > 20 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, agent.activeDriftScore)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span>⚡ {agent.latencyMs}ms</span>
                    <span>🪙 {agent.tokensProcessed.toLocaleString()} tok</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Workflow Sequence Representation */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span>🔄</span> Chu Trình Vòng Lặp Multi-Agent Tự Động (Self-Correcting Loop)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-bold text-indigo-400 mb-1">1. Phân Rã (Decompose)</div>
                <div className="text-slate-300">PM Agent gọi <code>POST /api/v1/agent/decompose</code> bẻ nhỏ mục tiêu thành vi bước 5-15 phút.</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-bold text-indigo-400 mb-1">2. Thực Thi (Execute)</div>
                <div className="text-slate-300">Coder Agent chỉ triển khai đúng 1 vi bước tại một thời điểm, xuất code artifact.</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-bold text-indigo-400 mb-1">3. Quét Rào Chắn (Guardrail)</div>
                <div className="text-slate-300">Socratic Guardrail đo Drift Score. Nếu &gt; 40% tự động ngắt mạch (Circuit Breaker).</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-bold text-indigo-400 mb-1">4. Thẩm Định & Ghi Nhớ</div>
                <div className="text-slate-300">QA Agent chạy boundary test, đồng bộ tri thức vào Vector Memory qua pgvector.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Guardrails & Drift Telemetry */}
      {activeSubTab === 'guardrails' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🛡️</span> Rào Chắn Chống Ảo Giác & Trôi Dạt Mục Tiêu (Anti-Hallucination Guardrail)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khi AI Agent tự động code liên tục hàng giờ, xác suất trôi dạt mục tiêu (Goal Drift) và over-engineering tăng theo hàm mũ. Rào chắn SymFlowAge thiết lập các phép kiểm tra ranh giới nghiêm ngặt:
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Ranh Giới Vi Bước 15 Phút (Time-Box Constraint)</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Không cho phép Agent chạy prompt đơn lẻ vượt quá phạm vi vi bước 15 phút. Ép buộc phân rã trước khi code.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Circuit Breaker Tự Động khi Drift &gt; 40%</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Nếu đầu ra của Agent xuất hiện các thư viện lạ hoặc làm sai bài toán gốc, hệ thống lập tức ngắt mạch, bảo vệ ngân sách token và codebase.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Socratic Inquiry Challenge</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Ép Agent trả lời 3 câu hỏi đánh đổi (Trade-offs) trước khi được phép thêm package hay thay đổi kiến trúc DB.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Threshold Settings */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
              <h3 className="text-base font-bold text-white">⚙️ Cấu Hình Rào Chắn M2M</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Ngưỡng Ngắt Mạch (Drift Threshold)</span>
                    <span className="font-mono text-indigo-400 font-bold">40%</span>
                  </div>
                  <input type="range" min="20" max="80" value="40" readOnly className="w-full accent-indigo-500" />
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Tự Động Reset Context:</span>
                    <span className="text-emerald-400 font-semibold font-mono">BẬT (ON)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Yêu Cầu Human Approval:</span>
                    <span className="text-indigo-400 font-semibold font-mono">KHI DRIFT &gt; 50%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Bộ Nhớ Vector RAG:</span>
                    <span className="text-emerald-400 font-semibold font-mono">pgvector Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Real-Time Event Logs */}
      {activeSubTab === 'logs' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs space-y-2 max-h-[500px] overflow-y-auto">
          <div className="text-slate-500 text-[11px] pb-2 border-b border-slate-800 flex justify-between">
            <span>LIVE SWARM TELEMETRY STREAM</span>
            <span>AUTO-SYNC ENABLED</span>
          </div>
          {swarmState.executionLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded border flex items-start gap-3 transition-colors ${
                log.status === 'critical'
                  ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                  : log.status === 'warning'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                  : log.status === 'success'
                  ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300'
              }`}
            >
              <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 font-bold shrink-0">
                {log.sourceAgentName}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold shrink-0">
                {log.actionType}
              </span>
              <span className="flex-1 font-sans text-xs">{log.payloadSummary}</span>
              {log.driftScore !== undefined && (
                <span className="text-indigo-400 font-mono shrink-0">
                  drift={log.driftScore}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 4: Agentic Memory (Vector RAG) */}
      {activeSubTab === 'memory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">🧠 Trí Nhớ Chung Của Bầy Tác Tử (Agentic Vector Memory)</h3>
              <p className="text-xs text-slate-400">Lưu trữ các mẫu kiến trúc đã kiểm chứng và bài học thất bại để tránh lặp lại sai lầm.</p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded-md border border-indigo-800">
              {swarmState.memoryEntries.length} Tri Thức Đã Vector Hóa
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {swarmState.memoryEntries.map((mem) => (
              <div key={mem.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">{mem.category}</span>
                    <span className="text-slate-500">{mem.timestamp}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{mem.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                    {mem.content}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
                  {mem.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: M2M Gateway & SDK Snippets */}
      {activeSubTab === 'm2m_api' && (
        <div className="space-y-6">
          {/* API Key Management */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">🔑 Quản Lý Khóa API Tác Tử (Machine-to-Machine API Keys)</h3>
                <p className="text-xs text-slate-400">Dành cho các framework như CrewAI, LangGraph, AutoGen hoặc script Python tự trị.</p>
              </div>

              <form onSubmit={handleCreateKey} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tên Client / Agent Swarm..."
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap"
                >
                  + Tạo Khóa M2M
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">Tên Ứng Dụng / Swarm</th>
                    <th className="pb-2 font-medium">Khóa (Prefix)</th>
                    <th className="pb-2 font-medium">Tạo Ngày</th>
                    <th className="pb-2 font-medium">Hoạt Động Cuối</th>
                    <th className="pb-2 font-medium">Số Requests</th>
                    <th className="pb-2 font-medium">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="text-slate-300">
                      <td className="py-2.5 font-sans font-medium text-white">{key.name}</td>
                      <td className="py-2.5 text-indigo-400 font-bold">{key.keyPrefix}••••••••</td>
                      <td className="py-2.5 text-slate-500">{key.createdAt}</td>
                      <td className="py-2.5 text-slate-400">{key.lastUsedAt}</td>
                      <td className="py-2.5 text-slate-300">{key.totalRequests.toLocaleString()}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                          Hoạt Động
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Code Integration Snippets (CrewAI, LangGraph, Python, cURL) */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">💻 Tích Hợp SDK & API Snippets Cho AI Agents</h3>
                <p className="text-xs text-slate-400">Sao chép mã nguồn mẫu để tích hợp trực tiếp vào Agent framework của bạn.</p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {M2M_INTEGRATION_SNIPPETS.map((snippet, idx) => (
                  <button
                    key={snippet.title}
                    onClick={() => setSelectedSnippetIdx(idx)}
                    className={`px-3 py-1 rounded text-xs font-medium uppercase transition-colors ${
                      selectedSnippetIdx === idx
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {snippet.framework}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
                <span className="font-mono text-slate-300">{M2M_INTEGRATION_SNIPPETS[selectedSnippetIdx].title}</span>
                <button
                  onClick={() => handleCopyCode(M2M_INTEGRATION_SNIPPETS[selectedSnippetIdx].code, selectedSnippetIdx)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors flex items-center gap-1"
                >
                  {copiedIdx === selectedSnippetIdx ? '✓ Đã Copy!' : '📋 Sao Chép'}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                <code>{M2M_INTEGRATION_SNIPPETS[selectedSnippetIdx].code}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
