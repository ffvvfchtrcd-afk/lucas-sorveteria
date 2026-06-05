import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { usePreco } from '../context/PrecoContext'
import { useReceita } from '../context/ReceitaContext'
import { CATEGORIAS_BASE, UnidadeMedida } from '../types'
import ReceitaModal from '../components/ReceitaModal'

export default function PrecosPage() {
  const { todosItens } = useStock()
  const { precos, setPreco, removerPreco } = usePreco()
  const { getReceitaByProduto, calcularCusto, custoTotal } = useReceita()

  const [filtro, setFiltro] = useState<string>('todas')
  const [editando, setEditando] = useState<string | null>(null)
  const [editCusto, setEditCusto] = useState(0)
  const [editVenda, setEditVenda] = useState(0)
  const [receitaItemId, setReceitaItemId] = useState<string | null>(null)

  const itens = useMemo(() => {
    const lista = filtro === 'todas' ? todosItens : todosItens.filter(i => i.categoria === filtro)
    return lista.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [todosItens, filtro])

  const custoUnitario = (itemId: string) => precos.find(p => p.itemId === itemId)?.precoCusto || 0

  function iniciarEdicao(itemId: string) {
    const p = precos.find(p => p.itemId === itemId)
    setEditCusto(p?.precoCusto || 0)
    setEditVenda(p?.precoVenda || 0)
    setEditando(itemId)
  }

  function salvar(itemId: string, itemNome: string) {
    setPreco(itemId, itemNome, editCusto, editVenda)
    setEditando(null)
  }

  const totalEstoque = precos.reduce((acc, p) => {
    const item = todosItens.find(i => i.id === p.itemId)
    return acc + (item?.quantidadeAtual || 0) * p.precoCusto
  }, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">💰 Preços</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Defina o <strong>preço de custo</strong> (quanto você paga) e o <strong>preço de venda</strong> (quanto o cliente paga) de cada produto.
          Para produtos com <strong>📐 Receita</strong> cadastrada, o custo é calculado automaticamente. Valor total em estoque: <strong className="text-gray-700 dark:text-gray-300">R$ {totalEstoque.toFixed(2)}</strong>
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setFiltro('todas')}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${filtro === 'todas' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>📋 Todas</button>
        {CATEGORIAS_BASE.map(c => (
          <button key={c.slug} onClick={() => setFiltro(c.slug)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${filtro === c.slug ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>{c.icone} {c.nome}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tabela de Preços</span>
          <span className="text-xs text-gray-400">{itens.length} produto(s) · clique em "Editar" ou "📋 Receita"</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Preço de Custo</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Preço de Venda</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Margem (%)</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map(item => {
                const preco = precos.find(p => p.itemId === item.id)
                const editandoAtual = editando === item.id
                const receita = getReceitaByProduto(item.id)
                const custoAuto = receita ? custoTotal(item.id, custoUnitario) : 0
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <span>{item.nome}</span>
                        {receita && (
                          <span title="Custo calculado pela receita" className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">📐 Auto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{CATEGORIAS_BASE.find(c => c.slug === item.categoria)?.nome || item.categoria}</td>
                    <td className="px-4 py-3 text-right">
                      {editandoAtual ? (
                        <input type="number" value={editCusto} min={0} step={0.01}
                          onChange={e => setEditCusto(Number(e.target.value))}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      ) : receita ? (
                        <div className="text-right">
                          <p className="text-gray-800 dark:text-gray-200 font-semibold">R$ {custoAuto.toFixed(2)}</p>
                          <p className="text-[9px] text-indigo-500">pela receita</p>
                        </div>
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{preco ? `R$ ${preco.precoCusto.toFixed(2)}` : <span className="text-gray-300">—</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editandoAtual ? (
                        <input type="number" value={editVenda} min={0} step={0.01}
                          onChange={e => setEditVenda(Number(e.target.value))}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{preco ? `R$ ${preco.precoVenda.toFixed(2)}` : <span className="text-gray-300">—</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {preco && preco.precoCusto > 0 ? (
                        <span className={`text-sm font-medium ${preco.precoVenda > preco.precoCusto ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {((preco.precoVenda - preco.precoCusto) / preco.precoCusto * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editandoAtual ? (
                        <div className="flex gap-1">
                          <button onClick={() => salvar(item.id, item.nome)} className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Salvar</button>
                          <button onClick={() => setEditando(null)} className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => iniciarEdicao(item.id)} className="px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 rounded-md hover:bg-indigo-100">Editar</button>
                          <button onClick={() => setReceitaItemId(item.id)} className={`px-2 py-1 text-xs font-medium rounded-md ${receita ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60' : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}>
                            📋 {receita ? 'Receita' : '+ Receita'}
                          </button>
                          {preco && <button onClick={() => removerPreco(item.id)} className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-md hover:bg-red-100">Limpar</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {itens.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            <p className="text-3xl mb-2">💰</p>
            <p className="font-medium">Nenhum produto encontrado</p>
            <p className="text-xs mt-1">Tente selecionar outra categoria.</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">ℹ️ Preço de Custo vs Preço de Venda</h3>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          <strong>Preço de Custo</strong> = quanto você paga para adquirir ou produzir o item.<br />
          <strong>Preço de Venda</strong> = quanto o cliente paga na hora da compra.<br />
          <strong>Margem</strong> = (venda − custo) ÷ custo × 100 — mostra o percentual de lucro.<br />
          <strong>📐 Receita</strong> = cadastre os ingredientes de um produto e o sistema calcula o custo automaticamente (soma de MP × preço).<br />
          Se a margem aparecer em <span className="text-red-600">vermelho</span>, significa que você está vendendo por menos do que custa (prejuízo).
        </p>
      </div>

      {receitaItemId && (() => {
        const item = todosItens.find(i => i.id === receitaItemId)
        if (!item) return null
        return (
          <ReceitaModal
            item={item}
            onClose={() => setReceitaItemId(null)}
          />
        )
      })()}
    </div>
  )
}
