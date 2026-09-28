import React, { useState, useMemo } from 'react';
import { Search, Plus, RefreshCw, AlertCircle, PackageX, SlidersHorizontal, Check } from 'lucide-react';
import CardProduto from './CardProduto';
import ModalProduto from './ModalProduto';
import { produtosApi } from '../services/api';

export default function CatalogoProdutos({
  produtos,
  loading,
  erro,
  onRecarregar,
  onSelecionarParaCompra,
  onToast
}) {
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('padrao'); // 'padrao', 'menor-preco', 'maior-preco', 'estoque'
  const [somenteDisponiveis, setSomenteDisponiveis] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);

  // Filtragem e ordenação reativa
  const produtosProcessados = useMemo(() => {
    let lista = produtos.filter((p) => {
      const matchBusca =
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase()));
      const matchDisponivel = somenteDisponiveis ? p.estoque > 0 : true;
      return matchBusca && matchDisponivel;
    });

    if (ordenacao === 'menor-preco') {
      lista.sort((a, b) => a.preco - b.preco);
    } else if (ordenacao === 'maior-preco') {
      lista.sort((a, b) => b.preco - a.preco);
    } else if (ordenacao === 'estoque') {
      lista.sort((a, b) => b.estoque - a.estoque);
    }

    return lista;
  }, [produtos, busca, ordenacao, somenteDisponiveis]);

  function abrirNovoProduto() {
    setProdutoEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(produto) {
    setProdutoEditando(produto);
    setModalAberto(true);
  }

  async function handleExcluir(id, nome) {
    const confirmou = window.confirm(`Deseja realmente remover o produto "${nome}" do catálogo?`);
    if (!confirmou) return;

    try {
      await produtosApi.delete(`/produtos/${id}`);
      onToast({
        type: 'success',
        title: 'Produto Removido',
        message: `"${nome}" foi excluído com sucesso.`
      });
      onRecarregar();
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      const mensagem = err.response?.data?.error || 'Não foi possível excluir o produto. Verifique a conexão com o ms-produtos (:3001).';
      onToast({
        type: 'error',
        title: 'Falha na Exclusão',
        message: mensagem
      });
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Barra de Ações da Vitrine */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Vitrine de Produtos</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold tabular-nums">
              {produtosProcessados.length} de {produtos.length} {produtos.length === 1 ? 'item' : 'itens'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Microserviço autônomo <code className="text-blue-600 font-mono">ms-produtos</code> (Porta 3001)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onRecarregar}
            disabled={loading}
            title="Sincronizar com a API"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Atualizar</span>
          </button>

          {/* Botão + Novo Produto mantido para modo Admin */}
          <button
            onClick={abrirNovoProduto}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Controles de Filtro e Busca Comercial */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Input de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou especificação..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
          />
        </div>

        {/* Seleção de Ordenação */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative min-w-[160px]">
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
            >
              <option value="padrao">Ordenar: Padrão (A-Z)</option>
              <option value="menor-preco">Menor Preço</option>
              <option value="maior-preco">Maior Preço</option>
              <option value="estoque">Maior Estoque</option>
            </select>
          </div>

          {/* Toggle Somente Disponíveis */}
          <button
            onClick={() => setSomenteDisponiveis(!somenteDisponiveis)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              somenteDisponiveis
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
              somenteDisponiveis ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
            }`}>
              {somenteDisponiveis && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
            <span>Em estoque</span>
          </button>
        </div>
      </div>

      {/* Alerta de Resiliência Graciosa (ms-produtos Offline) */}
      {erro && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                Catálogo Temporariamente Indisponível
              </h4>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                Não foi possível estabelecer contato com o <code className="font-mono">ms-produtos</code> na porta 3001. 
                O restante do sistema permanece estável.
              </p>
            </div>
          </div>
          <button
            onClick={onRecarregar}
            className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm self-start sm:self-auto transition-colors"
          >
            Tentar Reconectar
          </button>
        </div>
      )}

      {/* Esqueletos de Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-slate-200 rounded-md w-1/3" />
              <div className="h-6 bg-slate-200 rounded-md w-3/4" />
              <div className="h-4 bg-slate-100 rounded-md w-full" />
              <div className="h-9 bg-slate-100 rounded-md w-full pt-4 border-t border-slate-100" />
            </div>
          ))}
        </div>
      )}

      {/* Grid de Produtos */}
      {!loading && !erro && (
        produtosProcessados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {produtosProcessados.map((produto) => (
              <CardProduto
                key={produto.id}
                produto={produto}
                onComprar={(prod) => onSelecionarParaCompra(prod)}
                onEditar={(prod) => abrirEdicao(prod)}
                onExcluir={handleExcluir}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <PackageX className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">
              Nenhum produto encontrado
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {busca || somenteDisponiveis
                ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos de pesquisa.'
                : 'O catálogo está vazio no momento. Cadastre o primeiro item.'}
            </p>
            <button
              onClick={abrirNovoProduto}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Produto</span>
            </button>
          </div>
        )
      )}

      {/* Modal de Gestão */}
      <ModalProduto
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        produtoParaEditar={produtoEditando}
        onSalvo={onRecarregar}
        onToast={onToast}
      />
    </div>
  );
}
