import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { ProducaoRegistro } from '../types'

const STORAGE_KEY = 'estoque_producoes'

function carregarProducoes(): ProducaoRegistro[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export default function ProducaoPage() {
  const { todosItens, definirQuantidade, adicionarQuantidade } = useStock()
  const { addLog } = useLog()

  const [producoes, setProducoes] = useState<ProducaoRegistro[]>(carregarProducoes)
  const [nomeProducao, setNomeProducao] = useState('')
  const [ingredientes, setIngredientes] = useState<{ itemId: string; quantidade: number }[]>([])
  const [resultados, setResultados] = useState<{ itemId: string; quantidade: number }[]>([])
  const [buscaIng, setBuscaIng] = useState('')
  const [buscaRes, setBuscaRes] = useState('')

  const mps = useMemo(() => todosItens.filter(i => i.categoria === 'materias_primas' && i.quantidadeAtual > 0), [todosItens])
  const produtos = useMemo(() => todosItens.filter(i => i.categoria !== 'materias_primas'), [todosItens])

  const ingFiltrados = buscaIng.trim()
    ? mps.filter(i => i.nome.toLowerCase().includes(buscaIng.toLowerCase())).slice(0, 8)
    : []

  const resFiltrados = buscaRes.trim()
    ? produtos.filter(i => i.nome.toLowerCase().includes(buscaRes.toLowerCase())).slice(0, 8)
    : []

  function addIngrediente(itemId: string) {
    if (ingredientes.find(i => i.itemId === itemId)) return
    setIngredientes(prev => [...prev, { itemId, quantidade: 1 }])
    setBuscaIng('')
  }

  function addResultado(itemId: string) {
    if (resultados.find(r => r.itemId === itemId)) return
    setResultados(prev => [...prev, { itemId, quantidade: 1 }])
    setBuscaRes('')
  }

  function removerIngrediente(itemId: string) {
    setIngredientes(prev => prev.filter(i => i.itemId !== itemId))
  }

  function removerResultado(itemId: string) {
    setResultados(prev => prev.filter(r => r.itemId !== itemId))
  }

  function alterarQtdIng(itemId: string, qtd: number) {
    setIngredientes(prev => prev.map(i => i.itemId === itemId ? { ...i, quantidade: Math.max(0.1, qtd) } : i))
  }

  function alterarQtdRes(itemId: string, qtd: number) {
    setResultados(prev => prev.map(r => r.itemId === itemId ? { ...r, quantidade: Math.max(1, qtd) } : r))
  }

  function executarProducao() {
    if (!nomeProducao.trim() || ingredientes.length === 0 || resultados.length === 0) return

    for (const ing of ingredientes) {
      const item = todosItens.find(i => i.id === ing.itemId)
      if (!item || item.quantidadeAtual < ing.quantidade) {
        alert(`Estoque insuficiente de ${item?.nome || ing.itemId}`)
        return
      }
    }

    const registro: ProducaoRegistro = {
      id: `prod_${Date.now()}`,
      nome: nomeProducao.trim(),
      ingredientes: ingredientes.map(ing => {
        const item = todosItens.find(i => i.id === ing.itemId)!
        return { itemId: ing.itemId, itemNome: item.nome, quantidade: ing.quantidade }
      }),
      resultados: resultados.map(res => {
        const item = todosItens.find(i => i.id === res.itemId)!
        return { itemId: res.itemId, itemNome: item.nome, quantidade: res.quantidade }
      }),
      data: new Date().toISOString(),
    }

    for (const ing of ingredientes) {
      const item = todosItens.find(i => i.id === ing.itemId)!
      definirQuantidade(ing.itemId, item.quantidadeAtual - ing.quantidade)
      addLog('producao', ing.itemId, item.nome, -ing.quantidade, 'Produção', nomeProducao)
    }
    for (const res of resultados) {
      const item = todosItens.find(i => i.id === res.itemId)!
      adicionarQuantidade(res.itemId, res.quantidade)
      addLog('producao', res.itemId, item.nome, res.quantidade, 'Produção', nomeProducao)
    }

    const updated = [registro, ...producoes].slice(0, 500)
    setProducoes(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    setNomeProducao('')
    setIngredientes([])
    setResultados([])
  }

  function getNome(id: string) {
    return todosItens.find(i => i.id === id)?.nome || id
  }

  function getUnidade(id: string) {
    return todosItens.find(i => i.id === id)?.unidade || ''
  }

  function getQtd(id: string) {
    return todosItens.find(i => i.id === id)?.quantidadeAtual || 0
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">🏭 Produção</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Consuma matérias-primas para produzir itens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6 space-y-4">
          <input
            type="text"
            value={nomeProducao}
            onChange={e => setNomeProducao(e.target.value)}
            placeholder="Nome da produção (ex: Leite Condensado Caseiro)"
            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">🧪 Ingredientes (MPs que serão consumidas)</h3>
            <div className="relative mb-2">
              <input
                type="text"
                value={buscaIng}
                onChange={e => setBuscaIng(e.target.value)}
                placeholder="Buscar matéria-prima..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {ingFiltrados.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  {ingFiltrados.map(item => (
                    <button key={item.id} onClick={() => addIngrediente(item.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.nome}</span>
                      <span className="text-xs text-gray-400">{item.quantidadeAtual} {item.unidade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {ingredientes.length > 0 && (
              <div className="space-y-2">
                {ingredientes.map(ing => (
                  <div key={ing.itemId} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{getNome(ing.itemId)}</span>
                    <input type="number" value={ing.quantidade} min={0.1} step={0.1}
                      onChange={e => alterarQtdIng(ing.itemId, Number(e.target.value))}
                      className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-center" />
                    <span className="text-xs text-gray-400 w-8">{getUnidade(ing.itemId)}</span>
                    <span className="text-xs text-gray-400">disp: {getQtd(ing.itemId)}</span>
                    <button onClick={() => removerIngrediente(ing.itemId)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">📦 Resultado (produtos gerados)</h3>
            <div className="relative mb-2">
              <input
                type="text"
                value={buscaRes}
                onChange={e => setBuscaRes(e.target.value)}
                placeholder="Buscar produto (Açaí, Sorvetes)..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {resFiltrados.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  {resFiltrados.map(item => (
                    <button key={item.id} onClick={() => addResultado(item.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.nome}</span>
                      <span className="text-xs text-gray-400">{item.quantidadeAtual} {item.unidade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {resultados.length > 0 && (
              <div className="space-y-2">
                {resultados.map(res => (
                  <div key={res.itemId} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{getNome(res.itemId)}</span>
                    <input type="number" value={res.quantidade} min={1}
                      onChange={e => alterarQtdRes(res.itemId, Number(e.target.value))}
                      className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-center" />
                    <span className="text-xs text-gray-400 w-8">{getUnidade(res.itemId)}</span>
                    <button onClick={() => removerResultado(res.itemId)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={executarProducao}
            disabled={ingredientes.length === 0 || resultados.length === 0 || !nomeProducao.trim()}
            className="w-full py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ▶ Executar Produção
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 overflow-y-auto max-h-[70vh]">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">📋 Histórico de Produção</h2>
          {producoes.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Nenhuma produção registrada</p>
          ) : (
            <div className="space-y-3">
              {producoes.slice(0, 30).map(p => (
                <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm space-y-1">
                  <div className="font-medium text-gray-800 dark:text-gray-200">{p.nome}</div>
                  <div className="text-xs text-gray-400">{new Date(p.data).toLocaleDateString('pt-BR')}</div>
                  <div className="text-xs text-gray-500">
                    <span className="text-orange-500">↓ {p.ingredientes.map(i => `${i.itemNome} (${i.quantidade})`).join(', ')}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="text-green-500">↑ {p.resultados.map(r => `${r.itemNome} (${r.quantidade})`).join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
