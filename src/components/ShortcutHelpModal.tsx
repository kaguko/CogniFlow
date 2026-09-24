import React from 'react';
import { Keyboard, X, Sparkles, Zap, ShieldQuestion, Eye, Layers } from 'lucide-react';

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  shortcuts: {
    keys: string[];
    description: string;
    icon?: React.ReactNode;
  }[];
}

export const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const groups: ShortcutGroup[] = [
    {
      category: '🚀 Chuyển Đổi Tab & Zoom Level (1 - 8)',
      shortcuts: [
        { keys: ['1', 'Alt+1'], description: 'Chuyển sang Vi Bước & Flow Focus', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
        { keys: ['2', 'Alt+2'], description: 'Mục Tiêu Dài Hạn (Goal Canvas)', icon: <Layers className="w-3.5 h-3.5 text-indigo-400" /> },
        { keys: ['3', 'Alt+3'], description: 'Dòng Thời Gian Dự Báo (Horizon)', icon: <Eye className="w-3.5 h-3.5 text-emerald-400" /> },
        { keys: ['4', 'Alt+4'], description: 'Radar Điểm Nghẽn & Ma Trận Rủi Ro' },
        { keys: ['5', 'Alt+5'], description: 'Trợ Lý Why-First Decision Copilot' },
        { keys: ['6', 'Alt+6'], description: 'Phân Tích Xu Hướng Năng Suất (Recharts)' },
        { keys: ['7', 'Alt+7'], description: 'Kho Ghi Chú & Tìm Kiếm RAG (pgvector)' },
        { keys: ['8', 'Alt+8'], description: 'Chiến Lược Cấu Trúc JSONB Strategy' },
      ],
    },
    {
      category: '🎯 Tương Tác Nâng Cao & Chế Độ Tập Trung',
      shortcuts: [
        {
          keys: ['Shift + C', 'Alt + C'],
          description: 'Mở Cố Vấn Phản Biện Socratic "Challenge Me" (Gemini Pro)',
          icon: <ShieldQuestion className="w-3.5 h-3.5 text-amber-400" />,
        },
        {
          keys: ['Shift + F', 'Alt + F'],
          description: 'Bật / Tắt Chế Độ Tập Trung Tuyệt Đối (Focus Mode)',
          icon: <Eye className="w-3.5 h-3.5 text-indigo-400" />,
        },
        {
          keys: ['Shift + ?', '?'],
          description: 'Mở / Đóng Bảng Phím Tắt Này',
          icon: <Keyboard className="w-3.5 h-3.5 text-slate-300" />,
        },
        {
          keys: ['Esc'],
          description: 'Đóng Modal Hoặc Thoát Chế Độ Tập Trung',
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl shadow-indigo-500/20 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <span>PHÍM TẮT HỆ THỐNG GLOBAL (KEYBOARD SHORTCUTS)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Mẹo lập trình viên:</strong> Bạn có thể sử dụng phím tắt ở bất kỳ vị trí nào trong ứng dụng mà không cần dùng chuột (tự động bỏ qua khi đang gõ text).
          </span>
        </div>

        <div className="space-y-5">
          {groups.map((group, idx) => (
            <div key={idx} className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {group.category}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.shortcuts.map((item, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 text-slate-200 min-w-0">
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span className="truncate">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((key, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-indigo-300 shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Bấm <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Esc</kbd> để đóng</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
          >
            Đã Hiểu (Got it)
          </button>
        </div>
      </div>
    </div>
  );
};
