import React from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, X } from 'lucide-react';

export interface ConfirmActionPayload {
  title: string;
  subtitle: string;
  summaryItems: { label: string; value: string }[];
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

interface ConfirmModalProps {
  payload: ConfirmActionPayload | null;
  isSubmitting: boolean;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  payload,
  isSubmitting,
  onClose,
}) => {
  if (!payload) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            {payload.isDestructive ? (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            ) : (
              <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
            )}
            <h3 className="text-base font-bold text-slate-900">{payload.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            aria-label="बंद करा"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{payload.subtitle}</p>

          {payload.summaryItems.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 divide-y divide-slate-200/80">
              {payload.summaryItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-slate-600 shrink-0">{item.label}</span>
                  <span className="font-semibold text-slate-900 text-right tabular-nums">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            रद्द करा (Cancel)
          </button>
          <button
            type="button"
            onClick={payload.onConfirm}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              payload.isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-700 hover:bg-emerald-800'
            } disabled:opacity-60`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'प्रक्रिया सुरू आहे...' : payload.confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
