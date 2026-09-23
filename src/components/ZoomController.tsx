import React from 'react';
import { ZoomLevel } from '../../types';
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
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }[] = [
    {
      id: 'macro_horizon',
      label: 'Zoom Out (Vĩ mô)',
      sublabel: 'Mục Tiêu Dài Hạn',
      horizon: '6–12 tháng',
      icon: Telescope,
      accentColor: 'indigo',
    },
    {
      id: 'meso_milestone',
      label: 'Zoom Mid (Trung hạn)',
      sublabel: 'Cột Mốc & Kịch Bản',
      horizon: 'Tháng / Quý',
      icon: Calendar,
      accentColor: 'sky',
    },
    {
      id: 'micro_focus',
      label: 'Zoom In (Vi mô)',
      sublabel: 'Vi Bước & Pomodoro',
      horizon: 'Hôm nay (≤15\')',
      icon: Zap,
      accentColor: 'emerald',
    },
  ];

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5 backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Active Goal & Alignment status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-300">Tư Duy Zoom In – Zoom Out:</span>
          </div>

          {activeGoalTitle && (
            <div className="flex items-center gap-2 text-xs bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1">
              <span className="text-slate-500">Mục tiêu neo:</span>
              <span className="font-medium text-slate-200 truncate max-w-[200px] sm:max-w-[320px]">
                🎯 {activeGoalTitle}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  driftScore > 25
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                    : driftScore > 15
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                }`}
                title="Tỷ lệ việc hôm nay lệch khỏi mục tiêu dài hạn"
              >
                Drift: {driftScore}%
              </span>
            </div>
          )}
        </div>

        {/* Right: 3-Tier Switcher buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800/80 self-start lg:self-auto">
          {zoomTiers.map((tier) => {
            const Icon = tier.icon;
            const isActive = currentZoom === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => onZoomChange(tier.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <div className="text-left">
                  <div className="leading-tight">{tier.label}</div>
                  <div
                    className={`text-[9px] ${
                      isActive ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {tier.horizon}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
