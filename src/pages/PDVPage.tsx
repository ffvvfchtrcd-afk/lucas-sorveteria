import { useState, useMemo, useRef, useEffect } from 'react'
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
  const [catAtiva, setCatAtiva] = useState('')
  const buscaRef = useRef<HTMLInputElement>(null)
  const focoSetado = useRef(false)

  useEffect(() => {
    if (!focoSetado.current) {
      buscaRef.current?.focus()
      focoSetado.current = true
    }
  }, [])

  const { grupos, categorias } = useMemo(() => {
    const vendaveis = todosItens.filter(i => (i.tipo === 'venda' || i.tipo === 'ambos' || !i.tipo) && i.quantidadeAtual > 0)
    const g: Record<string, typeof vendaveis> = {}
    const cats: string[] = []
    for (const item of vendaveis) {
      const cat = item.categoria.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      if (!g[cat]) { g[cat] = []; cats.push(cat) }
      g[cat].push(item)
    }
    if (!catAtiva && cats.length > 0) setCatAtiva(cats[0])
    return { grupos: g, categorias: cats }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosItens])

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return []
    const lower = busca.toLowerCase()
    return todosItens
      .filter(i => (i.tipo === 'venda' || i.tipo === 'ambos' || !i.tipo) && i.quantidadeAtual > 0)
      .filter(i => i.nome.toLowerCase().includes(lower))
      .slice(0, 15)
  }, [busca, todosItens])

  const itensCat = useMemo(() => {
    if (!catAtiva || !grupos[catAtiva]) return []
    return grupos[catAtiva]
  }, [catAtiva, grupos])

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
    buscaRef.current?.focus()
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
    }, 2000)
  }

  const total = carrinho.reduce((acc, v) => acc + v.subtotal, 0)
  const qtdItens = carrinho.reduce((acc, v) => acc + v.quantidade, 0)

  const catPills = (isMobile?: boolean) =>
    categorias.length > 0 ? (
      <div className={`flex gap-1.5 overflow-x-auto scrollbar-thin ${isMobile ? 'pb-1' : 'pb-0'} shrink-0`}>
        {categorias.map(cat => (
          <button key={cat} onClick={() => { setCatAtiva(cat); setBusca('') }}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
              catAtiva === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {cat}
          </button>
        ))}
      </div>
    ) : null

  const renderCardItem = (item: ItemEstoque) => {
    const preco = getPreco(item.id)
    return (
      <button key={item.id} onClick={() => addAoCarrinho(item)}
        className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 active:scale-[0.97] active:border-indigo-400 dark:active:border-indigo-500 transition-all shadow-sm hover:shadow-md min-h-[80px]">
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 text-center leading-tight line-clamp-2">{item.nome}</span>
        {preco?.precoVenda ? (
          <span className="text-sm font-bold text-green-600 dark:text-green-400 mt-0.5">R$ {preco.precoVenda.toFixed(2)}</span>
        ) : (
          <span className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">sem preço</span>
        )}
      </button>
    )
  }

  const renderCarrinhoItem = (item: VendaItem) => (
    <div key={item.itemId} className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.itemNome}</p>
        <p className="text-[11px] text-gray-400">R$ {item.precoUnitario.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => alterarQtd(item.itemId, -1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 font-bold text-sm select-none">−</button>
        <span className="w-7 text-center text-sm font-bold text-gray-800 dark:text-gray-200">{item.quantidade}</span>
        <button onClick={() => alterarQtd(item.itemId, 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 font-bold text-sm select-none">+</button>
      </div>
      <div className="text-sm font-bold text-gray-800 dark:text-gray-200 w-16 text-right">R$ {item.subtotal.toFixed(2)}</div>
      <button onClick={() => removerItem(item.itemId)} className="text-red-300 hover:text-red-500 text-xs w-6 h-6 flex items-center justify-center">✕</button>
    </div>
  )

  /* ─── PRODUTO CARD ─── */
  const produtoGrid = (isMobile?: boolean) => {
    const itens = busca.trim() ? itensFiltrados : itensCat
    return (
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'} gap-2 content-start`}>
        {itens.map(renderCardItem)}
        {itens.length === 0 && (
          <p className="text-gray-400 text-xs col-span-full text-center pt-8">
            {busca.trim() ? 'Nenhum produto encontrado' : 'Nenhum produto nesta categoria'}
          </p>
        )}
      </div>
    )
  }

  /* ══════════════════════════════════════
     DESKTOP LAYOUT (lg+)
     ══════════════════════════════════════ */
  const desktopLayout = (
    <div className="hidden lg:flex flex-col" style={{ height: 'calc(100vh - 6rem)' }}>
      <div className="flex gap-4 min-h-0 flex-1">
        {/* Painel de produtos */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <input ref={buscaRef} type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar produto..."
            className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shrink-0" />
          {busca.trim() ? null : catPills()}
          <div className="flex-1 overflow-y-auto">
            {produtoGrid()}
          </div>
        </div>

        {/* Carrinho lateral */}
        <div className="w-[340px] xl:w-[380px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">🛒 Carrinho</h2>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{qtdItens} itens</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-gray-50 dark:divide-gray-800/50">
            {carrinho.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm py-12">
                <p className="text-3xl mb-2">🛒</p>
                <p>Carrinho vazio</p>
                <p className="text-xs mt-1">Clique nos produtos ao lado</p>
              </div>
            ) : (
              carrinho.map(renderCarrinhoItem)
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">R$ {total.toFixed(2)}</span>
            </div>
            <select value={pagamento} onChange={e => setPagamento(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg">
              <option value="dinheiro">💵 Dinheiro</option>
              <option value="credito">💳 Cartão Crédito</option>
              <option value="debito">💳 Cartão Débito</option>
              <option value="pix">📱 PIX</option>
            </select>
            {finalizado ? (
              <div className="text-center py-3 text-green-600 font-bold animate-pulse">✓ Venda finalizada!</div>
            ) : (
              <button onClick={finalizarVenda} disabled={carrinho.length === 0}
                className="w-full py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 active:bg-green-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Finalizar Venda — R$ {total.toFixed(2)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  /* ══════════════════════════════════════
     MOBILE LAYOUT (< lg)
     ══════════════════════════════════════ */
  const mobileLayout = (
    <div className="lg:hidden flex flex-col h-full gap-2">
      <input ref={buscaRef} type="text" value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="🔍 Buscar produto..."
        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shrink-0" />
      {busca.trim() ? null : catPills(true)}
      <div className="flex-1 overflow-y-auto">
        {produtoGrid(true)}
      </div>

      {/* Botão carrinho flutuante */}
      {carrinho.length > 0 && (
        <div className="shrink-0 pb-2">
          <button onClick={() => setCartAberto(true)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <span className="text-xl">🛒</span>
              <div className="text-left">
                <span className="text-sm font-bold block">{qtdItens} item(ns)</span>
                <span className="text-[10px] text-indigo-200">{carrinho.length} produto(s)</span>
              </div>
            </div>
            <span className="text-lg font-bold">R$ {total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )

  /* ══════════════════════════════════════
     MOBILE CART MODAL
     ══════════════════════════════════════ */
  const cartModal = cartAberto && (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 animate-fadeIn">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">🛒 Carrinho</h2>
        <button onClick={() => setCartAberto(false)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 text-xl">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {carrinho.map(renderCarrinhoItem)}
      </div>

      <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-800 space-y-3 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">Total</span>
          <span className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {total.toFixed(2)}</span>
        </div>
        <select value={pagamento} onChange={e => setPagamento(e.target.value)}
          className="w-full px-3 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl">
          <option value="dinheiro">💵 Dinheiro</option>
          <option value="credito">💳 Cartão Crédito</option>
          <option value="debito">💳 Cartão Débito</option>
          <option value="pix">📱 PIX</option>
        </select>
        {finalizado ? (
          <div className="text-center py-4 text-green-600 font-bold animate-pulse text-lg">✓ Venda finalizada!</div>
        ) : (
          <button onClick={finalizarVenda}
            className="w-full py-4 text-base font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 active:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Finalizar Venda — R$ {total.toFixed(2)}
          </button>
        )}
        <button onClick={() => setCartAberto(false)}
          className="w-full text-xs text-gray-400 underline py-2">Continuar comprando</button>
      </div>
    </div>
  )

  return (
    <>
      {desktopLayout}
      {mobileLayout}
      {cartModal}
    </>
  )
}
