import React from 'react';
import { ProjectContext } from '../types';
import {
  Compass,
  CheckSquare,
  AlertTriangle,
  Lightbulb,
  Activity,
  Layers,
  ArrowRight,
  Code2,
  Telescope,
  Target,
  Database,
  Zap,
  GraduationCap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentContext: ProjectContext;
  presets: ProjectContext[];
  onSelectPreset: (preset: ProjectContext) => void;
  pendingMicroStepsCount: number;
  criticalBottlenecksCount: number;
  goalsCount?: number;
  activeGoalTitle?: string;
  driftScore?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentContext,
  presets,
  onSelectPreset,
  pendingMicroStepsCount,
  criticalBottlenecksCount,
  goalsCount = 2,
  activeGoalTitle,
  driftScore = 0,
}) => {
  const navItems = [
    {
      id: 'goals',
      label: 'Mục Tiêu Dài Hạn',
      icon: Telescope,
      badge: `${goalsCount} Goals`,
      description: 'Lộ trình 6–12 tháng & Cột mốc',
    },
    {
      id: 'horizon',
      label: 'Dự Báo Ngữ Cảnh',
      icon: Compass,
      description: '3 dòng thời gian tương lai',
    },
    {
      id: 'microsteps',
      label: 'Vi Bước Lập Trình',
      icon: CheckSquare,
      badge: pendingMicroStepsCount > 0 ? `${pendingMicroStepsCount}` : undefined,
      description: 'Divide & Conquer ≤15 phút',
    },
    {
      id: 'bottlenecks',
      label: 'Điểm Nghẽn & Rủi Ro',
      icon: AlertTriangle,
      badge: criticalBottlenecksCount > 0 ? `${criticalBottlenecksCount} rủi ro` : undefined,
      badgeVariant: 'danger',
      description: 'Goal Drift & Tắc nghẽn hệ thống',
    },
    {
      id: 'whyfirst',
      label: 'Cố Vấn Why-First',
      icon: Lightbulb,
      description: 'Tư duy phản biện Socratic',
    },
    {
      id: 'rag',
      label: 'RAG & Tìm Kiếm Ngữ Nghĩa',
      icon: Database,
      badge: 'pgvector',
      description: 'Cosine search & Grounded Q&A',
    },
    {
      id: 'jsonb_index',
      label: 'Hiệu Năng PostgreSQL Lab',
      icon: Zap,
      badge: 'Chuyên sâu',
      description: 'Chỉ mục JSONB, FOR NO KEY UPDATE & Thuế TOAST',
    },
    {
      id: 'behavioral',
      label: 'Phân Tích Hành Vi',
      icon: Activity,
      description: 'Vận tốc & ma sát nhận thức',
    },
    {
      id: 'academic',
      label: 'Khung Nghiên Cứu Học Thuật',
      icon: GraduationCap,
      badge: 'Luận văn',
      description: 'Dàn ý 5 chương, RQs & Literature',
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-57px)]">
      {/* Navigation Links */}
      <div className="p-4 space-y-6">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5 px-2">
            Không Gian Tư Duy
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-left transition-colors group ${
                    isActive
                      ? 'bg-indigo-950/70 text-indigo-300 font-medium border border-indigo-800/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-xs truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-600 truncate">{item.description}</div>
                    </div>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        item.badgeVariant === 'danger'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                          : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Scenarios & Presets */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5 px-2">
            <span>Kịch Bản Mẫu Thực Tế</span>
            <Layers className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="space-y-1.5">
            {presets.map((preset) => {
              const isSelected = preset.id === currentContext.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className={`w-full text-left p-2.5 rounded transition-all text-xs border ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-600/60 text-slate-200 shadow-sm'
                      : 'bg-slate-900/30 border-slate-800/60 text-slate-400 hover:text-slate-300 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium line-clamp-1 text-[11px] text-slate-200">
                      {preset.title}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    Hạn: {preset.deadlineHorizon} · {preset.techStack.slice(0, 2).join(', ')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Programmer Principle Footer Tip */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/50">
        <div className="flex items-start gap-2.5 p-2.5 rounded bg-slate-900/60 border border-slate-800/80">
          <Code2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            <span className="text-slate-200 font-medium block mb-0.5">Nguyên Tắc Cốt Lõi:</span>
            "Bài toán lớn là ảo ảnh. Chia đến khi mỗi bước chỉ mất 10 phút, bạn sẽ không còn rào cản."
          </div>
        </div>
      </div>
    </aside>
  );
};
