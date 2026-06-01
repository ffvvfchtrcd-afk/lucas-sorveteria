import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { usePreco } from '../context/PrecoContext'
import { CategoriaSlug, CATEGORIAS_BASE } from '../types'

export default function PrecosPage() {
  const { todosItens } = useStock()
  const { precos, setPreco, removerPreco } = usePreco()

  const [filtro, setFiltro] = useState<CategoriaSlug | 'todas'>('todas')
  const [editando, setEditando] = useState<string | null>(null)
  const [editCusto, setEditCusto] = useState(0)
  const [editVenda, setEditVenda] = useState(0)

  const itens = useMemo(() => {
    const lista = filtro === 'todas' ? todosItens : todosItens.filter(i => i.categoria === filtro)
    return lista.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [todosItens, filtro])

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
          Valor total em estoque: <strong className="text-gray-700 dark:text-gray-300">R$ {totalEstoque.toFixed(2)}</strong>
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setFiltro('todas')}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${filtro === 'todas' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>Todas</button>
        {CATEGORIAS_BASE.map(c => (
          <button key={c.slug} onClick={() => setFiltro(c.slug)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${filtro === c.slug ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>{c.icone} {c.nome}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Item</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Preço Custo</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Preço Venda</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Margem</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map(item => {
                const preco = precos.find(p => p.itemId === item.id)
                const editandoAtual = editando === item.id
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.nome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{CATEGORIAS_BASE.find(c => c.slug === item.categoria)?.nome || item.categoria}</td>
                    <td className="px-4 py-3 text-right">
                      {editandoAtual ? (
                        <input type="number" value={editCusto} min={0} step={0.01}
                          onChange={e => setEditCusto(Number(e.target.value))}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-right" />
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{preco ? `R$ ${preco.precoCusto.toFixed(2)}` : '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editandoAtual ? (
                        <input type="number" value={editVenda} min={0} step={0.01}
                          onChange={e => setEditVenda(Number(e.target.value))}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-right" />
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{preco ? `R$ ${preco.precoVenda.toFixed(2)}` : '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {preco && preco.precoCusto > 0 ? (
                        <span className={`text-sm font-medium ${preco.precoVenda > preco.precoCusto ? 'text-green-600' : 'text-red-600'}`}>
                          {((preco.precoVenda - preco.precoCusto) / preco.precoCusto * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editandoAtual ? (
                        <div className="flex gap-1">
                          <button onClick={() => salvar(item.id, item.nome)} className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Salvar</button>
                          <button onClick={() => setEditando(null)} className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 dark:bg-gray-700 rounded-md">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => iniciarEdicao(item.id)} className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 rounded-md hover:bg-indigo-100">Editar</button>
                          {preco && <button onClick={() => removerPreco(item.id)} className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/40 rounded-md hover:bg-red-100">Limpar</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {itens.length === 0 && <div className="text-center py-12 text-gray-400">Nenhum item</div>}
      </div>
    </div>
  )
}
