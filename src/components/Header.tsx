import React from 'react';
import { ProjectContext, EnergyLevel } from '../types';
import { Sparkles, BatteryCharging, BatteryWarning, BatteryMedium, PlusCircle, Keyboard } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentContext: ProjectContext;
  onOpenContextModal: () => void;
  onRefreshPrediction: () => void;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenShortcutModal?: () => void;
  isFocusMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentContext,
  onOpenContextModal,
  onRefreshPrediction,
  isLoading,
  activeTab,
  setActiveTab,
  onOpenShortcutModal,
  isFocusMode,
}) => {
  const getEnergyIcon = (level: EnergyLevel) => {
    switch (level) {
      case 'high':
        return <BatteryCharging className="w-4 h-4 text-emerald-400" />;
      case 'medium':
        return <BatteryMedium className="w-4 h-4 text-amber-400" />;
      case 'depleted':
        return <BatteryWarning className="w-4 h-4 text-rose-400" />;
    }
  };

  const getEnergyLabel = (level: EnergyLevel) => {
    switch (level) {
      case 'high':
        return 'Năng lượng dồi dào';
      case 'medium':
        return 'Năng lượng ổn định';
      case 'depleted':
        return 'Tải nhận thức cao / Mệt mỏi';
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 group">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
          <span className="text-lg font-bold tracking-tight text-white font-sans">
            Sym<span className="text-indigo-400">FlowAge</span>
          </span>
        </a>
        <span className="text-slate-600 text-xs hidden sm:inline">/</span>
        <button
          onClick={onOpenContextModal}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 max-w-[280px] truncate group text-left"
          title={currentContext.title}
        >
          <span className="font-medium text-slate-300 group-hover:text-white truncate">
            {currentContext.title}
          </span>
          <span className="text-slate-500 text-[11px] group-hover:text-indigo-400">
            [Thay đổi]
          </span>
        </button>
      </div>

      {/* Zone 2: Navigation Links (Clean text with subtle underline) */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('goals')}
          className={`transition-colors py-1 ${
            activeTab === 'goals'
              ? 'text-white border-b-2 border-indigo-500'
              : 'hover:text-slate-200'
          }`}
        >
          Mục Tiêu Dài Hạn
        </button>
        <button
          onClick={() => setActiveTab('horizon')}
          className={`transition-colors py-1 ${
            activeTab === 'horizon'
              ? 'text-white border-b-2 border-indigo-500'
              : 'hover:text-slate-200'
          }`}
        >
          Dự Báo Ngữ Cảnh
        </button>
        <button
          onClick={() => setActiveTab('microsteps')}
          className={`transition-colors py-1 ${
            activeTab === 'microsteps'
              ? 'text-white border-b-2 border-indigo-500'
              : 'hover:text-slate-200'
          }`}
        >
          Vi Bước Lập Trình
        </button>
        <button
          onClick={() => setActiveTab('bottlenecks')}
          className={`transition-colors py-1 ${
            activeTab === 'bottlenecks'
              ? 'text-white border-b-2 border-indigo-500'
              : 'hover:text-slate-200'
          }`}
        >
          Điểm Nghẽn & Rủi Ro
        </button>
        <button
          onClick={() => setActiveTab('whyfirst')}
          className={`transition-colors py-1 ${
            activeTab === 'whyfirst'
              ? 'text-white border-b-2 border-indigo-500'
              : 'hover:text-slate-200'
          }`}
        >
          Cố Vấn Why-First
        </button>
        <button
          onClick={() => setActiveTab('rag')}
          className={`transition-colors py-1 flex items-center gap-1.5 ${
            activeTab === 'rag'
              ? 'text-white border-b-2 border-indigo-500 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          <span>RAG & pgvector</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/40 font-mono">
            MVP
          </span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-3">
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300"
          title="Mức năng lượng hiện tại"
        >
          {getEnergyIcon(currentContext.energyLevel)}
          <span className="text-[11px] text-slate-400">
            {getEnergyLabel(currentContext.energyLevel)}
          </span>
        </div>

        <PWAInstallButton />

        <button
          onClick={onRefreshPrediction}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 rounded transition-colors whitespace-nowrap shadow-sm"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Đang Dự Báo...' : 'Tái Dự Báo AI'}</span>
        </button>

        <button
          onClick={onOpenContextModal}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap"
          title="Tạo hoặc chỉnh sửa ngữ cảnh"
        >
          <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Đổi Ngữ Cảnh</span>
        </button>

        {onOpenShortcutModal && (
          <button
            onClick={onOpenShortcutModal}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 transition-all flex items-center gap-1.5 text-xs"
            title="Bảng phím tắt (Bấm Shift + ?)"
          >
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-indigo-300">?</kbd>
          </button>
        )}
      </div>
    </header>
  );
};
