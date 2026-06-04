import { useMemo, useState } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { useValidade } from '../context/ValidadeContext'
import { ItemEstoque, TipoMovimentacao } from '../types'

type PeriodoKey = 'hoje' | 'ontem' | 'semana' | 'mes' | 'mesPassado' | 'ano' | 'tudo' | 'custom'

const PERIODOS: { value: PeriodoKey; label: string; emoji: string }[] = [
  { value: 'hoje', label: 'Hoje', emoji: '📅' },
  { value: 'ontem', label: 'Ontem', emoji: '📆' },
  { value: 'semana', label: '7 dias', emoji: '🗓' },
  { value: 'mes', label: 'Este mês', emoji: '🗓' },
  { value: 'mesPassado', label: 'Mês passado', emoji: '📋' },
  { value: 'ano', label: 'Este ano', emoji: '📊' },
  { value: 'tudo', label: 'Tudo', emoji: '♾️' },
  { value: 'custom', label: 'Personalizado', emoji: '🔍' },
]

const formatarDataInput = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const inicioFimDoDia = (d: Date) => {
  const inicio = new Date(d); inicio.setHours(0, 0, 0, 0)
  const fim = new Date(d); fim.setHours(23, 59, 59, 999)
  return { inicio, fim }
}

function calcularRange(periodo: PeriodoKey, customInicio?: string, customFim?: string): { inicio: Date; fim: Date } | null {
  const hoje = new Date()
  if (periodo === 'hoje') return inicioFimDoDia(hoje)
  if (periodo === 'ontem') { const o = new Date(hoje); o.setDate(hoje.getDate() - 1); return inicioFimDoDia(o) }
  if (periodo === 'semana') {
    const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 6)
    return { inicio: inicioFimDoDia(inicio).inicio, fim: inicioFimDoDia(hoje).fim }
  }
  if (periodo === 'mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return { inicio: inicioFimDoDia(inicio).inicio, fim: inicioFimDoDia(hoje).fim }
  }
  if (periodo === 'mesPassado') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
    return { inicio: inicioFimDoDia(inicio).inicio, fim: inicioFimDoDia(fim).fim }
  }
  if (periodo === 'ano') {
    const inicio = new Date(hoje.getFullYear(), 0, 1)
    return { inicio: inicioFimDoDia(inicio).inicio, fim: inicioFimDoDia(hoje).fim }
  }
  if (periodo === 'custom' && customInicio && customFim) {
    const i = new Date(customInicio); const f = new Date(customFim)
    return { inicio: inicioFimDoDia(i).inicio, fim: inicioFimDoDia(f).fim }
  }
  return null
}

