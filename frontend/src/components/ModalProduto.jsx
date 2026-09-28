import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus, AlertCircle, Loader2, Info } from 'lucide-react';
import { produtosApi } from '../services/api';

export default function ModalProduto({ isOpen, onClose, produtoParaEditar, onSalvo, onToast }) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [estoque, setEstoque] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const modoEdicao = Boolean(produtoParaEditar);

  // Preenchimento dos campos quando abre ou edita
  useEffect(() => {
    if (produtoParaEditar) {
      setNome(produtoParaEditar.nome || '');
      setPreco(produtoParaEditar.preco !== undefined ? String(produtoParaEditar.preco) : '');
      setDescricao(produtoParaEditar.descricao || '');
      setEstoque(produtoParaEditar.estoque !== undefined ? String(produtoParaEditar.estoque) : '');
    } else {
      setNome('');
      setPreco('');
      setDescricao('');
      setEstoque('');
    }
    setErro(null);
  }, [produtoParaEditar, isOpen]);

  // Bloqueio de scroll do body e listener para ESC
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro('O campo "Nome" é obrigatório.');
      return;
    }

    const precoNum = parseFloat(preco);
    if (isNaN(precoNum) || precoNum < 0) {
      setErro('Informe um preço válido maior ou igual a zero.');
      return;
    }

    const estoqueNum = parseInt(estoque, 10);
    if (isNaN(estoqueNum) || estoqueNum < 0) {
      setErro('Informe uma quantidade de estoque inteira e válida.');
      return;
    }

    const payload = {
      nome: nome.trim(),
      preco: precoNum,
      descricao: descricao.trim() || null,
      estoque: estoqueNum
    };

    setSalvando(true);
    try {
      if (modoEdicao) {
        await produtosApi.put(`/produtos/${produtoParaEditar.id}`, payload);
        onToast({
          type: 'success',
          title: 'Produto Atualizado',
          message: `"${payload.nome}" foi atualizado no catálogo.`
        });
      } else {
        await produtosApi.post('/produtos', payload);
        onToast({
          type: 'success',
          title: 'Produto Cadastrado',
          message: `"${payload.nome}" foi adicionado com sucesso.`
        });
      }
      onSalvo();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      const mensagem = err.response?.data?.error || 'Não foi possível salvar o produto. Verifique a conexão com o ms-produtos (:3001).';
      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  const modalJSX = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md transition-all duration-200"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-fade-in-up relative z-10">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {modoEdicao ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {modoEdicao ? 'Editar Dados do Produto' : 'Cadastrar Novo Item no Catálogo'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Persistência no banco SQLite de <code className="text-blue-600 font-mono">ms-produtos</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{erro}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Monitor Gamer 27 165Hz"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preço Unitário (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="Ex: 1299.90"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all tabular-nums"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Saldo de Estoque *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={estoque}
                onChange={(e) => setEstoque(e.target.value)}
                placeholder="Ex: 10"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all tabular-nums"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição Comercial
            </label>
            <textarea
              rows="3"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Características do produto, especificações técnicas..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {modoEdicao && (
            <div className="flex items-start gap-2.5 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Demonstração do Snapshot:</strong> Atualizar o valor ou nome aqui alterará o catálogo ativo, mas não afetará compras passadas gravadas no histórico.
              </span>
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{modoEdicao ? 'Salvar Alterações' : 'Cadastrar no Catálogo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
