import React from 'react';
import { ShoppingCart, Edit3, Trash2, PackageCheck, AlertCircle } from 'lucide-react';
import { formatarPreco } from '../services/api';

export default function CardProduto({ produto, onComprar, onEditar, onExcluir }) {
  const esgotado = produto.estoque <= 0;
  const estoqueBaixo = produto.estoque > 0 && produto.estoque <= 5;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Cabeçalho do Card: Badge de Estoque & Ações de Gerenciamento */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            esgotado
              ? 'bg-rose-100 text-rose-700'
              : estoqueBaixo
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              esgotado ? 'bg-rose-500' : estoqueBaixo ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            {esgotado ? 'Esgotado' : `${produto.estoque} em estoque`}
          </span>

          {/* Botões de Ação Administrativa (Editar e Excluir) */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEditar(produto)}
              title="Editar preço, nome ou estoque"
              aria-label={`Editar ${produto.nome}`}
              className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onExcluir(produto.id, produto.nome)}
              title="Excluir produto do catálogo"
              aria-label={`Excluir ${produto.nome}`}
              className="p-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Informações Principais */}
        <h3 className="font-bold text-slate-900 text-base mb-1.5 leading-snug line-clamp-2">
          {produto.nome}
        </h3>

        <p className="text-slate-600 text-xs line-clamp-2 mb-4 min-h-[32px]">
          {produto.descricao || 'Sem descrição cadastrada.'}
        </p>
      </div>

      {/* Preço e Botão de Ação */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Preço Unitário
          </span>
          <span className="text-lg font-extrabold text-slate-900 tracking-tight tabular-nums">
            {formatarPreco(produto.preco)}
          </span>
        </div>

        <button
          onClick={() => onComprar(produto)}
          disabled={esgotado}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
            esgotado
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Comprar</span>
        </button>
      </div>
    </div>
  );
}
