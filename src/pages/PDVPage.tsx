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
  const [cartAberto, setCartAberto] = useState(false)

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return []
    const lower = busca.toLowerCase()
    return todosItens
      .filter(i => (i.tipo === 'venda' || i.tipo === 'ambos' || !i.tipo) && i.quantidadeAtual > 0)
      .filter(i => i.nome.toLowerCase().includes(lower))
      .slice(0, 10)
  }, [busca, todosItens])

  function addAoCarrinho(item: ItemEstoque) {
    const preco = getPreco(item.id)
    const precoUnitario = preco?.precoVenda || 0
    if (precoUnitario <= 0) return
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
      const atual = todosItens.find(i => i.id === item.itemId)?.quantidadeAtual ?? 0
      definirQuantidade(item.itemId, atual - item.quantidade)
      addLog('venda', item.itemId, item.itemNome, item.quantidade, 'PDV')
    }
    setFinalizado(true)
    setTimeout(() => {
      setCarrinho([])
      setFinalizado(false)
      setPagamento('dinheiro')
      setCartAberto(false)
    }, 2500)
  }

  const total = carrinho.reduce((acc, v) => acc + v.subtotal, 0)
  const qtdItens = carrinho.reduce((acc, v) => acc + v.quantidade, 0)

  const gruposProdutos = useMemo(() => {
    const vendaveis = todosItens.filter(i => (i.tipo === 'venda' || i.tipo === 'ambos' || !i.tipo) && i.quantidadeAtual > 0)
    const grupos: Record<string, typeof vendaveis> = {}
    for (const item of vendaveis) {
      const cat = item.categoria.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(item)
    }
    return grupos
  }, [todosItens])

  return (
    <>
      {/* Layout desktop: lado a lado */}
      <div className="hidden lg:flex flex-row gap-6 h-[calc(100vh-10rem)]">
        {/* Coluna esquerda: busca + produtos */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">🧾 PDV - Venda</h1>
            <p className="text-sm text-gray-400 mt-1">Busque ou clique no produto para adicionar ao carrinho.</p>
          </div>
          <div className="relative">
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="🔍 Buscar produto..."
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
            {itensFiltrados.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                {itensFiltrados.map(item => {
                  const preco = getPreco(item.id)
                  return (
                    <button key={item.id} onClick={() => addAoCarrinho(item)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.nome}</span>
                      <span className="text-gray-400">{preco?.precoVenda ? `R$ ${preco.precoVenda.toFixed(2)}` : '—'}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">
            {Object.entries(gruposProdutos).map(([catNome, itens]) => (
              <div key={catNome} className="mb-4 last:mb-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{catNome}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {itens.map(item => {
                    const preco = getPreco(item.id)
                    return (
                      <button key={item.id} onClick={() => addAoCarrinho(item)}
                        className="p-3 text-left rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.nome}</div>
                        <div className="text-xs text-gray-400">{item.quantidadeAtual} {item.unidade}</div>
                        {preco?.precoVenda ? <div className="text-xs font-semibold text-green-600 mt-1">R$ {preco.precoVenda.toFixed(2)}</div> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carrinho desktop */}
        <div className="w-96 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Carrinho</h2>
            <span className="text-xs text-gray-400">{carrinho.length} item(ns)</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {carrinho.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                <p className="text-2xl mb-1">🛒</p>
                <p>Carrinho vazio</p>
                <p className="text-xs mt-1">Clique nos produtos ao lado para adicionar.</p>
              </div>
            ) : (
              carrinho.map(item => (
                <div key={item.itemId} className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.itemNome}</div>
                    <div className="text-xs text-gray-400">R$ {item.precoUnitario.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => alterarQtd(item.itemId, -1)} className="min-h-[32px] min-w-[32px] flex items-center justify-center text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">−</button>
                    <span className="w-8 text-center text-sm font-medium text-gray-800 dark:text-gray-200">{item.quantidade}</span>
                    <button onClick={() => alterarQtd(item.itemId, 1)} className="min-h-[32px] min-w-[32px] flex items-center justify-center text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">+</button>
                  </div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-16 text-right">R$ {item.subtotal.toFixed(2)}</div>
                  <button onClick={() => removerItem(item.itemId)} className="text-red-400 hover:text-red-600 text-sm min-w-[24px]">✕</button>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between text-lg font-bold text-gray-800 dark:text-gray-100">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <select value={pagamento} onChange={e => setPagamento(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg">
              <option value="dinheiro">Dinheiro</option>
              <option value="credito">Cartão de Crédito</option>
              <option value="debito">Cartão de Débito</option>
              <option value="pix">PIX</option>
            </select>
            {finalizado ? (
              <div className="text-center py-3 text-green-600 font-semibold animate-pulse">✓ Venda finalizada!</div>
            ) : (
              <button onClick={finalizarVenda} disabled={carrinho.length === 0}
                className="w-full py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[48px]">
                Finalizar Venda
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Layout mobile: produtos + carrinho flutuante na bottom */}
      <div className="lg:hidden flex flex-col h-[calc(100dvh-8rem)]">
        <div className="shrink-0 mb-3">
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">🧾 PDV</h1>
          <p className="text-xs text-gray-400">Busque ou clique no produto.</p>
        </div>

        {/* Busca com dropdown */}
        <div className="relative shrink-0 mb-3">
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar..."
            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[48px]" />
          {itensFiltrados.length > 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {itensFiltrados.map(item => {
                const preco = getPreco(item.id)
                return (
                  <button key={item.id} onClick={() => addAoCarrinho(item)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left min-h-[44px]">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.nome}</span>
                    <span className="text-gray-400 text-xs">{preco?.precoVenda ? `R$ ${preco.precoVenda.toFixed(2)}` : '—'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Grid de produtos */}
        <div className="flex-1 overflow-y-auto pb-4">
          {Object.entries(gruposProdutos).map(([catNome, itens]) => (
            <div key={catNome} className="mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 px-1">{catNome}</h3>
              <div className="grid grid-cols-2 gap-2">
                {itens.map(item => {
                  const preco = getPreco(item.id)
                  return (
                    <button key={item.id} onClick={() => addAoCarrinho(item)}
                      className="flex flex-col p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 active:bg-indigo-50 dark:active:bg-indigo-900/30 active:border-indigo-200 transition-all min-h-[72px] text-left">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight line-clamp-2">{item.nome}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{item.quantidadeAtual} {item.unidade}</span>
                      {preco?.precoVenda ? (
                        <span className="text-xs font-bold text-green-600 dark:text-green-400 mt-1">R$ {preco.precoVenda.toFixed(2)}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Carrinho flutuante (se houver itens) */}
        {carrinho.length > 0 && (
          <div className="shrink-0">
            <button onClick={() => setCartAberto(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 text-white rounded-xl shadow-lg active:bg-indigo-700 transition-all min-h-[56px]">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <div className="text-left">
                  <span className="text-sm font-bold">{qtdItens} item(ns)</span>
                  <span className="text-[10px] text-indigo-200 block">{carrinho.length} produto(s)</span>
                </div>
              </div>
              <span className="text-lg font-bold">R$ {total.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal carrinho mobile */}
      {cartAberto && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 animate-fadeIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">🛒 Carrinho</h2>
            <button onClick={() => setCartAberto(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 text-xl">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {carrinho.map(item => (
              <div key={item.itemId} className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.itemNome}</div>
                  <div className="text-xs text-gray-400">R$ {item.precoUnitario.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => alterarQtd(item.itemId, -1)} className="min-h-[36px] min-w-[36px] flex items-center justify-center text-base rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">−</button>
                  <span className="w-8 text-center text-base font-bold text-gray-800 dark:text-gray-200">{item.quantidade}</span>
                  <button onClick={() => alterarQtd(item.itemId, 1)} className="min-h-[36px] min-w-[36px] flex items-center justify-center text-base rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">+</button>
                </div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 w-20 text-right">R$ {item.subtotal.toFixed(2)}</div>
                <button onClick={() => removerItem(item.itemId)} className="text-red-400 hover:text-red-600 text-base min-w-[28px]">✕</button>
              </div>
            ))}
          </div>

          <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-800 space-y-3 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Total</span>
              <span className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {total.toFixed(2)}</span>
            </div>
            <select value={pagamento} onChange={e => setPagamento(e.target.value)}
              className="w-full px-3 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl min-h-[48px]">
              <option value="dinheiro">Dinheiro</option>
              <option value="credito">Cartão de Crédito</option>
              <option value="debito">Cartão de Débito</option>
              <option value="pix">PIX</option>
            </select>
            {finalizado ? (
              <div className="text-center py-4 text-green-600 font-bold animate-pulse text-lg">✓ Venda finalizada!</div>
            ) : (
              <button onClick={finalizarVenda}
                className="w-full py-4 text-base font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 active:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[52px]">
                Finalizar Venda
              </button>
            )}
            <button onClick={() => setCartAberto(false)}
              className="w-full text-xs text-gray-400 underline py-2">Continuar comprando</button>
          </div>
        </div>
      )}
    </>
  )
}
