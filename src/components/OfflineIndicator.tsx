import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Zap } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-amber-950/90 border border-amber-800 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-md animate-fade-in">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        Chế độ Offline — Đang dùng <strong className="text-amber-100 font-mono">Local Rule Engine</strong> &amp; Bộ nhớ đệm.
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 font-mono">
        <Zap className="w-3 h-3 text-amber-400" />
        0ms Latency
      </span>
    </div>
  );
};
