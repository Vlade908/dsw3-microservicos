import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingBag, X, Activity, Menu } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'catalogo', label: 'Vitrine' },
  { id: 'historico', label: 'Meus Pedidos' },
  { id: 'gerenciar', label: 'Gerenciar Loja' }
];

const MOBILE_NAV_ITEMS = [
  { id: 'catalogo', label: 'Vitrine' },
  { id: 'pedido', label: 'Checkout' },
  { id: 'historico', label: 'Meus Pedidos' },
  { id: 'gerenciar', label: 'Gerenciar Loja' }
];

export default function Header({
  activeTab,
  setActiveTab,
  busca = '',
  onBuscaChange,
  produtosOnline,
  pedidosOnline,
  brokerOnline = true,
  queryOnline = true,
  totalProdutos = 0,
  totalPedidos = 0,
  temItemCheckout = false,
  onToggleStatusPopover
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef(null);

  const todosOnline = produtosOnline && pedidosOnline && brokerOnline && queryOnline;

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const handleOpenSearch = () => {
    setMobileMenuOpen(false);
    setSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    if (busca) onBuscaChange?.('');
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between gap-4">
        {/* Marca VERO STORE */}
        <button
          type="button"
          onClick={() => handleNavigate('catalogo')}
          className="flex items-center gap-1.5 shrink-0 focus:outline-none"
          aria-label="VERO Store — Ir para a Vitrine"
        >
          <span className="font-sans text-[21px] leading-[28px] tracking-[-0.01em] text-on-surface font-bold">
            VERO
          </span>
          <span className="text-[11px] leading-[14px] tracking-[0.04em] uppercase px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
            STORE
          </span>
        </button>

        {/* Navegação Central Editorial ou Busca Inline */}
        {searchOpen ? (
          <div className="flex-1 max-w-lg mx-2 flex items-center gap-2 animate-fade-in-up">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={busca}
                onChange={(e) => {
                  onBuscaChange?.(e.target.value);
                  if (activeTab !== 'catalogo') setActiveTab('catalogo');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                  }
                }}
                placeholder="Buscar produtos cadastrados..."
                aria-label="Buscar produtos cadastrados"
                className="h-10 w-full pl-10 pr-9 rounded-full bg-surface-container-low/90 border border-outline-variant/40 text-[14px] text-on-surface placeholder:text-on-surface-variant/75 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/25 focus:border-primary-container/40 transition-all"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => onBuscaChange?.('')}
                  aria-label="Limpar termo de busca"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleCloseSearch}
              aria-label="Fechar busca"
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <nav className="hidden md:flex items-center gap-8" aria-label="Navegação principal">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const isHistoricoActive = isActive && item.id === 'historico';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-1 text-[14px] leading-[18px] transition-colors duration-150 ${
                    isHistoricoActive
                      ? 'text-primary font-semibold'
                      : isActive
                      ? 'text-on-surface font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface font-medium'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className={`absolute -bottom-1 inset-x-0 h-[1.5px] rounded-full ${
                        isHistoricoActive ? 'bg-primary' : 'bg-on-surface'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Trio de Ações Stitch + Toggle Mobile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!searchOpen && (
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label="Buscar produtos"
              title="Buscar no catálogo"
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <Search className="w-[19px] h-[19px]" strokeWidth={1.75} />
              {busca.trim() !== '' && (
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-primary-container absolute top-1.5 right-1.5"
                />
              )}
            </button>
          )}

          {/* Atalho Checkout */}
          <button
            type="button"
            onClick={() => handleNavigate('pedido')}
            aria-label="Ir para o Checkout"
            title="Ir para o Checkout"
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              activeTab === 'pedido'
                ? 'bg-primary-fixed/70 text-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <ShoppingBag className="w-[19px] h-[19px]" strokeWidth={1.75} />
            {temItemCheckout && activeTab !== 'pedido' && (
              <span
                aria-label="1 item selecionado no checkout"
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-container text-on-primary text-[10px] flex items-center justify-center font-bold leading-none"
              >
                1
              </span>
            )}
          </button>

          {/* Status dos Microsserviços */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onToggleStatusPopover?.();
            }}
            title={
              todosOnline
                ? `Todos os 4 microsserviços operacionais (${totalProdutos} produtos, ${totalPedidos} pedidos) — clique para detalhes`
                : 'Contingência ativa — clique para inspecionar serviços'
            }
            aria-label="Disponibilidade dos serviços"
            className={`relative ml-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${
              todosOnline
                ? 'bg-primary hover:bg-primary-container text-on-primary'
                : 'bg-tertiary hover:bg-tertiary/90 text-white animate-pulse'
            }`}
          >
            <Activity className="w-4 h-4" strokeWidth={2} />
            <span
              aria-hidden="true"
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface-container-lowest ${
                todosOnline ? 'bg-apple-green' : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Toggle Menu Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-[19px] h-[19px]" strokeWidth={1.75} />
            ) : (
              <Menu className="w-[19px] h-[19px]" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Menu Mobile Flutuante */}
      {mobileMenuOpen && (
        <nav
          aria-label="Navegação mobile"
          className="md:hidden bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container/60 shadow-lg px-5 py-3 flex flex-col gap-1 animate-fade-in-up"
        >
          {MOBILE_NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isHistoricoActive = isActive && item.id === 'historico';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[14px] leading-[18px] transition-colors ${
                  isHistoricoActive
                    ? 'bg-primary-fixed/40 text-primary font-semibold'
                    : isActive
                    ? 'bg-surface-container text-on-surface font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-medium'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
