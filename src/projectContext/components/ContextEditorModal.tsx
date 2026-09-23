import React, { useState } from 'react';
import { ProjectContext } from '../entities/projectContext';
import { DomainType, EnergyLevel } from '../valueObjects';
import { Sparkles, X, Layers, AlertCircle } from 'lucide-react';

interface ContextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContext: ProjectContext;
  onSaveContext: (updatedContext: ProjectContext) => void;
}

export const ContextEditorModal: React.FC<ContextEditorModalProps> = ({
  isOpen,
  onClose,
  currentContext,
  onSaveContext,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(currentContext.title);
  const [description, setDescription] = useState(currentContext.description);
  const [domain, setDomain] = useState<DomainType>(currentContext.domain);
  const [deadlineHorizon, setDeadlineHorizon] = useState(currentContext.deadlineHorizon);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(currentContext.energyLevel);
  const [currentFriction, setCurrentFriction] = useState(currentContext.currentFriction);
  const [techStackInput, setTechStackInput] = useState(currentContext.techStack.join(', '));
  const [behavioralFlagsInput, setBehavioralFlagsInput] = useState(
    currentContext.behavioralFlags.join(', ')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ProjectContext = {
      ...currentContext,
      id: `ctx_${Date.now()}`,
      title: title.trim() || 'Mục tiêu lập trình mới',
      description: description.trim(),
      domain,
      deadlineHorizon: deadlineHorizon.trim() || '48 giờ tới',
      energyLevel,
      currentFriction: currentFriction.trim() || 'Chưa rõ điểm bắt đầu',
      techStack: techStackInput
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
      behavioralFlags: behavioralFlagsInput
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
      lastUpdated: 'Vừa xong',
    };

    onSaveContext(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Cấu Hình Ngữ Cảnh Bài Toán (Context Builder)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Mục Tiêu Lớn Cuối Cùng (Big Goal):
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Tái cấu trúc module Auth spaghetti 2,500 dòng..."
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Chi Tiết Bài Toán & Ràng Buộc:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả hiện trạng và yêu cầu..."
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Domain & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Lĩnh Vực:</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as DomainType)}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white"
              >
                <option value="software">Phần Mềm & Ứng Dụng</option>
                <option value="system_architecture">Kiến Trúc Hệ Thống</option>
                <option value="devops_cloud">DevOps, Cloud & SRE</option>
                <option value="startup_product">Sản Phẩm & MVP</option>
                <option value="research">Nghiên Cứu Kỹ Thuật</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Thời Hạn / Chân Trời Dự Báo:</label>
              <input
                type="text"
                value={deadlineHorizon}
                onChange={(e) => setDeadlineHorizon(e.target.value)}
                placeholder="VD: 24 giờ tới, 3 ngày tới..."
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          {/* Energy level */}
          <div>
            <label className="block text-slate-400 mb-1">Mức Năng Lượng / Tải Nhận Thức Hiện Tại:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'high', label: 'Dồi dào (Tập trung cao)' },
                { val: 'medium', label: 'Ổn định (Bình thường)' },
                { val: 'depleted', label: 'Mệt mỏi (Tải cao)' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.val}
                  onClick={() => setEnergyLevel(item.val as EnergyLevel)}
                  className={`p-2 rounded border text-center transition-colors text-[11px] ${
                    energyLevel === item.val
                      ? 'bg-indigo-950 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Current Friction */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Rào Cản Lớn Nhất Khiến Bạn Đang Do Dự / Nghẽn:
            </label>
            <input
              type="text"
              value={currentFriction}
              onChange={(e) => setCurrentFriction(e.target.value)}
              placeholder="VD: Sợ sửa lan man làm vỡ tính năng cũ, chưa biết chọn thư viện nào..."
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-slate-400 mb-1">Công Nghệ / Công Cụ (phẩy ngăn cách):</label>
            <input
              type="text"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              placeholder="TypeScript, Node.js, Redis, Docker, Jest..."
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          {/* Behavioral Flags */}
          <div>
            <label className="block text-slate-400 mb-1">
              Dấu Hiệu Hành Vi Cần Giám Sát (phẩy ngăn cách):
            </label>
            <input
              type="text"
              value={behavioralFlagsInput}
              onChange={(e) => setBehavioralFlagsInput(e.target.value)}
              placeholder="analysis_paralysis, over_engineering, fear_of_regression..."
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lưu & Kích Hoạt Dự Báo Mới</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
