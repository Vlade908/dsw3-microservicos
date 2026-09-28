import React from 'react';
import { Package, ShoppingCart, History, Server, Activity, RefreshCw } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  produtosOnline,
  pedidosOnline,
  checkingHealth,
  onRefreshHealth
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Logo e Identificação Acadêmica */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  DSW 3 • IFSP
                </span>
                <span className="text-xs text-slate-500">Microserviços & Snapshot</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Catálogo e Pedidos
              </h1>
            </div>
          </div>

          {/* Monitor de Saúde dos Microserviços (Resiliência) */}
          <div className="flex items-center flex-wrap gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 mr-1">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Status dos Serviços:</span>
            </div>

            {/* Badge ms-produtos */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border transition-colors ${
              produtosOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${produtosOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>ms-produtos :3001</span>
            </div>

            {/* Badge ms-pedidos */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border transition-colors ${
              pedidosOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${pedidosOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>ms-pedidos :3002</span>
            </div>

            {/* Botão de Atualizar Saúde */}
            <button
              onClick={onRefreshHealth}
              disabled={checkingHealth}
              title="Testar conectividade com os microsserviços"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-all ml-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'catalogo'
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4" />
            Catálogo de Produtos
          </button>

          <button
            onClick={() => setActiveTab('pedido')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'pedido'
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Fazer Pedido
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'historico'
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico de Pedidos
          </button>
        </div>
      </div>
    </header>
  );
}
