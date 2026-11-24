import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { BROKER_API_URL, QUERY_API_URL } from '../services/api';

export default function Footer({
  produtosOnline,
  pedidosOnline,
  brokerOnline,
  queryOnline,
  onNavigateTab,
  onToggleStatusPopover
}) {
  const todosOnline = produtosOnline && pedidosOnline && brokerOnline && queryOnline;

  function irPara(tab) {
    onNavigateTab?.(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <footer className="w-full bg-surface-container-low border-t border-surface-container mt-16">
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-semibold">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li>
                <button onClick={() => irPara('catalogo')} className="hover:text-on-surface transition-colors">
                  Vitrine de Produtos
                </button>
              </li>
              <li>
                <button onClick={() => irPara('pedido')} className="hover:text-on-surface transition-colors">
                  Checkout de Pedido
                </button>
              </li>
              <li>
                <button onClick={() => irPara('historico')} className="hover:text-on-surface transition-colors">
                  Meus Pedidos (Snapshots)
                </button>
              </li>
              <li>
                <button onClick={() => irPara('gerenciar')} className="hover:text-on-surface transition-colors">
                  Gerenciar Loja (CRUD)
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-semibold">
              Serviços e Observabilidade
            </h4>
            <ul className="space-y-2 text-xs text-on-surface-variant">
              <li>
                <a
                  href={BROKER_API_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-on-surface transition-colors"
                >
                  <span>Event Broker (:3003)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href={QUERY_API_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-on-surface transition-colors"
                >
                  <span>Query Service CQRS (:3004)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-semibold">
              Arquitetura DSW 3
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              IFSP Câmpus Capivari • Projeto Prático de Arquitetura de Microserviços • Prof. Me.
              André Luís Bordignon.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-surface-container flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[11px] text-on-surface-variant">
          <div className="flex flex-wrap items-center gap-4">
            <span>VERO Store • Catálogo e Pedidos em Tempo Real</span>
            <span className="inline-flex items-center gap-1 text-on-surface font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-apple-green" />
              Snapshot Imutável Ativo
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleStatusPopover}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-surface-container hover:border-outline-variant text-xs font-medium text-on-surface transition-colors shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  todosOnline ? 'bg-apple-green' : 'bg-tertiary'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  todosOnline ? 'bg-apple-green' : 'bg-tertiary'
                }`}
              />
            </span>
            <span>
              {todosOnline
                ? 'Todos os serviços operacionais'
                : 'Modo de contingência ativo • Ver serviços'}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
