import React from 'react';
import { X, RefreshCw, ExternalLink, Activity } from 'lucide-react';
import { BROKER_API_URL, QUERY_API_URL } from '../services/api';

export default function StatusServicosPopover({
  isOpen,
  onClose,
  produtosOnline,
  pedidosOnline,
  brokerOnline,
  queryOnline,
  checkingHealth,
  onRefreshHealth
}) {
  if (!isOpen) return null;

  const todosOnline = produtosOnline && pedidosOnline && brokerOnline && queryOnline;

  const services = [
    {
      name: 'ms-produtos',
      port: ':3001',
      online: produtosOnline,
      onlineDesc: 'Catálogo oficial SQLite sincronizado',
      offlineDesc: 'Offline • Leitura via ms-query / fila no Broker',
      onlineBadge: 'Estável',
      offlineBadge: 'Cache Ativo'
    },
    {
      name: 'ms-pedidos',
      port: ':3002',
      online: pedidosOnline,
      onlineDesc: 'Checkout síncrono & Snapshot Pattern ativo',
      offlineDesc: 'Instabilidade • Processamento por Fila Segura ativo',
      onlineBadge: 'Estável',
      offlineBadge: 'Modo Fila'
    },
    {
      name: 'event-broker',
      port: ':3003',
      online: brokerOnline,
      onlineDesc: 'Operacional • Fila Store-and-Forward FIFO',
      offlineDesc: 'Indisponível para enfileiramento assíncrono',
      onlineBadge: 'Estável',
      offlineBadge: 'Offline',
      href: BROKER_API_URL
    },
    {
      name: 'ms-query',
      port: ':3004',
      online: queryOnline,
      onlineDesc: 'Leituras e projeção CQRS sincronizadas',
      offlineDesc: 'Projeção de leitura indisponível',
      onlineBadge: 'Estável',
      offlineBadge: 'Offline',
      href: QUERY_API_URL
    }
  ];

  return (
    <div
      className="fixed bottom-16 right-4 sm:right-8 z-50 w-[92vw] sm:w-[440px] bg-surface-container-lowest rounded-[20px] shadow-2xl border border-surface-container p-6 animate-fade-in-up"
      role="dialog"
      aria-label="Disponibilidade dos Serviços VERO"
    >
      {/* Topo */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                todosOnline ? 'bg-apple-green' : 'bg-tertiary'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                todosOnline ? 'bg-apple-green' : 'bg-tertiary'
              }`}
            />
          </span>
          <h4 className="text-sm font-semibold text-on-surface">
            Disponibilidade dos Serviços VERO
          </h4>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel de serviços"
          className="w-7 h-7 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Resumo de Modo */}
      <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-surface-container-low flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${todosOnline ? 'text-apple-green' : 'text-tertiary'}`} />
          <span className="text-xs font-medium text-on-surface">
            {todosOnline
              ? 'Todos os sistemas operacionais'
              : 'Degradação Graciosa • Fila Ativa'}
          </span>
        </div>
        <span className="text-[11px] text-outline">Automático</span>
      </div>

      {/* Lista dos 4 Microsserviços */}
      <div className="space-y-2.5">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="p-3 rounded-xl bg-surface-container-low/70 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  svc.online ? 'bg-apple-green' : 'bg-tertiary animate-pulse'
                }`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-on-surface truncate">
                    {svc.name}{' '}
                    <span className="font-mono font-normal text-outline">{svc.port}</span>
                  </span>
                  {svc.href && (
                    <a
                      href={svc.href}
                      target="_blank"
                      rel="noreferrer"
                      title={`Abrir painel de ${svc.name}`}
                      className="text-primary hover:text-primary-container"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <span className="text-[11px] text-on-surface-variant block truncate">
                  {svc.online ? svc.onlineDesc : svc.offlineDesc}
                </span>
              </div>
            </div>

            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                svc.online
                  ? 'bg-surface-container-lowest text-on-surface border border-surface-container'
                  : 'bg-tertiary-fixed text-on-tertiary-fixed'
              }`}
            >
              {svc.online ? svc.onlineBadge : svc.offlineBadge}
            </span>
          </div>
        ))}
      </div>

      {/* Nota de Rodapé */}
      <p className="text-[11px] text-on-surface-variant mt-4 text-center leading-relaxed">
        Transações protegidas por enfileiramento Store-and-Forward e garantia de preço por snapshot.
      </p>

      {/* Ações */}
      <div className="mt-4 pt-3 flex items-center gap-2 justify-end border-t border-surface-container">
        <button
          type="button"
          onClick={onRefreshHealth}
          disabled={checkingHealth}
          className="px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
          <span>Atualizar Status</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-full bg-on-surface text-surface-container-lowest text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

