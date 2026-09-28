import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div 
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
      role="region"
      aria-label="Notificações do sistema"
    >
      {toasts.map((toast) => {
        let containerStyle = 'bg-slate-900 text-white border-slate-800';
        let barColor = 'bg-blue-500';
        let Icon = Info;
        let iconColor = 'text-blue-400';

        if (toast.type === 'success') {
          containerStyle = 'bg-white text-slate-900 border-slate-200 shadow-xl shadow-slate-900/10';
          barColor = 'bg-emerald-500';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-600';
        } else if (toast.type === 'error') {
          containerStyle = 'bg-white text-slate-900 border-rose-200 shadow-xl shadow-rose-900/10';
          barColor = 'bg-rose-500';
          Icon = AlertCircle;
          iconColor = 'text-rose-600';
        } else if (toast.type === 'warning') {
          containerStyle = 'bg-white text-slate-900 border-amber-200 shadow-xl shadow-amber-900/10';
          barColor = 'bg-amber-500';
          Icon = AlertTriangle;
          iconColor = 'text-amber-600';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-4 rounded-xl border text-sm animate-fade-in-up transition-all ${containerStyle}`}
          >
            {/* Barra de progresso animada */}
            <div 
              className={`absolute top-0 left-0 h-0.5 animate-toast-progress ${barColor}`} 
            />

            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            
            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <h4 className="font-semibold text-xs text-slate-900 leading-tight mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-600 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors flex-shrink-0"
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
