import React from 'react';
import { Package, ShoppingBag, Receipt, Server, RefreshCw, Cpu } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  produtosOnline,
  pedidosOnline,
  checkingHealth,
  onRefreshHealth,
  totalProdutos = 0,
  totalPedidos = 0
}) {
  const todosOnline = produtosOnline && pedidosOnline;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-3">
          
          {/* Logo Comercial e Marca Técnica */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base">
                  NEXUS TECH STORE
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Microserviços DSW3
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Catálogo Desacoplado & Snapshot Imutável
              </p>
            </div>
          </div>

          {/* Monitor de Saúde dos Microsserviços (Modo Operate Limpo) */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-600 mr-1">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Serviços:</span>
            </div>

            {/* Status ms-produtos */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] border transition-colors ${
                produtosOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
              title={`ms-produtos: porta 3001 (${produtosOnline ? 'ONLINE' : 'OFFLINE'})`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${produtosOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>produtos :3001</span>
            </div>

            {/* Status ms-pedidos */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] border transition-colors ${
                pedidosOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
              title={`ms-pedidos: porta 3002 (${pedidosOnline ? 'ONLINE' : 'OFFLINE'})`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${pedidosOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>pedidos :3002</span>
            </div>

            {/* Botão de Refresh Tátil */}
            <button
              onClick={onRefreshHealth}
              disabled={checkingHealth}
              aria-label="Atualizar status de conexão"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-all active:scale-95 ml-0.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Abas Estilo Pílula Comercial com Contadores */}
        <nav className="flex items-center gap-1 border-t border-slate-100 pt-2 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'catalogo'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Vitrine de Produtos</span>
            {totalProdutos > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'catalogo' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {totalProdutos}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pedido')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pedido'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Fazer Compra</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'historico'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Meus Pedidos</span>
            {totalPedidos > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'historico' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {totalPedidos}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
