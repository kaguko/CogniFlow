import React from 'react';
import { ProjectContext, EnergyLevel } from '../types';
import {
  Sparkles,
  BatteryCharging,
  BatteryWarning,
  BatteryMedium,
  PlusCircle,
  Keyboard,
  Radio,
  Bot,
  Activity,
  Layers
} from 'lucide-react';
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
        return <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />;
      case 'medium':
        return <BatteryMedium className="w-3.5 h-3.5 text-amber-400" />;
      case 'depleted':
        return <BatteryWarning className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  const getEnergyLabel = (level: EnergyLevel) => {
    switch (level) {
      case 'high':
        return 'Năng lượng cao';
      case 'medium':
        return 'Năng lượng ổn định';
      case 'depleted':
        return 'Tải nhận thức cao';
    }
  };

  const navLinks = [
    { id: 'goals', label: 'Mục Tiêu' },
    { id: 'horizon', label: 'Dự Báo' },
    { id: 'microsteps', label: 'Vi Bước (≤15\')' },
    { id: 'bottlenecks', label: 'Rủi Ro & Drift' },
    { id: 'whyfirst', label: 'Why-First' },
    { id: 'behavioral', label: 'Hành Vi' },
    { id: 'agent_activity', label: 'Agent Stream', isAgent: true },
  ];

  return (
    <header className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      {/* Zone 1: Brand Wordmark & Active Project Context Selector */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded">
          <span className="w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform shadow-sm shadow-indigo-500/50" />
          <span className="text-base font-bold tracking-tight text-white font-sans">
            Sym<span className="text-indigo-400">FlowAge</span>
          </span>
        </a>
        <span className="text-slate-700 text-xs hidden sm:inline">/</span>
        <button
          onClick={onOpenContextModal}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 max-w-[260px] truncate group text-left px-2 py-1 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800"
          title={`Ngữ cảnh: ${currentContext.title} (Bấm để thay đổi)`}
        >
          <span className="font-medium text-slate-300 group-hover:text-white truncate">
            {currentContext.title}
          </span>
          <span className="text-slate-500 text-[10px] group-hover:text-indigo-400 font-mono">
            [Đổi]
          </span>
        </button>
      </div>

      {/* Zone 2: Primary Navigation Links */}
      <nav className="hidden xl:flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60">
        {navLinks.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/30'
                  : 'hover:text-slate-200 hover:bg-slate-800/60 text-slate-400'
              }`}
            >
              {link.isAgent && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Status & Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Live SSE Telemetry indicator */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300"
          title="Kết nối MCP Server & SSE Stream hoạt động bình thường"
        >
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-slate-400 font-mono text-[10px]">SSE Live</span>
        </div>

        {/* Cognitive Energy Indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300"
          title={`Mức năng lượng nhận thức: ${getEnergyLabel(currentContext.energyLevel)}`}
        >
          {getEnergyIcon(currentContext.energyLevel)}
          <span className="text-[10px] text-slate-400">
            {getEnergyLabel(currentContext.energyLevel)}
          </span>
        </div>

        <PWAInstallButton />

        <button
          onClick={onRefreshPrediction}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 rounded-lg transition-all whitespace-nowrap shadow-sm shadow-indigo-600/20 active:scale-[0.98]"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Dự Báo...' : 'Tái Dự Báo AI'}</span>
        </button>

        {onOpenShortcutModal && (
          <button
            onClick={onOpenShortcutModal}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 transition-all flex items-center gap-1 text-xs"
            title="Bảng phím tắt (Bấm Shift + ?)"
            aria-label="Mở phím tắt"
          >
            <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
            <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-indigo-300">?</kbd>
          </button>
        )}
      </div>
    </header>
  );
};
