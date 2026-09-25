import React from 'react';
import { ZoomLevel } from '../types';
import { Telescope, Calendar, Zap, ArrowRightLeft } from 'lucide-react';

interface ZoomControllerProps {
  currentZoom: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
  activeGoalTitle?: string;
  driftScore?: number;
}

export const ZoomController: React.FC<ZoomControllerProps> = ({
  currentZoom,
  onZoomChange,
  activeGoalTitle,
  driftScore = 0,
}) => {
  const zoomTiers: {
    id: ZoomLevel;
    label: string;
    sublabel: string;
    horizon: string;
    hotkey: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }[] = [
    {
      id: 'macro_horizon',
      label: 'Zoom Out (Vĩ mô)',
      sublabel: 'Mục Tiêu Dài Hạn',
      horizon: '6–12 tháng',
      hotkey: '1',
      icon: Telescope,
      accentColor: 'indigo',
    },
    {
      id: 'meso_milestone',
      label: 'Zoom Mid (Trung hạn)',
      sublabel: 'Cột Mốc & Kịch Bản',
      horizon: 'Tháng / Quý',
      hotkey: '2',
      icon: Calendar,
      accentColor: 'sky',
    },
    {
      id: 'micro_focus',
      label: 'Zoom In (Vi mô)',
      sublabel: 'Vi Bước Lập Trình',
      horizon: 'Hôm nay (≤15\')',
      hotkey: '3',
      icon: Zap,
      accentColor: 'emerald',
    },
  ];

  return (
    <div className="bg-slate-900/80 border-b border-slate-800/80 px-5 py-2 backdrop-blur-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 max-w-7xl mx-auto w-full">
        {/* Left: Active Goal & Alignment status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-300 hidden md:inline">Tư Duy Zoom:</span>
          </div>

          {activeGoalTitle ? (
            <div className="flex items-center gap-2 text-xs bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 min-w-0">
              <span className="text-slate-500 text-[11px] shrink-0">Mục tiêu:</span>
              <span className="font-medium text-slate-200 truncate max-w-[200px] sm:max-w-[280px]">
                {activeGoalTitle}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                  driftScore > 25
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                    : driftScore > 15
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                }`}
                title="Tỷ lệ tác vụ hôm nay lệch khỏi mục tiêu dài hạn"
              >
                Drift: {driftScore}%
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">Chưa chọn mục tiêu dài hạn</span>
          )}
        </div>

        {/* Right: 3-Tier Switcher buttons with hotkeys */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800/80 self-start sm:self-auto shrink-0">
          {zoomTiers.map((tier) => {
            const Icon = tier.icon;
            const isActive = currentZoom === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => onZoomChange(tier.id)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={`Chuyển tầng ${tier.label} (Phím tắt: ${tier.hotkey})`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <div className="text-left">
                  <div className="leading-tight text-[11px]">{tier.label}</div>
                  <div
                    className={`text-[9px] ${
                      isActive ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {tier.horizon}
                  </div>
                </div>
                <kbd
                  className={`hidden lg:inline text-[9px] font-mono px-1 py-0.2 rounded ${
                    isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {tier.hotkey}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
