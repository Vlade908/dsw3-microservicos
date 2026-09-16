import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md p-8 bg-white rounded-xl shadow-md border border-slate-200">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-4">
          DSW3 • IFSP
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Sistema de Catálogo e Pedidos
        </h1>
        <p className="text-slate-600 text-sm mb-4">
          Ambiente preparado. Aguardando inicialização dos microsserviços.
        </p>
      </div>
    </div>
  );
}