const labelCabecalho = (iso: string, g: 'dia' | 'semana' | 'mes'): string => {
  const d = new Date(iso)
  const hoje = new Date(); const ontem = new Date(); ontem.setDate(hoje.getDate() - 1)
  const mesma = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (g === 'dia') {
    if (mesma(d, hoje)) return 'Hoje'
    if (mesma(d, ontem)) return 'Ontem'
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }
  if (g === 'semana') {
    const ini = new Date(d); ini.setDate(d.getDate() - d.getDay())
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6)
    return `Semana de ${ini.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
  }
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const motivosPerdaLabels: Record<string, string> = {
  vencido: 'Vencido',
  quebrado: 'Danificado',
  contaminado: 'Contaminado',
  extraviado: 'Extraviado',
  outro: 'Outro',
}

export default function RelatoriosPage() {
  const { todosItens } = useStock()
  const { logs } = useLog()
  const { getPreco } = usePreco()
  const { getLotesVencidos, lotes } = useValidade()

  const [periodo, setPeriodo] = useState<PeriodoKey>('mes')
  const [customInicio, setCustomInicio] = useState(formatarDataInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [customFim, setCustomFim] = useState(formatarDataInput(new Date()))
  const [expandido, setExpandido] = useState<string | null>(null)

  const range = useMemo(() => calcularRange(periodo, customInicio, customFim), [periodo, customInicio, customFim])
  const rangeDias = range ? Math.ceil((range.fim.getTime() - range.inicio.getTime()) / 86400000) + 1 : 0
  const granularidade: 'dia' | 'semana' | 'mes' = rangeDias <= 31 ? 'dia' : rangeDias <= 90 ? 'semana' : 'mes'

  const logsNoPeriodo = useMemo(() => {
    if (!range) return logs
    return logs.filter(l => {
      const t = new Date(l.data).getTime()
      return t >= range.inicio.getTime() && t <= range.fim.getTime()
    })
  }, [logs, range])

  const porTipo = useMemo(() => {
    const acc: Record<TipoMovimentacao, { qtd: number; valor: number }> = {
      entrada: { qtd: 0, valor: 0 },
      saida: { qtd: 0, valor: 0 },
      venda: { qtd: 0, valor: 0 },
      producao: { qtd: 0, valor: 0 },
      perda: { qtd: 0, valor: 0 },
      ajuste: { qtd: 0, valor: 0 },
    }
    for (const l of logsNoPeriodo) {
      const t = l.tipo as TipoMovimentacao
      if (!acc[t]) continue
      acc[t].qtd += Math.abs(l.quantidade)
      const preco = getPreco(l.itemId)
      if (t === 'venda') acc[t].valor += (preco?.precoVenda || 0) * l.quantidade
      else if (t === 'entrada') acc[t].valor += (preco?.precoCusto || 0) * l.quantidade
      else if (t === 'perda') acc[t].valor += (preco?.precoCusto || 0) * Math.abs(l.quantidade)
    }
    return acc
  }, [logsNoPeriodo, getPreco])

  const ticketMedio = porTipo.venda.qtd > 0 ? porTipo.venda.valor / porTipo.venda.qtd : 0

  const vendasPorPeriodo = useMemo(() => {
    const map = new Map<string, { qtd: number; total: number; dataRef: Date }>()
    for (const v of logsNoPeriodo) {
      if (v.tipo !== 'venda') continue
      const d = new Date(v.data)
      let chave = ''
      let dataRef: Date
      if (granularidade === 'dia') {
        chave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        dataRef = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      } else if (granularidade === 'semana') {
        const ini = new Date(d); ini.setDate(d.getDate() - d.getDay()); ini.setHours(0, 0, 0, 0)
        chave = `s${ini.getTime()}`
        dataRef = ini
      } else {
        chave = `${d.getFullYear()}-${d.getMonth()}`
        dataRef = new Date(d.getFullYear(), d.getMonth(), 1)
      }
      if (!map.has(chave)) map.set(chave, { qtd: 0, total: 0, dataRef })
      const item = map.get(chave)!
      item.qtd += v.quantidade
      const preco = getPreco(v.itemId)
      item.total += (preco?.precoVenda || 0) * v.quantidade
    }
    return Array.from(map.values()).sort((a, b) => b.dataRef.getTime() - a.dataRef.getTime())
  }, [logsNoPeriodo, getPreco, granularidade])

  const topVendidos = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; valor: number }>()
    for (const v of logsNoPeriodo) {
      if (v.tipo !== 'venda') continue
      if (!map.has(v.itemId)) map.set(v.itemId, { nome: v.itemNome, qtd: 0, valor: 0 })
      const item = map.get(v.itemId)!
      item.qtd += v.quantidade
      const preco = getPreco(v.itemId)
      item.valor += (preco?.precoVenda || 0) * v.quantidade
    }
    return Array.from(map.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 5)
  }, [logsNoPeriodo, getPreco])

  const maxVendido = topVendidos[0]?.qtd || 1

  const topPerdas = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; valor: number; motivos: Record<string, number> }>()
    for (const p of logsNoPeriodo) {
      if (p.tipo !== 'perda') continue
      if (!map.has(p.itemId)) map.set(p.itemId, { nome: p.itemNome, qtd: 0, valor: 0, motivos: {} })
      const item = map.get(p.itemId)!
      item.qtd += Math.abs(p.quantidade)
      const preco = getPreco(p.itemId)
      item.valor += (preco?.precoCusto || 0) * Math.abs(p.quantidade)
      const motivo = (p.motivo || 'outro').split(':')[0].trim()
      item.motivos[motivo] = (item.motivos[motivo] || 0) + 1
    }
    return Array.from(map.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 5)
  }, [logsNoPeriodo, getPreco])

  const entradasPorOrigem = useMemo(() => {
    const map = new Map<string, { qtd: number; valor: number }>()
    for (const e of logsNoPeriodo) {
      if (e.tipo !== 'entrada') continue
      const key = e.origem || 'Não informada'
      if (!map.has(key)) map.set(key, { qtd: 0, valor: 0 })
      const item = map.get(key)!
      item.qtd += e.quantidade
      const preco = getPreco(e.itemId)
      item.valor += (preco?.precoCusto || 0) * e.quantidade
    }
    return Array.from(map.entries()).map(([origem, v]) => ({ origem, ...v })).sort((a, b) => b.qtd - a.qtd)
  }, [logsNoPeriodo, getPreco])

  const itensCriticos = useMemo(() => todosItens.filter(i => i.alerta === 'critico'), [todosItens])
  const itensBaixo = useMemo(() => todosItens.filter(i => i.alerta === 'baixo'), [todosItens])
  const listaCompras = useMemo(() => [...itensCriticos, ...itensBaixo], [itensCriticos, itensBaixo])

  const comprasPorCategoria = useMemo(() => {
    const grupos: Record<string, ItemEstoque[]> = {}
    for (const item of listaCompras) {
      const cat = item.categoria || 'outros'
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(item)
    }
    return grupos
  }, [listaCompras])

  const custoTotalCompras = useMemo(() => {
    return listaCompras.reduce((s, i) => s + (getPreco(i.id)?.precoCusto || 0) * (i.quantidadeMinima - i.quantidadeAtual), 0)
  }, [listaCompras, getPreco])

  const totalMovimentacoes = logsNoPeriodo.length
  const totalItens = porTipo.venda.qtd + porTipo.entrada.qtd + porTipo.perda.qtd + porTipo.producao.qtd
  const temDados = totalMovimentacoes > 0 || listaCompras.length > 0

  const cardGrande = (emoji: string, titulo: string, subtitulo: string, qtd: number, unidadeLabel: string, valor: number, cor: string, bgCor: string, ringCor: string) => (
    <div className={`relative overflow-hidden rounded-2xl border-2 ${cor} ${bgCor} p-4 md:p-5`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${ringCor}`}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">{titulo}</p>
          <p className="text-3xl md:text-4xl font-bold mt-0.5">{qtd}</p>
          <p className="text-[11px] opacity-70 mt-0.5">{unidadeLabel}</p>
          {valor > 0 && (
            <p className="text-sm font-semibold mt-2 pt-2 border-t border-current/10">
              {titulo === 'Vendas' ? '💵' : titulo === 'Entradas' ? '🛒' : '💸'} R$ {valor.toFixed(2)}
            </p>
          )}
        </div>
      </div>
      <p className="text-[10px] opacity-60 mt-2 italic">{subtitulo}</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">📊 Relatórios</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Visão geral do período, top produtos, perdas e lista de compras sugerida.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">📆 Período:</span>
          {PERIODOS.map(p => (
            <button key={p.value} onClick={() => setPeriodo(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                periodo === p.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        {periodo === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">De</label>
              <input type="date" value={customInicio} max={customFim}
                onChange={e => setCustomInicio(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Até</label>
              <input type="date" value={customFim} min={customInicio} max={formatarDataInput(new Date())}
                onChange={e => setCustomFim(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <p className="text-[10px] text-gray-400 pb-1.5">📊 {rangeDias} dia{rangeDias !== 1 ? 's' : ''} no período</p>
          </div>
        )}
      </div>

      {!temDados ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium text-gray-600 dark:text-gray-300">Nenhum dado disponível ainda</p>
          <p className="text-xs text-gray-400 mt-1">Registre vendas no <strong>PDV</strong>, produções em <strong>Produção</strong>, ou movimentações em <strong>Movimentações</strong> para começar a gerar relatórios.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {cardGrande('💰', 'Vendas', 'Itens vendidos no PDV', porTipo.venda.qtd, 'transações no período', porTipo.venda.valor,
              'text-blue-700 dark:text-blue-300', 'bg-blue-50 dark:bg-blue-950/40', 'bg-blue-100 dark:bg-blue-900/50')}
            {cardGrande('🏭', 'Produções', 'MPs transformadas em produtos', porTipo.producao.qtd, 'lotes produzidos', 0,
              'text-indigo-700 dark:text-indigo-300', 'bg-indigo-50 dark:bg-indigo-950/40', 'bg-indigo-100 dark:bg-indigo-900/50')}
            {cardGrande('🗑️', 'Perdas', 'Itens danificados ou vencidos', porTipo.perda.qtd, 'registros no período', porTipo.perda.valor,
              'text-orange-700 dark:text-orange-300', 'bg-orange-50 dark:bg-orange-950/40', 'bg-orange-100 dark:bg-orange-900/50')}
            {cardGrande('📥', 'Entradas', 'Mercadoria recebida', porTipo.entrada.qtd, 'registros no período', porTipo.entrada.valor,
              'text-green-700 dark:text-green-300', 'bg-green-50 dark:bg-green-950/40', 'bg-green-100 dark:bg-green-900/50')}
          </div>

          {porTipo.venda.qtd > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-2xl border-2 border-blue-200 dark:border-blue-900 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎯</span>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Indicadores de Vendas</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Faturamento</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-300">R$ {porTipo.venda.valor.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Itens vendidos</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-300">{porTipo.venda.qtd}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Ticket médio</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-300">R$ {ticketMedio.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {vendasPorPeriodo.length > 0 && (
            <details open className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group">
              <summary className="cursor-pointer list-none px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📈</span>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Vendas por {granularidade === 'dia' ? 'Dia' : granularidade === 'semana' ? 'Semana' : 'Mês'}</h2>
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{vendasPorPeriodo.length} período(s)</span>
                </div>
                <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Período</th>
                      <th className="text-right px-4 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Itens Vendidos</th>
                      <th className="text-right px-4 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Faturamento</th>
                      <th className="text-right px-4 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs hidden sm:table-cell">% do total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {vendasPorPeriodo.map((d, i) => {
                      const itemKey = `v${i}`
                      const totalFaturamento = vendasPorPeriodo.reduce((s, x) => s + x.total, 0)
                      const pct = totalFaturamento > 0 ? (d.total / totalFaturamento) * 100 : 0
                      return (
                        <tr key={itemKey} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-2 text-gray-800 dark:text-gray-200 capitalize">{labelCabecalho(d.dataRef.toISOString(), granularidade)}</td>
                          <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">{d.qtd}</td>
                          <td className="px-4 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">R$ {d.total.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right hidden sm:table-cell">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-500 w-9 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">TOTAL</td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-gray-800 dark:text-gray-200">{vendasPorPeriodo.reduce((s, x) => s + x.qtd, 0)}</td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-blue-600 dark:text-blue-400">R$ {vendasPorPeriodo.reduce((s, x) => s + x.total, 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-xs text-gray-400 hidden sm:table-cell">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </details>
          )}

          {topVendidos.length > 0 && (
            <details open className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group">
              <summary className="cursor-pointer list-none px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Top 5 Mais Vendidos</h2>
                </div>
                <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 md:p-5 space-y-2">
                {topVendidos.map((p, i) => (
                  <div key={p.nome} className="flex items-center gap-3">
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{p.qtd} un</p>
                          <p className="text-[10px] text-gray-500">R$ {p.valor.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${(p.qtd / maxVendido) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {topPerdas.length > 0 && (
            <details open className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group">
              <summary className="cursor-pointer list-none px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗑️</span>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Top Perdas</h2>
                  <span className="text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full">{topPerdas.length} item(ns)</span>
                </div>
                <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 md:p-5 space-y-2">
                {topPerdas.map(p => (
                  <div key={p.nome} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(p.motivos).map(([m, n]) => (
                          <span key={m} className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{motivosPerdaLabels[m] || m} ×{n}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{p.qtd} un</p>
                      {p.valor > 0 && <p className="text-[10px] text-gray-500">R$ {p.valor.toFixed(2)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {entradasPorOrigem.length > 0 && (
            <details open className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group">
              <summary className="cursor-pointer list-none px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📥</span>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Entradas por Origem</h2>
                </div>
                <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 md:p-5 space-y-1">
                {entradasPorOrigem.map(o => (
                  <div key={o.origem} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏷️</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{o.origem}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">{o.qtd} un</p>
                      {o.valor > 0 && <p className="text-[10px] text-gray-500">R$ {o.valor.toFixed(2)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {listaCompras.length > 0 && (
            <details open className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group">
              <summary className="cursor-pointer list-none px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛒</span>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Lista de Compras Sugerida</h2>
                  <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{listaCompras.length} item(ns) · R$ {custoTotalCompras.toFixed(2)}</span>
                </div>
                <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 md:p-5 space-y-3">
                {Object.entries(comprasPorCategoria).map(([categoria, itens]) => {
                  const isExpandido = expandido === categoria
                  return (
                    <div key={categoria}>
                      <button onClick={() => setExpandido(isExpandido ? null : categoria)}
                        className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{isExpandido ? '▼' : '▶'}</span>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">{categoria.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] text-gray-500">({itens.length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {itens.some(i => i.alerta === 'critico') && (
                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded-full">🔴 {itens.filter(i => i.alerta === 'critico').length}</span>
                          )}
                          {itens.some(i => i.alerta === 'baixo') && (
                            <span className="text-[10px] font-semibold text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 px-1.5 py-0.5 rounded-full">🟡 {itens.filter(i => i.alerta === 'baixo').length}</span>
                          )}
                        </div>
                      </button>
                      {isExpandido && (
                        <div className="mt-2 space-y-1.5 pl-3">
                          {itens.map(item => {
                            const sugestao = Math.max(0, item.quantidadeMinima - item.quantidadeAtual)
                            const custoCompra = (getPreco(item.id)?.precoCusto || 0) * sugestao
                            return (
                              <div key={item.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${item.alerta === 'critico' ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'}`}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`shrink-0 w-2 h-2 rounded-full ${item.alerta === 'critico' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.nome}</p>
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-0.5 ml-4">
                                    Atual: <span className="font-semibold">{item.quantidadeAtual} {item.unidade}</span> · Mínimo: {item.quantidadeMinima} {item.unidade}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                  <p className="text-[10px] text-gray-500 uppercase">Comprar</p>
                                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">+{sugestao} {item.unidade}</p>
                                  {custoCompra > 0 && <p className="text-[10px] text-gray-500">≈ R$ {custoCompra.toFixed(2)}</p>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </details>
          )}

          {(() => {
            const lotesVencidos = getLotesVencidos()
            const lotesAVencer = lotes.filter(l => {
              const hoje = new Date()
              const limite = new Date(hoje.getTime() + 15 * 86400000)
              const val = new Date(l.dataValidade)
              return val > hoje && val <= limite
            })
            if (lotesVencidos.length === 0 && lotesAVencer.length === 0) return null
            return (
              <details className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group">
                <summary className="cursor-pointer list-none px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Validades</h2>
                    {lotesVencidos.length > 0 && (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">🔴 {lotesVencidos.length} vencido(s)</span>
                    )}
                    {lotesAVencer.length > 0 && (
                      <span className="text-[10px] font-semibold text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 px-2 py-0.5 rounded-full">🟡 {lotesAVencer.length} a vencer</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-4 md:p-5 space-y-2">
                  {lotesVencidos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-2">🔴 Vencidos</p>
                      {lotesVencidos.map(l => (
                        <div key={l.id} className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-950/20 rounded-lg mb-1.5">
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{l.itemNome}</p>
                            <p className="text-[11px] text-gray-500">{l.quantidade} {l.unidade} · lote {l.id.slice(0, 8)}</p>
                          </div>
                          <p className="text-xs text-red-600 font-semibold">Venceu: {new Date(l.dataValidade).toLocaleDateString('pt-BR')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {lotesAVencer.length > 0 && (
                    <div className={lotesVencidos.length > 0 ? 'mt-3' : ''}>
                      <p className="text-xs font-semibold text-yellow-600 mb-2">🟡 Próximos 15 dias</p>
                      {lotesAVencer.slice(0, 10).map(l => (
                        <div key={l.id} className="flex items-center justify-between p-2 bg-yellow-50/50 dark:bg-yellow-950/20 rounded-lg mb-1.5">
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{l.itemNome}</p>
                            <p className="text-[11px] text-gray-500">{l.quantidade} {l.unidade} · lote {l.id.slice(0, 8)}</p>
                          </div>
                          <p className="text-xs text-yellow-600 font-semibold">{new Date(l.dataValidade).toLocaleDateString('pt-BR')}</p>
                        </div>
                      ))}
                      {lotesAVencer.length > 10 && <p className="text-[10px] text-gray-400 text-center">+{lotesAVencer.length - 10} mais...</p>}
                    </div>
                  )}
                </div>
              </details>
            )
          })()}

          {totalItens === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-gray-500">Nenhuma movimentação no período selecionado.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
