import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  AlertCircle,
  PackageX,
  ChevronRight,
  Package,
  Boxes,
  ShoppingBag,
  Server
} from 'lucide-react';
import CardProduto from './CardProduto';
import ProdutoAvatar from './ProdutoAvatar';
import { formatarPreco } from '../services/api';

export default function CatalogoProdutos({
  produtos,
  pedidos = [],
  loading,
  erro,
  produtosOnline = true,
  pedidosOnline = true,
  onRecarregar,
  onSelecionarParaCompra,
  onIrParaGerenciar,
  busca = '',
  onBuscaChange
}) {
  const [ordenacao, setOrdenacao] = useState('padrao');
  const [filtroDisponibilidade, setFiltroDisponibilidade] = useState('todos'); // 'todos', 'disponiveis', 'esgotados'

  // Destaque dinâmico 100% real vindo da API
  const destaqueHero = useMemo(() => {
    if (!produtos || produtos.length === 0) return null;
    return produtos.find((p) => p.estoque > 0) || produtos[0];
  }, [produtos]);

  const estoqueTotal = useMemo(
    () => produtos.reduce((acc, p) => acc + (p.estoque || 0), 0),
    [produtos]
  );

  const totalPedidosRealizados = useMemo(
    () => pedidos.filter((p) => p.status === 'REALIZADO').length,
    [pedidos]
  );

  const produtosProcessados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = produtos.filter((p) => {
      const matchBusca =
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.descricao && p.descricao.toLowerCase().includes(termo)) ||
        p.id.toLowerCase().includes(termo);

      const matchDisponibilidade =
        filtroDisponibilidade === 'disponiveis'
          ? p.estoque > 0
          : filtroDisponibilidade === 'esgotados'
          ? p.estoque <= 0
          : true;

      return matchBusca && matchDisponibilidade;
    });

    const ordenada = [...lista];
    if (ordenacao === 'menor-preco') {
      ordenada.sort((a, b) => a.preco - b.preco);
    } else if (ordenacao === 'maior-preco') {
      ordenada.sort((a, b) => b.preco - a.preco);
    } else if (ordenacao === 'estoque') {
      ordenada.sort((a, b) => b.estoque - a.estoque);
    }

    return ordenada;
  }, [produtos, busca, ordenacao, filtroDisponibilidade]);

  return (
    <div className="flex flex-col w-full">
      {/* HERO SPOTLIGHT DINÂMICO (Exibido apenas com produto real da API) */}
      {loading && produtos.length === 0 ? (
        <section className="w-full py-10 md:py-14 px-5 md:px-10 bg-gradient-to-b from-surface to-surface-container-low">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center animate-pulse">
            <div className="lg:col-span-6 space-y-4">
              <div className="h-6 w-44 rounded-full bg-surface-container" />
              <div className="h-12 w-3/4 rounded-2xl bg-surface-container" />
              <div className="h-5 w-full rounded bg-surface-container-high" />
              <div className="h-32 w-full max-w-md rounded-3xl bg-surface-container-lowest border border-surface-container" />
            </div>
            <div className="lg:col-span-6">
              <div className="w-full aspect-[4/3] rounded-3xl bg-surface-container-lowest border border-surface-container" />
            </div>
          </div>
        </section>
      ) : destaqueHero ? (
        <section className="w-full py-10 md:py-14 px-5 md:px-10 bg-gradient-to-b from-surface to-surface-container-low overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-6 flex flex-col items-start z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-primary text-xs mb-4 border border-primary/10">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-semibold tracking-tight">Produto em Destaque no Catálogo</span>
              </div>

              <h1 className="font-sans text-3xl sm:text-5xl lg:text-[48px] lg:leading-[54px] font-semibold text-on-surface tracking-tight mb-4">
                {destaqueHero.nome}
              </h1>

              <p className="text-base sm:text-lg text-on-surface-variant max-w-xl mb-6 leading-relaxed">
                {destaqueHero.descricao || 'Produto cadastrado no catálogo ativo de ms-produtos.'}
              </p>

              <div className="p-6 rounded-3xl mb-6 w-full max-w-md bg-surface-container-lowest shadow-sm border border-surface-container">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
                    Preço unitário
                  </span>
                  <span className="font-sans text-[28px] leading-tight font-semibold text-primary-container tabular-nums">
                    {formatarPreco(destaqueHero.preco)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-surface-container">
                  <span className="font-mono">ID: {destaqueHero.id.slice(0, 8)}...</span>
                  <span
                    className={`font-medium tabular-nums ${
                      destaqueHero.estoque > 0 ? 'text-apple-green' : 'text-error'
                    }`}
                  >
                    {destaqueHero.estoque > 0
                      ? `${destaqueHero.estoque} un. em estoque`
                      : 'Esgotado'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onSelecionarParaCompra(destaqueHero)}
                  disabled={destaqueHero.estoque <= 0}
                  className="px-8 py-3 rounded-full bg-primary-container text-on-primary text-sm font-medium hover:bg-primary transition-colors shadow-sm disabled:opacity-50"
                >
                  {destaqueHero.estoque > 0 ? 'Comprar agora' : 'Indisponível'}
                </button>

                <a
                  href="#vitrine-catalogo"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:text-primary transition-colors group"
                >
                  <span>Ver todos os produtos</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-6 relative flex justify-center items-center">
              <div className="w-full relative aspect-[4/3] rounded-3xl overflow-hidden bg-white border border-surface-container shadow-sm">
                <ProdutoAvatar
                  nome={destaqueHero.nome}
                  imagemUrl={destaqueHero.imagemUrl}
                  produtoId={destaqueHero.id}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* RESUMO REAL EM TEMPO REAL (Calculado diretamente das APIs) */}
      <section className="w-full py-6 px-5 md:px-10 bg-surface-container-lowest border-y border-surface-container">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-on-surface">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-on-surface-variant block">Produtos Cadastrados</span>
              <span className="font-sans text-lg font-semibold text-on-surface tabular-nums">
                {produtos.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-on-surface">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-on-surface-variant block">Unidades em Estoque</span>
              <span className="font-sans text-lg font-semibold text-on-surface tabular-nums">
                {estoqueTotal} un.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-on-surface">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-on-surface-variant block">Pedidos Realizados</span>
              <span className="font-sans text-lg font-semibold text-on-surface tabular-nums">
                {totalPedidosRealizados}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-on-surface">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-on-surface-variant block">Origem do Catálogo</span>
              <span className="font-mono text-xs font-semibold text-primary block">
                {produtosOnline ? 'ms-produtos :3001' : 'ms-query / cache'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* VITRINE REAL DE PRODUTOS */}
      <section id="vitrine-catalogo" className="w-full py-12 px-5 md:px-10 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
            <div>
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold block mb-2">
                Catálogo em Tempo Real
              </span>
              <h2 className="font-sans text-3xl sm:text-4xl font-semibold text-on-surface tracking-tight">
                Produtos disponíveis
              </h2>
              <p className="text-sm sm:text-base text-on-surface-variant mt-1 tabular-nums">
                Exibindo {produtosProcessados.length} de {produtos.length}{' '}
                {produtos.length === 1 ? 'produto' : 'produtos'} registrados no banco de dados.
              </p>
            </div>

            {/* Controles de Filtro */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => onBuscaChange?.(e.target.value)}
                  placeholder="Filtrar por nome, descrição ou ID..."
                  className="w-full pl-9 pr-4 py-2 rounded-full bg-surface-container-lowest border border-surface-container text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary-container/30"
                />
              </div>

              <div className="inline-flex p-1 bg-surface-container rounded-full">
                <button
                  type="button"
                  onClick={() => setFiltroDisponibilidade('todos')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filtroDisponibilidade === 'todos'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroDisponibilidade('disponiveis')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filtroDisponibilidade === 'disponiveis'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Em estoque
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroDisponibilidade('esgotados')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filtroDisponibilidade === 'esgotados'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Esgotados
                </button>
              </div>

              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
                aria-label="Ordenar produtos"
                className="px-3.5 py-2 rounded-full bg-surface-container-lowest border border-surface-container text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/30"
              >
                <option value="padrao">Ordenar: Padrão (A–Z)</option>
                <option value="menor-preco">Menor Preço</option>
                <option value="maior-preco">Maior Preço</option>
                <option value="estoque">Maior Estoque</option>
              </select>

              <button
                type="button"
                onClick={onRecarregar}
                disabled={loading}
                title="Sincronizar catálogo"
                className="w-9 h-9 rounded-full bg-surface-container-lowest border border-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* Alerta de Resiliência Graciosa */}
          {erro && (
            <div className="mb-8 p-6 bg-error-container/40 border border-error/20 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">
                    Catálogo Temporariamente Indisponível
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    {erro} O restante da interface permanece estável.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRecarregar}
                className="px-5 py-2 rounded-full bg-on-surface text-surface-container-lowest text-xs font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
              >
                Tentar Reconectar
              </button>
            </div>
          )}

          {/* Skeletons de Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-surface-container-lowest rounded-3xl border border-surface-container overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-surface-container-low" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 bg-surface-container rounded w-1/4" />
                    <div className="h-5 bg-surface-container rounded w-3/4" />
                    <div className="h-4 bg-surface-container-low rounded w-full" />
                    <div className="h-10 bg-surface-container rounded-full w-full mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid de Produtos Reais */}
          {!loading && !erro && (
            produtosProcessados.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {produtosProcessados.map((produto) => (
                  <CardProduto
                    key={produto.id}
                    produto={produto}
                    onComprar={onSelecionarParaCompra}
                    pedidosOnline={pedidosOnline}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-3xl border border-surface-container p-12 text-center max-w-md mx-auto shadow-sm">
                <div className="w-12 h-12 bg-surface-container text-on-surface-variant rounded-full flex items-center justify-center mx-auto mb-3">
                  <PackageX className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-on-surface text-base mb-1">
                  Nenhum produto encontrado
                </h3>
                <p className="text-xs text-on-surface-variant mb-5 leading-relaxed">
                  {busca || filtroDisponibilidade !== 'todos'
                    ? 'Nenhum produto corresponde aos filtros atuais.'
                    : 'Ainda não há produtos cadastrados no banco do ms-produtos.'}
                </p>
                {busca || filtroDisponibilidade !== 'todos' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onBuscaChange?.('');
                      setFiltroDisponibilidade('todos');
                    }}
                    className="px-6 py-2.5 rounded-full bg-on-surface text-surface-container-lowest text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Limpar filtros
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onIrParaGerenciar}
                    className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary text-xs font-medium hover:bg-primary transition-colors"
                  >
                    Cadastrar Produto em Gerenciar Loja
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
