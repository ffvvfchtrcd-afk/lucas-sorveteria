import { useState, useMemo, useRef, useEffect } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { ItemEstoque, VendaItem, gestaoFromTipo } from '../types'

type SheetState =
  | { tipo: 'fechado' }
  | { tipo: 'qtd'; item: ItemEstoque }
  | { tipo: 'carrinho' }

export default function PDVPage() {
  const { todosItens, definirQuantidade } = useStock()
  const { addLog } = useLog()
  const { getPreco } = usePreco()

  const [carrinho, setCarrinho] = useState<VendaItem[]>([])
  const [busca, setBusca] = useState('')
  const [pagamento, setPagamento] = useState('dinheiro')
  const [finalizado, setFinalizado] = useState(false)
  const [sheet, setSheet] = useState<SheetState>({ tipo: 'fechado' })
  const [catAtiva, setCatAtiva] = useState('')
  const [flashId, setFlashId] = useState<string | null>(null)
  const buscaRef = useRef<HTMLInputElement>(null)
  const focoSetado = useRef(false)
  const cartSheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!focoSetado.current) {
      buscaRef.current?.focus()
      focoSetado.current = true
    }
  }, [])

  const { grupos, categorias } = useMemo(() => {
    const vendaveis = todosItens.filter(i => {
      const g = i.gestao || gestaoFromTipo(i.tipo)
      return g.permiteVenda && i.quantidadeAtual > 0
    })
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
      .filter(i => {
        const g = i.gestao || gestaoFromTipo(i.tipo)
        return g.permiteVenda && i.quantidadeAtual > 0
      })
      .filter(i => i.nome.toLowerCase().includes(lower))
      .slice(0, 15)
  }, [busca, todosItens])

  const itensCat = useMemo(() => {
    if (!catAtiva || !grupos[catAtiva]) return []
    return grupos[catAtiva]
  }, [catAtiva, grupos])

  function addAoCarrinho(itemId: string, itemNome: string, qtd: number, precoUnitario: number) {
    if (qtd <= 0 || precoUnitario <= 0) return
    setCarrinho(prev => {
      const existente = prev.find(v => v.itemId === itemId)
      if (existente) {
        return prev.map(v =>
          v.itemId === itemId
            ? { ...v, quantidade: v.quantidade + qtd, subtotal: (v.quantidade + qtd) * precoUnitario }
            : v
        )
      }
      return [...prev, { itemId, itemNome, quantidade: qtd, precoUnitario, subtotal: qtd * precoUnitario }]
    })
    setFlashId(itemId)
    setTimeout(() => setFlashId(null), 600)
  }

  function abrirQuantidade(item: ItemEstoque) {
    setSheet({ tipo: 'qtd', item })
  }

  function removerItem(itemId: string) {
    setCarrinho(prev => prev.filter(v => v.itemId !== itemId))
  }

  function alterarQtd(itemId: string, delta: number) {
    setCarrinho(prev => prev.flatMap(v => {
      if (v.itemId !== itemId) return [v]
      const novaQtd = v.quantidade + delta
      if (novaQtd <= 0) return []
      return [{ ...v, quantidade: novaQtd, subtotal: novaQtd * v.precoUnitario }]
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
    setSheet({ tipo: 'fechado' })
    setTimeout(() => {
      setCarrinho([])
      setFinalizado(false)
      setPagamento('dinheiro')
    }, 2000)
  }

  const total = carrinho.reduce((acc, v) => acc + v.subtotal, 0)
  const qtdItens = carrinho.reduce((acc, v) => acc + v.quantidade, 0)

  /* ─────────── UI HELPERS ─────────── */
  const catPills = (compact = false) =>
    categorias.length > 0 ? (
      <div className={`flex gap-1.5 overflow-x-auto scrollbar-thin shrink-0 ${compact ? 'pb-1' : ''}`}>
        {categorias.map(cat => (
          <button key={cat} onClick={() => { setCatAtiva(cat); setBusca('') }}
            className={`shrink-0 px-3.5 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-colors ${
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
    const precoVenda = preco?.precoVenda || 0
    const noCart = carrinho.find(c => c.itemId === item.id)?.quantidade || 0
    const flashing = flashId === item.id
    return (
      <button key={item.id} onClick={() => abrirQuantidade(item)} disabled={precoVenda <= 0}
        className={`relative flex flex-col items-stretch p-2.5 rounded-2xl border-2 bg-white dark:bg-gray-900 active:scale-[0.97] transition-all shadow-sm min-h-[96px] text-left ${
          flashing
            ? 'border-green-500 dark:border-green-400 ring-2 ring-green-300 dark:ring-green-700 scale-[0.97]'
            : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
        } ${precoVenda <= 0 ? 'opacity-50' : ''}`}>
        {noCart > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
            {noCart}
          </span>
        )}
        <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 leading-tight line-clamp-2 mb-1">{item.nome}</span>
        {precoVenda > 0 ? (
          <span className="text-base font-bold text-green-600 dark:text-green-400 mt-auto">R$ {precoVenda.toFixed(2)}</span>
        ) : (
          <span className="text-[10px] text-gray-300 dark:text-gray-600 mt-auto">sem preço</span>
        )}
        <span className="text-[9px] text-gray-400 mt-0.5">📦 {item.quantidadeAtual} {item.unidade}</span>
      </button>
    )
  }

  const produtoGrid = (cols: 'mobile' | 'desktop') => {
    const itens = busca.trim() ? itensFiltrados : itensCat
    const cls = cols === 'mobile' ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
    return (
      <div className={`grid ${cls} gap-2 content-start`}>
        {itens.map(renderCardItem)}
        {itens.length === 0 && (
          <p className="text-gray-400 text-xs col-span-full text-center py-12">
            {busca.trim() ? 'Nenhum produto encontrado' : 'Nenhum produto nesta categoria'}
          </p>
        )}
      </div>
    )
  }

  const cartItemRow = (item: VendaItem) => (
    <div key={item.itemId} className="flex items-center gap-2 py-2 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.itemNome}</p>
        <p className="text-[11px] text-gray-400">R$ {item.precoUnitario.toFixed(2)} un</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => alterarQtd(item.itemId, -1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700 font-bold text-lg select-none">−</button>
        <span className="w-8 text-center text-base font-bold text-gray-800 dark:text-gray-200">{item.quantidade}</span>
        <button onClick={() => alterarQtd(item.itemId, 1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700 font-bold text-lg select-none">+</button>
      </div>
      <div className="text-sm font-bold text-gray-800 dark:text-gray-200 w-20 text-right">R$ {item.subtotal.toFixed(2)}</div>
      <button onClick={() => removerItem(item.itemId)} className="text-red-400 hover:text-red-600 w-8 h-8 flex items-center justify-center text-base">✕</button>
    </div>
  )

  /* ─────────── QUANTITY SHEET ─────────── */
  const qtdSheet = sheet.tipo === 'qtd' ? (
    <QtdSheet
      item={sheet.item}
      precoVenda={getPreco(sheet.item.id)?.precoVenda || 0}
      onClose={() => setSheet({ tipo: 'fechado' })}
      onAdd={(qtd) => {
        addAoCarrinho(sheet.item.id, sheet.item.nome, qtd, getPreco(sheet.item.id)?.precoVenda || 0)
        setSheet({ tipo: 'fechado' })
      }}
    />
  ) : null

  /* ─────────── CART SHEET (mobile) ─────────── */
  const cartSheet = (
    <div className={`lg:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${
      sheet.tipo === 'carrinho' ? 'translate-y-0' : 'translate-y-[calc(100%-72px)]'
    }`}>
      <div ref={cartSheetRef} className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.15)] border-t border-gray-200 dark:border-gray-800 max-h-[85vh] flex flex-col">
        <button onClick={() => setSheet(sheet.tipo === 'carrinho' ? { tipo: 'fechado' } : { tipo: 'carrinho' })}
          className="w-full pt-2 pb-1 flex flex-col items-center shrink-0 active:bg-gray-50 dark:active:bg-gray-800/50">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-2" />
          <div className="w-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <span className="font-bold text-gray-800 dark:text-gray-100">{qtdItens} {qtdItens === 1 ? 'item' : 'itens'}</span>
              <span className="text-[10px] text-gray-400">· {carrinho.length} {carrinho.length === 1 ? 'produto' : 'produtos'}</span>
            </div>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">R$ {total.toFixed(2)}</span>
          </div>
        </button>
        {sheet.tipo === 'carrinho' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 divide-y divide-gray-100 dark:divide-gray-800 min-h-0">
              {carrinho.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
                  <p className="text-4xl mb-2">🛒</p>
                  <p className="font-medium">Carrinho vazio</p>
                  <p className="text-xs mt-1">Toque nos produtos para adicionar</p>
                </div>
              ) : carrinho.map(cartItemRow)}
            </div>
            <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-gray-800 space-y-3 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm font-medium">Total</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">R$ {total.toFixed(2)}</span>
              </div>
              <select value={pagamento} onChange={e => setPagamento(e.target.value)}
                className="w-full px-3 py-3 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl">
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="credito">💳 Cartão Crédito</option>
                <option value="debito">💳 Cartão Débito</option>
                <option value="pix">📱 PIX</option>
              </select>
              {finalizado ? (
                <div className="text-center py-4 text-green-600 font-bold animate-pulse text-lg">✓ Venda finalizada!</div>
              ) : (
                <button onClick={finalizarVenda} disabled={carrinho.length === 0}
                  className="w-full py-4 text-base font-bold text-white bg-green-600 rounded-xl active:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  ✓ Finalizar Venda — R$ {total.toFixed(2)}
                </button>
              )}
              <button onClick={() => setSheet({ tipo: 'fechado' })}
                className="w-full text-sm text-gray-500 dark:text-gray-400 underline py-1">Continuar comprando</button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  /* ─────────── MOBILE LAYOUT ─────────── */
  const mobileLayout = (
    <div className="lg:hidden flex flex-col h-[calc(100dvh-7rem)] pb-[72px]">
      <div className="shrink-0 px-3 pt-3 pb-2 space-y-2">
        <div className="relative">
          <input ref={buscaRef} type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar produto..."
            className="w-full pl-4 pr-10 py-3 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          {busca && (
            <button onClick={() => { setBusca(''); buscaRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        {busca.trim() ? null : catPills(true)}
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {produtoGrid('mobile')}
      </div>
    </div>
  )

  /* ─────────── DESKTOP LAYOUT ─────────── */
  const desktopLayout = (
    <div className="hidden lg:flex flex-col" style={{ height: 'calc(100vh - 6rem)' }}>
      <div className="flex gap-4 min-h-0 flex-1">
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="relative">
            <input ref={buscaRef} type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="🔍 Buscar produto..."
              className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shrink-0" />
            {busca && (
              <button onClick={() => { setBusca(''); buscaRef.current?.focus() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>
          {busca.trim() ? null : catPills()}
          <div className="flex-1 overflow-y-auto">{produtoGrid('desktop')}</div>
        </div>
        <div className="w-[360px] xl:w-[400px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">🛒 Carrinho</h2>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{qtdItens} itens</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-gray-50 dark:divide-gray-800/50">
            {carrinho.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm py-12">
                <p className="text-3xl mb-2">🛒</p>
                <p>Carrinho vazio</p>
                <p className="text-xs mt-1">Clique nos produtos ao lado</p>
              </div>
            ) : carrinho.map(cartItemRow)}
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

  return (
    <>
      {desktopLayout}
      {mobileLayout}
      {cartSheet}
      {qtdSheet}
    </>
  )
}

/* ══════════════════════════════════════
   QUANTITY SHEET (bottom sheet on mobile, modal on desktop)
   ══════════════════════════════════════ */
function QtdSheet({
  item,
  precoVenda,
  onClose,
  onAdd,
}: {
  item: ItemEstoque
  precoVenda: number
  onClose: () => void
  onAdd: (qtd: number) => void
}) {
  const [qtd, setQtd] = useState(1)
  const [customMode, setCustomMode] = useState(false)
  const subtotal = qtd * precoVenda

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-full lg:max-w-md lg:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="shrink-0 px-5 pt-3 pb-1 flex justify-center lg:hidden">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="px-5 pt-2 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Adicionar ao carrinho</p>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{item.nome}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="font-semibold text-green-600 dark:text-green-400">R$ {precoVenda.toFixed(2)}</span> por {item.unidade}
                <span className="ml-2 text-gray-400">📦 {item.quantidadeAtual} disp.</span>
              </p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 text-xl shrink-0">✕</button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setQtd(q => Math.max(1, q - 1))}
              className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700 font-bold text-2xl select-none">−</button>
            <div className="flex-1 max-w-[140px]">
              {customMode ? (
                <input type="number" autoFocus value={qtd} min={1}
                  onChange={e => setQtd(Math.max(1, Number(e.target.value) || 1))}
                  onBlur={() => setCustomMode(false)}
                  className="w-full px-3 py-3 text-3xl font-bold text-center border-2 border-indigo-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl focus:outline-none" />
              ) : (
                <button onClick={() => setCustomMode(true)}
                  className="w-full px-3 py-3 text-3xl font-bold text-center border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-100 rounded-2xl active:border-indigo-400">
                  {qtd}
                </button>
              )}
            </div>
            <button onClick={() => setQtd(q => q + 1)}
              className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700 font-bold text-2xl select-none">+</button>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 text-center">Quantidade rápida</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 5, 10].map(n => (
                <button key={n} onClick={() => setQtd(n)}
                  className={`py-3 text-lg font-bold rounded-xl border-2 transition-colors ${
                    qtd === n
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 active:border-indigo-400'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm text-indigo-700 dark:text-indigo-300 font-semibold">Subtotal</span>
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">R$ {subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-gray-800 flex gap-2">
          <button onClick={onClose}
            className="px-5 py-4 text-base font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-2xl active:bg-gray-200">
            Cancelar
          </button>
          <button onClick={() => onAdd(qtd)}
            className="flex-1 py-4 text-base font-bold text-white bg-green-600 rounded-2xl active:bg-green-700">
            + Adicionar {qtd > 1 && <span className="opacity-80">({qtd})</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
