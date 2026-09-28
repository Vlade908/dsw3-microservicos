import React, { useState, useEffect } from 'react';
import { X, Save, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { produtosApi } from '../services/api';

export default function ModalProduto({ isOpen, onClose, produtoParaEditar, onSalvo, onToast }) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [estoque, setEstoque] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const modoEdicao = Boolean(produtoParaEditar);

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

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);

    // Validações locais
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
          message: `O produto "${payload.nome}" foi atualizado com sucesso.`
        });
      } else {
        await produtosApi.post('/produtos', payload);
        onToast({
          type: 'success',
          title: 'Produto Cadastrado',
          message: `O produto "${payload.nome}" foi inserido no catálogo.`
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              {modoEdicao ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {modoEdicao ? 'Editar Produto do Catálogo' : 'Novo Produto para o Catálogo'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Teclado Mecânico RGB"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Preço Unitário (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="Ex: 299.90"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Estoque Inicial *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={estoque}
                onChange={(e) => setEstoque(e.target.value)}
                placeholder="Ex: 10"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descrição (Opcional)
            </label>
            <textarea
              rows="3"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Breve descrição do produto..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {modoEdicao && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              💡 <strong>Demonstração do Snapshot Pattern:</strong> Alterar o preço ou nome aqui não mudará pedidos já realizados anteriormente no histórico.
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{modoEdicao ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
