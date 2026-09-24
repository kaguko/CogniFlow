import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide the button
  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-medium transition-all shadow-sm border border-indigo-500/50 shrink-0"
        title="Cài đặt SymFlowAge làm ứng dụng PWA chạy Offline"
      >
        <Download className="w-3.5 h-3.5 text-indigo-200" />
        <span className="hidden sm:inline">Cài App Offline</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Cài iOS App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  Cài Đặt Cài Đặt Trên iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Nhấn vào biểu tượng <strong>Chia sẻ (Share)</strong> trên thanh công cụ Safari.<br />
                2. Cuộn xuống và chọn <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong>.<br />
                3. Nhấn <strong>Thêm (Add)</strong> để chạy ứng dụng độc lập không cần Internet.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Đã Hiểu
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
