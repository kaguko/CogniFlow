import React, { useState } from 'react';
import { AgentNode, AgentTask } from '../entities/agent';
import { Target, Milestone, Zap, Clock, ShieldCheck, ChevronRight, CheckCircle2, AlertTriangle, Crosshair, ArrowRight, Sparkles } from 'lucide-react';

export interface VisualTaskTreeMapProps {
  goalTitle: string;
  agents: AgentNode[];
  activeTasks: AgentTask[];
  onSelectNode?: (nodeId: string) => void;
}

interface TreeNode {
  id: string;
  layer: 'macro' | 'meso' | 'micro' | 'nano';
  title: string;
  subtitle?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  agentRole?: 'orchestrator_pm' | 'coder_executor' | 'socratic_guardrail' | 'qa_security';
  agentName?: string;
  agentAvatar?: string;
  estimatedMinutes?: number;
  elapsedMinutes?: number;
  principle?: string;
  singleAction?: string;
  testCriterion?: string;
  unblockTip?: string;
  children?: TreeNode[];
}

export function VisualTaskTreeMap({
  goalTitle,
  agents,
  activeTasks,
  onSelectNode,
}: VisualTaskTreeMapProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('nano_current');
  const [zoomFilter, setZoomFilter] = useState<'all' | 'macro' | 'meso' | 'micro'>('all');

  // Identify active executing agent
  const activeAgent = agents.find((a) => a.status === 'executing' || a.status === 'thinking') || agents[1];

  // Synthesize 3-Layer Hierarchical Node Map
  const treeData: TreeNode = {
    id: 'macro_goal',
    layer: 'macro',
    title: goalTitle || 'Xây dựng Module Xác thực JWT Phân quyền & Redis Token Blacklist',
    subtitle: 'Mục Tiêu Cốt Lõi Hệ Thống (Core Goal Canvas)',
    status: 'in_progress',
    agentRole: 'orchestrator_pm',
    agentName: 'PM Orchestrator Agent',
    agentAvatar: '🎯',
    principle: 'Clean Architecture & Minimal Surface',
    children: [
      {
        id: 'meso_milestone_1',
        layer: 'meso',
        title: 'Cột mốc 1: Phân Rã & Hợp Đồng (Contract & Interface)',
        subtitle: 'Thời gian: 0 - 15 phút · Trạng thái: Hoàn tất kiểm định',
        status: 'completed',
        agentRole: 'orchestrator_pm',
        agentName: 'PM Orchestrator',
        agentAvatar: '🎯',
        principle: 'Divide & Conquer',
        children: [
          {
            id: 'micro_step_1_1',
            layer: 'micro',
            title: 'Khai báo Pure Domain Entity TokenBlacklist',
            subtitle: '5 phút · Không phụ thuộc Redis trong entity',
            status: 'completed',
            agentRole: 'coder_executor',
            agentName: 'Coder Executor',
            agentAvatar: '⚡',
            principle: 'Boundary Isolation',
            singleAction: 'Tạo interface BlacklistEntry { tokenHash, expiresAt }',
            testCriterion: 'Typecheck passes không có import từ express/redis',
          },
          {
            id: 'micro_step_1_2',
            layer: 'micro',
            title: 'Viết Contract Interface BlacklistRepository',
            subtitle: '8 phút · Cổng Adapter trừu tượng hóa',
            status: 'completed',
            agentRole: 'coder_executor',
            agentName: 'Coder Executor',
            agentAvatar: '⚡',
            principle: 'Dependency Inversion',
            singleAction: 'Định nghĩa hasRevoked(tokenHash) và revoke(tokenHash, ttl)',
            testCriterion: 'Unit test mock repository chạy qua trong < 100ms',
          },
        ],
      },
      {
        id: 'meso_milestone_2',
        layer: 'meso',
        title: 'Cột mốc 2: Triển Khai Xử Lý Thuần (Core Implementation)',
        subtitle: 'Thời gian: 15 - 35 phút · Đang diễn ra trực tiếp',
        status: 'in_progress',
        agentRole: 'coder_executor',
        agentName: 'Coder Executor',
        agentAvatar: '⚡',
        principle: 'Atomic Commit & Fail Fast',
        children: [
          {
            id: 'micro_step_2_1',
            layer: 'micro',
            title: 'Viết hàm verifyRevocation() kiểm tra TTL Token',
            subtitle: 'Vi bước 10 phút · Đang thực thi tích cực',
            status: 'in_progress',
            agentRole: 'coder_executor',
            agentName: 'Coder Executor Agent',
            agentAvatar: '⚡',
            estimatedMinutes: 10,
            elapsedMinutes: 7,
            principle: 'Fail-Fast Assertion',
            singleAction: 'So sánh currentTimestamp với expiresAt, trả về boolean dứt khoát',
            testCriterion: 'Pass cả 2 test case: Token còn hạn và Token đã hết hạn',
            unblockTip: 'Dùng Date.now() truyền vào tham số thay vì gọi Date.now() bên trong để dễ test',
            children: [
              {
                id: 'nano_current',
                layer: 'nano',
                title: '⚡ Nano-Step: Viết assertion kiểm tra tokenHash rỗng',
                subtitle: 'Nano-step 2 phút Agent đang gõ code trực tiếp',
                status: 'in_progress',
                agentRole: 'coder_executor',
                agentName: 'Coder Executor',
                agentAvatar: '⚡',
                estimatedMinutes: 2,
                elapsedMinutes: 1.5,
                principle: 'Zero Cognitive Load Execution',
                singleAction: 'if (!tokenHash || tokenHash.trim() === "") return false;',
                testCriterion: 'Assert return false khi tokenHash === ""',
              },
              {
                id: 'nano_next',
                layer: 'nano',
                title: 'Nano-Step: Assert HTTP 401 khi token nằm trong danh sách đen',
                subtitle: 'Nano-step 2 phút tiếp theo',
                status: 'pending',
                agentRole: 'coder_executor',
                agentName: 'Coder Executor',
                agentAvatar: '⚡',
                estimatedMinutes: 2,
                principle: 'TDD Loop',
              },
            ],
          },
        ],
      },
      {
        id: 'meso_milestone_3',
        layer: 'meso',
        title: 'Cột mốc 3: Rào Chắn Socratic & Thẩm Định QA',
        subtitle: 'Thời gian: 35 - 50 phút · Giám sát song song',
        status: 'pending',
        agentRole: 'socratic_guardrail',
        agentName: 'Socratic Guardrail Agent',
        agentAvatar: '🛡️',
        principle: 'Zero Drift & Continuous Verification',
        children: [
          {
            id: 'micro_step_3_1',
            layer: 'micro',
            title: 'Quét Drift Score qua Semantic Goal Matching',
            subtitle: '5 phút · Cắt mạch nếu Drift > 40%',
            status: 'pending',
            agentRole: 'socratic_guardrail',
            agentName: 'Socratic Guardrail',
            agentAvatar: '🛡️',
            principle: 'Circuit Breaker Guard',
          },
          {
            id: 'micro_step_3_2',
            layer: 'micro',
            title: 'Chạy Boundary Security Test & Sync RAG Memory',
            subtitle: '10 phút · Ghi nhớ vào Vector Store',
            status: 'pending',
            agentRole: 'qa_security',
            agentName: 'QA Security Verifier',
            agentAvatar: '🧪',
            principle: 'Feedback Loop Learning',
          },
        ],
      },
    ],
  };

  // Find currently selected node
  const findNode = (node: TreeNode, targetId: string): TreeNode | null => {
    if (node.id === targetId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = findNode(treeData, selectedNodeId) || treeData;

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNodeId(node.id);
    if (onSelectNode) onSelectNode(node.id);
  };

  const handleFocusActiveAgent = () => {
    setSelectedNodeId('nano_current');
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Coordinate Tracker
            </span>
            <span className="text-slate-500 text-xs font-mono">·</span>
            <span className="text-slate-400 text-xs">Bản đồ Cây Tọa độ 3 Tầng Nhận Thức</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">
            Định Vị Tức Thời Điểm Thực Thi Của Agent Swarm
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick filter pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setZoomFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                zoomFilter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Toàn Bộ Cây
            </button>
            <button
              onClick={() => setZoomFilter('meso')}
              className={`px-2.5 py-1 rounded transition-colors ${
                zoomFilter === 'meso' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cột Mốc (Meso)
            </button>
            <button
              onClick={() => setZoomFilter('micro')}
              className={`px-2.5 py-1 rounded transition-colors ${
                zoomFilter === 'micro' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vi Bước (Micro)
            </button>
          </div>

          {/* Jump to Active Agent Button */}
          <button
            onClick={handleFocusActiveAgent}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all flex items-center gap-1.5"
            title="Định vị ngay nút Agent đang trực tiếp chạy"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Tâm Điểm Agent</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Tree Diagram + Node Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Visual Tree Diagram (8 cols) */}
        <div className="lg:col-span-8 bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-6 overflow-x-auto">
          {/* Level 1: Macro Layer (Core Goal Canvas) */}
          {(zoomFilter === 'all' || zoomFilter === 'macro') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5" />
                  Tầng 1 (Macro) — Mục Tiêu Cốt Lõi (Core Goal Canvas)
                </span>
                <span>Zoom Level 1.0x</span>
              </div>

              <div
                onClick={() => handleNodeClick(treeData)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedNodeId === treeData.id
                    ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/40 shadow-lg'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{treeData.agentAvatar}</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">{treeData.title}</h4>
                    </div>
                    <p className="text-xs text-slate-300">{treeData.subtitle}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium font-mono">
                      Khế Ước Đã Khóa
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">3 Cột Mốc · 6 Vi Bước</span>
                  </div>
                </div>
              </div>

              {/* Connecting vertical line to Meso */}
              <div className="flex justify-center py-1">
                <div className="w-0.5 h-4 bg-indigo-500/40"></div>
              </div>
            </div>
          )}

          {/* Level 2: Meso Layer (Strategic Milestones) */}
          {(zoomFilter === 'all' || zoomFilter === 'meso') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider">
                  <Milestone className="w-3.5 h-3.5" />
                  Tầng 2 (Meso) — Cột Mốc Chiến Lược (Strategic Milestones)
                </span>
                <span>3 Giai Đoạn Logic</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {treeData.children?.map((milestone, idx) => (
                  <div
                    key={milestone.id}
                    onClick={() => handleNodeClick(milestone)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                      selectedNodeId === milestone.id
                        ? 'border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/40'
                        : milestone.status === 'in_progress'
                        ? 'border-indigo-500/60 bg-indigo-950/30'
                        : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    {milestone.status === 'in_progress' && (
                      <span className="absolute -top-2 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                      </span>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-base">{milestone.agentAvatar}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            milestone.status === 'completed'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : milestone.status === 'in_progress'
                              ? 'text-indigo-400 bg-indigo-500/10 font-bold animate-pulse'
                              : 'text-slate-500 bg-slate-800'
                          }`}
                        >
                          {milestone.status === 'completed'
                            ? 'Xong'
                            : milestone.status === 'in_progress'
                            ? 'Đang Chạy'
                            : 'Chờ'}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-100 line-clamp-2">{milestone.title}</h5>
                      <p className="text-[11px] text-slate-400">{milestone.subtitle}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                      <span className="font-mono text-indigo-300">{milestone.principle}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Connecting vertical line to Micro */}
              <div className="flex justify-center py-1">
                <div className="w-0.5 h-4 bg-emerald-500/40"></div>
              </div>
            </div>
          )}

          {/* Level 3: Micro Layer & Active Nano-Step (Active Execution Horizon) */}
          {(zoomFilter === 'all' || zoomFilter === 'micro') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5" />
                  Tầng 3 (Micro & Nano) — Vi Bước 5–15 Phút ➔ Nano-Step 2 Phút Đang Thực Thi
                </span>
                <span className="text-emerald-400 font-bold animate-pulse">● Live Agent Execution</span>
              </div>

              {/* Focus Box: Current Executing Node with Radar Halo Glow */}
              <div className="p-4 rounded-xl border border-emerald-500/60 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 relative shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-900/40">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl animate-bounce">⚡</span>
                    <div>
                      <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <span>Vị Trí Đích Thực Hiện Tại Của Agent</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                          Node Map Highlight
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        Vi Bước: Viết hàm verifyRevocation() kiểm tra TTL Token (10 phút)
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">Tiến độ:</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      7 / 10 phút (70%)
                    </span>
                  </div>
                </div>

                {/* Sub-Branch: Nano-Steps (Zero Cognitive Load) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Nano Step 1 (Active) */}
                  <div
                    onClick={() => setSelectedNodeId('nano_current')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all relative ${
                      selectedNodeId === 'nano_current'
                        ? 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-500/50 shadow-md'
                        : 'border-emerald-800/60 bg-emerald-950/20'
                    }`}
                  >
                    <span className="absolute -top-1.5 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>

                    <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300 mb-1">
                      <span className="font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        Đang Gõ Code (2 phút)
                      </span>
                      <span>Coder Agent</span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      Assert kiểm tra tokenHash rỗng hoặc null
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono mt-1 bg-slate-950/70 p-1.5 rounded border border-slate-800">
                      if (!tokenHash) return false;
                    </div>
                  </div>

                  {/* Nano Step 2 (Pending) */}
                  <div
                    onClick={() => setSelectedNodeId('nano_next')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedNodeId === 'nano_next'
                        ? 'border-indigo-400 bg-indigo-950/40 ring-2 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Kế Tiếp (2 phút)
                      </span>
                      <span>Chờ Thực Thi</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-300">
                      Assert HTTP 401 khi token nằm trong danh sách đen
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1 bg-slate-950/50 p-1.5 rounded border border-slate-800/80">
                      expect(res.status).toBe(401);
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Node Detail Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedNode.agentAvatar || '📍'}</span>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                    Tọa Độ Nhận Thức · {selectedNode.layer.toUpperCase()}
                  </div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{selectedNode.title}</h4>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  selectedNode.status === 'completed'
                    ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40'
                    : selectedNode.status === 'in_progress'
                    ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40 animate-pulse'
                    : 'text-slate-400 bg-slate-800 border border-slate-700'
                }`}
              >
                {selectedNode.status === 'completed'
                  ? 'Hoàn Tất'
                  : selectedNode.status === 'in_progress'
                  ? 'Đang Xử Lý'
                  : 'Chờ Xử Lý'}
              </span>
            </div>

            {/* Agent Assignee & Role */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Tác Tử Phụ Trách</div>
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <span>{selectedNode.agentAvatar}</span>
                <span>{selectedNode.agentName || 'Agent Mesh'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Nguyên tắc kỹ thuật: <span className="font-mono text-slate-200">{selectedNode.principle || 'Atomic Commit'}</span>
              </div>
            </div>

            {/* Single Action */}
            {selectedNode.singleAction && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-indigo-400" />
                  Single Action (Hành Động Đơn Lập)
                </div>
                <div className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono">
                  {selectedNode.singleAction}
                </div>
              </div>
            )}

            {/* Test Criterion */}
            {selectedNode.testCriterion && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Tiêu Chí Kiểm Chứng (Test Criterion)
                </div>
                <div className="text-xs text-emerald-200/90 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-900/40 font-mono">
                  {selectedNode.testCriterion}
                </div>
              </div>
            )}

            {/* Unblock Tip */}
            {selectedNode.unblockTip && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-mono text-amber-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Mẹo Gỡ Nghẽn Sau 3 Phút (Unblock Tip)
                </div>
                <div className="text-xs text-amber-200/90 bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/40">
                  {selectedNode.unblockTip}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>ID: {selectedNode.id}</span>
            <span>Zero-Cognitive Load</span>
          </div>
        </div>
      </div>
    </div>
  );
}
