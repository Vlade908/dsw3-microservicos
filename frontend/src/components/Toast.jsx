import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 sm:px-0">
      {toasts.map((toast) => {
        let bgColor = 'bg-slate-900 text-white border-slate-700';
        let Icon = Info;

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-50 text-emerald-900 border-emerald-200';
          Icon = CheckCircle2;
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-50 text-rose-900 border-rose-200';
          Icon = AlertCircle;
        } else if (toast.type === 'warning') {
          bgColor = 'bg-amber-50 text-amber-900 border-amber-200';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm transition-all duration-300 animate-in slide-in-from-bottom-2 ${bgColor}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              toast.type === 'success' ? 'text-emerald-600' :
              toast.type === 'error' ? 'text-rose-600' :
              toast.type === 'warning' ? 'text-amber-600' : 'text-slate-400'
            }`} />
            <div className="flex-1">
              {toast.title && <h4 className="font-semibold mb-0.5">{toast.title}</h4>}
              <p className="text-xs leading-relaxed opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 hover:bg-black/5 rounded-md transition-colors"
              title="Fechar notificação"
            >
              <X className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
