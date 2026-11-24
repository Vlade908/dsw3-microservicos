import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
      role="region"
      aria-label="Notificações do sistema"
    >
      {toasts.map((toast) => {
        let containerStyle =
          'bg-surface-container-lowest/95 backdrop-blur-xl text-on-surface border-surface-container shadow-2xl';
        let barColor = 'bg-primary-container';
        let Icon = Info;
        let iconColor = 'text-primary-container';

        if (toast.type === 'success') {
          barColor = 'bg-apple-green';
          Icon = CheckCircle2;
          iconColor = 'text-apple-green';
        } else if (toast.type === 'error') {
          containerStyle =
            'bg-surface-container-lowest/95 backdrop-blur-xl text-on-surface border-error/20 shadow-2xl';
          barColor = 'bg-error';
          Icon = AlertCircle;
          iconColor = 'text-error';
        } else if (toast.type === 'warning') {
          containerStyle =
            'bg-surface-container-lowest/95 backdrop-blur-xl text-on-surface border-amber-300/70 shadow-2xl';
          barColor = 'bg-amber-500';
          Icon = AlertTriangle;
          iconColor = 'text-amber-600';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-2xl border text-sm animate-fade-in-up transition-all ${containerStyle}`}
          >
            <div className={`absolute top-0 left-0 h-0.5 animate-toast-progress ${barColor}`} />

            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <h4 className="font-semibold text-xs text-on-surface leading-tight mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-on-surface-variant leading-relaxed break-words">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-outline hover:text-on-surface rounded-full hover:bg-surface-container transition-colors flex-shrink-0"
              aria-label="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
