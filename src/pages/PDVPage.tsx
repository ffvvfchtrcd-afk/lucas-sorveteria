import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { ItemEstoque, VendaItem } from '../types'

export default function PDVPage() {
  const { todosItens, definirQuantidade } = useStock()
  const { addLog } = useLog()
  const { getPreco } = usePreco()

  const [carrinho, setCarrinho] = useState<VendaItem[]>([])
  const [busca, setBusca] = useState('')
  const [pagamento, setPagamento] = useState('dinheiro')
  const [finalizado, setFinalizado] = useState(false)

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return []
    const lower = busca.toLowerCase()
    return todosItens
      .filter(i => i.tipo === 'venda' || i.tipo === 'ambos' || !i.tipo)
      .filter(i => i.nome.toLowerCase().includes(lower) && i.quantidadeAtual > 0)
      .slice(0, 10)
  }, [busca, todosItens])

  function addAoCarrinho(item: ItemEstoque) {
    const preco = getPreco(item.id)
    const precoUnitario = preco?.precoVenda || 0
    setCarrinho(prev => {
      const existente = prev.find(v => v.itemId === item.id)
      if (existente) {
        return prev.map(v =>
          v.itemId === item.id
            ? { ...v, quantidade: v.quantidade + 1, subtotal: (v.quantidade + 1) * precoUnitario }
            : v
        )
      }
      return [...prev, { itemId: item.id, itemNome: item.nome, quantidade: 1, precoUnitario, subtotal: precoUnitario }]
    })
    setBusca('')
  }

  function removerItem(itemId: string) {
    setCarrinho(prev => prev.filter(v => v.itemId !== itemId))
  }

  function alterarQtd(itemId: string, delta: number) {
    setCarrinho(prev => prev.map(v => {
      if (v.itemId !== itemId) return v
      const novaQtd = Math.max(1, v.quantidade + delta)
      return { ...v, quantidade: novaQtd, subtotal: novaQtd * v.precoUnitario }
    }))
  }

  function finalizarVenda() {
    if (carrinho.length === 0) return
    for (const item of carrinho) {
      definirQuantidade(item.itemId, (todosItens.find(i => i.id === item.itemId)?.quantidadeAtual ?? 0) - item.quantidade)
      addLog('venda', item.itemId, item.itemNome, item.quantidade, 'PDV')
    }
    setFinalizado(true)
    setTimeout(() => {
      setCarrinho([])
      setFinalizado(false)
      setPagamento('dinheiro')
    }, 3000)
  }

  const total = carrinho.reduce((acc, v) => acc + v.subtotal, 0)

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">🧾 PDV - Venda</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Registre vendas e dê baixa no estoque</p>
        </div>

        <div className="relative">
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto por nome..."
            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            autoFocus
          />
          {itensFiltrados.length > 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
              {itensFiltrados.map(item => {
                const preco = getPreco(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => addAoCarrinho(item)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.nome}</span>
                    <span className="text-gray-400">{preco?.precoVenda ? `R$ ${preco.precoVenda.toFixed(2)}` : '—'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Produtos Disponíveis</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {todosItens
              .filter(i => (i.tipo === 'venda' || i.tipo === 'ambos' || !i.tipo) && i.quantidadeAtual > 0)
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map(item => {
                const preco = getPreco(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => addAoCarrinho(item)}
                    className="p-3 text-left rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all"
                  >
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.nome}</div>
                    <div className="text-xs text-gray-400">{item.quantidadeAtual} {item.unidade}</div>
                    {preco?.precoVenda && <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">R$ {preco.precoVenda.toFixed(2)}</div>}
                  </button>
                )
              })}
          </div>
        </div>
      </div>

      <div className="lg:w-96 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Carrinho</h2>
          <span className="text-xs text-gray-400">{carrinho.length} item(ns)</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {carrinho.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Carrinho vazio</p>
          ) : (
            carrinho.map(item => (
              <div key={item.itemId} className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.itemNome}</div>
                  <div className="text-xs text-gray-400">R$ {item.precoUnitario.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => alterarQtd(item.itemId, -1)} className="w-7 h-7 flex items-center justify-center text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">−</button>
                  <span className="w-8 text-center text-sm font-medium text-gray-800 dark:text-gray-200">{item.quantidade}</span>
                  <button onClick={() => alterarQtd(item.itemId, 1)} className="w-7 h-7 flex items-center justify-center text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">+</button>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-16 text-right">R$ {item.subtotal.toFixed(2)}</div>
                <button onClick={() => removerItem(item.itemId)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between text-lg font-bold text-gray-800 dark:text-gray-100">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          <select
            value={pagamento}
            onChange={e => setPagamento(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg"
          >
            <option value="dinheiro">Dinheiro</option>
            <option value="credito">Cartão de Crédito</option>
            <option value="debito">Cartão de Débito</option>
            <option value="pix">PIX</option>
          </select>
          {finalizado ? (
            <div className="text-center py-3 text-green-600 dark:text-green-400 font-semibold animate-pulse">✓ Venda finalizada!</div>
          ) : (
            <button
              onClick={finalizarVenda}
              disabled={carrinho.length === 0}
              className="w-full py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Finalizar Venda
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
