import { useMemo, useState, useRef, useEffect } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { useGastos } from '../context/GastosContext'
import { DESPESA_TIPOS, DespesaTipo } from '../types'
import { chatCompletionWithRetry, Message } from '../services/openrouter'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

type Periodo = 'hoje' | 'ontem' | 'semana' | 'mes' | 'mesPassado' | 'ano' | 'total' | 'custom'
type Granularidade = 'hora' | 'dia' | 'semana' | 'mes'
type Aba = 'resumo' | 'inteligencia'

const API_KEY_STORAGE = 'openrouter_key'

const MOTIVOS_PERDA_LABELS: Record<string, string> = {
  vencido: 'Vencido', quebrado: 'Danificado', contaminado: 'Contaminado', extraviado: 'Extraviado', outro: 'Outro',
}

function inicioFimDoDia(d: Date) {
  const inicio = new Date(d); inicio.setHours(0, 0, 0, 0)
  const fim = new Date(d); fim.setHours(23, 59, 59, 999)
  return { inicio, fim }
}

function getPeriodo(t: Periodo, customInicio?: string, customFim?: string, horaIni?: string, horaFim?: string): { inicio: Date; fim: Date } {
  const agora = new Date()
  if (t === 'hoje') {
    const { inicio, fim } = inicioFimDoDia(agora)
    if (horaIni && horaFim) { const [h1, m1] = horaIni.split(':').map(Number); const [h2, m2] = horaFim.split(':').map(Number); inicio.setHours(h1, m1, 0, 0); fim.setHours(h2, m2, 59, 999) }
    return { inicio, fim }
  }
  if (t === 'ontem') {
    const o = new Date(agora); o.setDate(agora.getDate() - 1)
    return inicioFimDoDia(o)
  }
  if (t === 'semana') {
    const inicio = new Date(agora); inicio.setDate(agora.getDate() - 6)
    return { inicio: inicioFimDoDia(inicio).inicio, fim: inicioFimDoDia(agora).fim }
  }
  if (t === 'mes') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
    return { inicio: inicioFimDoDia(inicio).inicio, fim: inicioFimDoDia(agora).fim }
  }
  if (t === 'mesPassado') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    const fim = new Date(agora.getFullYear(), agora.getMonth(), 0)
    return { inicio: inicioFimDoDia(inicio).inicio, fim: inicioFimDoDia(fim).fim }
  }
  if (t === 'ano') {
    const inicio = new Date(agora.getFullYear(), 0, 1)
    return { inicio: inicioFimDoDia(inicio).inicio, fim: inicioFimDoDia(agora).fim }
  }
  if (t === 'custom' && customInicio && customFim) {
    const i = new Date(customInicio + 'T00:00:00')
    const f = new Date(customFim + 'T23:59:59')
    if (horaIni && horaFim) { const [h1, m1] = horaIni.split(':').map(Number); const [h2, m2] = horaFim.split(':').map(Number); i.setHours(h1, m1, 0, 0); f.setHours(h2, m2, 59, 999) }
    return { inicio: i, fim: f }
  }
  return { inicio: new Date('2000-01-01'), fim: new Date('2099-12-31') }
}

function diasDoMes(ano: number, mes: number): string[] {
  const dias: string[] = []
  const ultimo = new Date(ano, mes, 0).getDate()
  for (let i = 1; i <= ultimo; i++) {
    dias.push(`${ano}-${String(mes).padStart(2, '0')}-${String(i).padStart(2, '0')}`)
  }
  return dias
}

function getSemanaPassada(): string[] {
  const dias: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dias.push(d.toISOString().slice(0, 10))
  }
  return dias
}

const markdownComponents = {
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>
  ),
  th: ({ children }: any) => (
    <th className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-left font-semibold text-gray-600 dark:text-gray-300">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-gray-700 dark:text-gray-300">{children}</td>
  ),
  code: ({ className, children }: any) => {
    const isInline = !className
    if (isInline) return <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">{children}</code>
    return <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>{children}</code></pre>
  },
  ul: ({ children }: any) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
  h1: ({ children }: any) => <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-3 mb-1">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mt-3 mb-1">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-2 mb-1">{children}</h3>,
  p: ({ children }: any) => <p className="text-sm mb-1 last:mb-0 leading-relaxed text-gray-800 dark:text-gray-200">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
}

export default function FinanceiroPage() {
  const { todosItens } = useStock()
  const { logs } = useLog()
  const { precos } = usePreco()
  const { despesas } = useGastos()
  const [periodoAtivo, setPeriodoAtivo] = useState<Periodo>('mes')
  const [granularidade, setGranularidade] = useState<Granularidade>('dia')
  const [customInicio, setCustomInicio] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` })
  const [customFim, setCustomFim] = useState(() => new Date().toISOString().slice(0, 10))
  const [usarHorario, setUsarHorario] = useState(false)
  const [horaIni, setHoraIni] = useState('08:00')
  const [horaFim, setHoraFim] = useState('22:00')
  const [sortLucroProd, setSortLucroProd] = useState<'lucro' | 'receita' | 'margem' | 'qtd'>('lucro')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [aba, setAba] = useState<Aba>('resumo')

  // ── Financeiro IA ──
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '')
  const [keyInput, setKeyInput] = useState(apiKey)
  const [aiMessages, setAiMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiConversation, setAiConversation] = useState<Message[]>([])
  const aiEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [aiMessages])

  const { inicio, fim } = useMemo(() => getPeriodo(periodoAtivo, customInicio, customFim, usarHorario ? horaIni : undefined, usarHorario ? horaFim : undefined), [periodoAtivo, customInicio, customFim, usarHorario, horaIni, horaFim])
  const hoje = new Date().toISOString().slice(0, 10)
  const mesAtual = hoje.slice(0, 7)

  const vendas = useMemo(() => logs.filter(l => l.tipo === 'venda'), [logs])

  const inicioStr = inicio.toISOString()
  const fimStr = fim.toISOString()

  const vendasNoPeriodo = useMemo(() =>
    vendas.filter(l => {
      const t = new Date(l.data).getTime()
      return t >= inicio.getTime() && t <= fim.getTime()
    }),
  [vendas, inicio, fim])

  const perdasLogsNoPeriodo = useMemo(() =>
    logs.filter(l => {
      if (l.tipo !== 'perda') return false
      const t = new Date(l.data).getTime()
      return t >= inicio.getTime() && t <= fim.getTime()
    }),
  [logs, inicio, fim])

  const receita = useMemo(() =>
    vendasNoPeriodo.reduce((s, v) => s + ((precos.find(p => p.itemId === v.itemId)?.precoVenda || 0)) * v.quantidade, 0),
  [vendasNoPeriodo, precos])

  const custoMercadorias = useMemo(() =>
    vendasNoPeriodo.reduce((s, v) => s + ((precos.find(p => p.itemId === v.itemId)?.precoCusto || 0)) * v.quantidade, 0),
  [vendasNoPeriodo, precos])

  const perdasNoPeriodo = useMemo(() =>
    perdasLogsNoPeriodo.reduce((s, l) => s + ((precos.find(p => p.itemId === l.itemId)?.precoCusto || 0)) * Math.abs(l.quantidade), 0),
  [perdasLogsNoPeriodo, precos])

  const despesasNoPeriodo = useMemo(() =>
    despesas.filter(d => d.data >= inicioStr.slice(0, 10) && d.data <= fimStr.slice(0, 10)).reduce((s, d) => s + d.valor, 0),
  [despesas, inicioStr, fimStr])

  const totalDespesas = despesasNoPeriodo + perdasNoPeriodo

  const despesasPorTipo = useMemo(() => {
    const filtradas = despesas.filter(d => d.data >= inicioStr.slice(0, 10) && d.data <= fimStr.slice(0, 10))
    const map = new Map<string, number>()
    for (const d of filtradas) map.set(d.tipo, (map.get(d.tipo) || 0) + d.valor)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [despesas, inicioStr, fimStr])

  const totais = useMemo(() => {
    const lucroBruto = receita - custoMercadorias
    const lucroLiquido = lucroBruto - totalDespesas
    const margemBruta = receita > 0 ? (lucroBruto / receita) * 100 : 0
    const margemLiquida = receita > 0 ? (lucroLiquido / receita) * 100 : 0
    return { lucroBruto, lucroLiquido, margemBruta, margemLiquida }
  }, [receita, custoMercadorias, totalDespesas])

  const custoEstoque = useMemo(() =>
    todosItens.reduce((s, i) => s + ((precos.find(p => p.itemId === i.id)?.precoCusto || 0)) * i.quantidadeAtual, 0),
  [todosItens, precos])

  // ── Daily trend (últimos 14 dias) ──
  const dias14 = getSemanaPassada()
  const trendDiario = useMemo(() => dias14.map(dia => {
    const vd = vendas.filter(v => (v.data || '').slice(0, 10) === dia)
    const rec = vd.reduce((s, v) => s + ((precos.find(p => p.itemId === v.itemId)?.precoVenda || 0)) * v.quantidade, 0)
    const cust = vd.reduce((s, v) => s + ((precos.find(p => p.itemId === v.itemId)?.precoCusto || 0)) * v.quantidade, 0)
    return { dia, receita: rec, custo: cust }
  }), [dias14, vendas, precos])
  const maxDiario = Math.max(...trendDiario.map(d => d.receita), 1)

  // ── Top produtos ──
  const topProdutos = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; receita: number; custo: number }>()
    for (const v of vendasNoPeriodo) {
      const p = precos.find(p => p.itemId === v.itemId)
      const item = todosItens.find(i => i.id === v.itemId)
      const existing = map.get(v.itemId)
      if (existing) {
        existing.qtd += v.quantidade
        existing.receita += (p?.precoVenda || 0) * v.quantidade
        existing.custo += (p?.precoCusto || 0) * v.quantidade
      } else {
        map.set(v.itemId, {
          nome: item?.nome || v.itemNome || v.itemId,
          qtd: v.quantidade,
          receita: (p?.precoVenda || 0) * v.quantidade,
          custo: (p?.precoCusto || 0) * v.quantidade,
        })
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1].receita - a[1].receita).slice(0, 5)
  }, [vendasNoPeriodo, precos, todosItens])
  const maxTop = Math.max(...topProdutos.map(([, v]) => v.receita), 1)

  // ── Dados para gráficos Recharts ──
  const trendDiarioChart = useMemo(() => trendDiario.map(d => ({
    dia: d.dia.slice(5),
    Receita: Number(d.receita.toFixed(2)),
    Custo: Number(d.custo.toFixed(2)),
    Lucro: Number((d.receita - d.custo).toFixed(2)),
  })), [trendDiario])

  const despesasPieChart = useMemo(() => despesasPorTipo.map(([tipo, valor]) => {
    const info = DESPESA_TIPOS.find(dt => dt.value === tipo)
    return {
      name: info?.label || tipo,
      value: Number(valor.toFixed(2)),
      icone: info?.icone || '💰',
    }
  }), [despesasPorTipo])

  const topProdutosChart = useMemo(() => topProdutos.slice(0, 8).map(([id, info]) => {
    const item = todosItens.find(i => i.id === id)
    return {
      nome: item?.nome?.slice(0, 14) || id,
      Receita: Number(info.receita.toFixed(2)),
      Lucro: Number((info.receita - info.custo).toFixed(2)),
    }
  }), [topProdutos, todosItens])

  const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

  const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  const periodos: { id: Periodo; label: string; emoji: string }[] = [
    { id: 'hoje', label: 'Hoje', emoji: '📅' },
    { id: 'ontem', label: 'Ontem', emoji: '📆' },
    { id: 'semana', label: '7 dias', emoji: '🗓' },
    { id: 'mes', label: 'Este mês', emoji: '🗓' },
    { id: 'mesPassado', label: 'Mês passado', emoji: '📋' },
    { id: 'ano', label: 'Este ano', emoji: '📊' },
    { id: 'total', label: 'Tudo', emoji: '♾️' },
    { id: 'custom', label: 'Personalizado', emoji: '🔍' },
  ]
  const periodoLabel = periodos.find(p => p.id === periodoAtivo)?.label || ''

  // ── Lucro por produto (completo, ordenável) ──
  const lucroPorProduto = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; receita: number; custo: number; unidade: string }>()
    for (const v of vendasNoPeriodo) {
      const p = precos.find(p => p.itemId === v.itemId)
      const item = todosItens.find(i => i.id === v.itemId)
      const ex = map.get(v.itemId)
      const receitaAdd = (p?.precoVenda || 0) * v.quantidade
      const custoAdd = (p?.precoCusto || 0) * v.quantidade
      if (ex) { ex.qtd += v.quantidade; ex.receita += receitaAdd; ex.custo += custoAdd }
      else map.set(v.itemId, { nome: item?.nome || v.itemNome || v.itemId, qtd: v.quantidade, receita: receitaAdd, custo: custoAdd, unidade: item?.unidade || 'un' })
    }
    const arr = Array.from(map.entries()).map(([id, v]) => ({ id, ...v, lucro: v.receita - v.custo, margem: v.custo > 0 ? ((v.receita - v.custo) / v.custo) * 100 : 0 }))
    arr.sort((a, b) => {
      const av = a[sortLucroProd]; const bv = b[sortLucroProd]
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })
    return arr
  }, [vendasNoPeriodo, precos, todosItens, sortLucroProd, sortDir])

  // ── Análise por horário (vendas agrupadas por hora do dia 0-23) ──
  const porHorario = useMemo(() => {
    const buckets: { hora: number; receita: number; custo: number; lucro: number; qtd: number; transacoes: number }[] = []
    for (let h = 0; h < 24; h++) buckets.push({ hora: h, receita: 0, custo: 0, lucro: 0, qtd: 0, transacoes: 0 })
    for (const v of vendasNoPeriodo) {
      const h = new Date(v.data).getHours()
      const p = precos.find(p => p.itemId === v.itemId)
      const r = (p?.precoVenda || 0) * v.quantidade
      const c = (p?.precoCusto || 0) * v.quantidade
      buckets[h].receita += r
      buckets[h].custo += c
      buckets[h].lucro += r - c
      buckets[h].qtd += v.quantidade
      buckets[h].transacoes += 1
    }
    return buckets
  }, [vendasNoPeriodo, precos])
  const maxHorario = Math.max(...porHorario.map(b => b.receita), 1)

  // ── Análise por granularidade (dia/semana/mês) ──
  const porGranularidade = useMemo(() => {
    const map = new Map<string, { chave: string; dataRef: Date; receita: number; custo: number; lucro: number; transacoes: number }>()
    for (const v of vendasNoPeriodo) {
      const d = new Date(v.data)
      let chave = ''
      let dataRef: Date
      if (granularidade === 'hora') {
        chave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
        dataRef = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours())
      } else if (granularidade === 'dia') {
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
      if (!map.has(chave)) map.set(chave, { chave, dataRef, receita: 0, custo: 0, lucro: 0, transacoes: 0 })
      const item = map.get(chave)!
      const p = precos.find(p => p.itemId === v.itemId)
      const r = (p?.precoVenda || 0) * v.quantidade
      const c = (p?.precoCusto || 0) * v.quantidade
      item.receita += r; item.custo += c; item.lucro += r - c; item.transacoes += 1
    }
    return Array.from(map.values()).sort((a, b) => b.dataRef.getTime() - a.dataRef.getTime())
  }, [vendasNoPeriodo, precos, granularidade])
  const maxGran = Math.max(...porGranularidade.map(g => g.receita), 1)

  const labelGranularidade = (dataRef: Date): string => {
    if (granularidade === 'hora') return dataRef.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    if (granularidade === 'dia') {
      const hoje = new Date(); const ontem = new Date(); ontem.setDate(hoje.getDate() - 1)
      const m = (a: Date, b: Date) => a.toDateString() === b.toDateString()
      if (m(dataRef, hoje)) return 'Hoje'
      if (m(dataRef, ontem)) return 'Ontem'
      return dataRef.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    }
    if (granularidade === 'semana') {
      const fim = new Date(dataRef); fim.setDate(dataRef.getDate() + 6)
      return `${dataRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
    }
    return dataRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  // ── Perdas detalhadas (por item + motivo) ──
  const perdasDetalhadas = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; valor: number; motivos: Record<string, number> }>()
    for (const p of perdasLogsNoPeriodo) {
      if (!map.has(p.itemId)) map.set(p.itemId, { nome: p.itemNome, qtd: 0, valor: 0, motivos: {} })
      const item = map.get(p.itemId)!
      item.qtd += Math.abs(p.quantidade)
      const preco = precos.find(pp => pp.itemId === p.itemId)
      item.valor += (preco?.precoCusto || 0) * Math.abs(p.quantidade)
      const motivo = (p.motivo || 'outro').split(':')[0].trim()
      item.motivos[motivo] = (item.motivos[motivo] || 0) + 1
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.valor - a.valor)
  }, [perdasLogsNoPeriodo, precos])

  const sugestoesFinanceiras = [
    'Analise minhas finanças do mês',
    'Quanto estou gastando com despesas fixas?',
    'Qual produto dá mais lucro?',
    'Como posso aumentar minha margem?',
    'Devo aumentar o preço de algum produto?',
    'Resumo financeiro completo',
  ]

  // ── Financeiro IA: system prompt ──
  function gerarPromptFinanceiro(): string {
    const vendasMes = logs.filter(l => l.tipo === 'venda' && (l.data || '').startsWith(mesAtual))
    const receitaMes = vendasMes.reduce((s, v) => s + ((precos.find(p => p.itemId === v.itemId)?.precoVenda || 0)) * v.quantidade, 0)
    const custoMes = vendasMes.reduce((s, v) => s + ((precos.find(p => p.itemId === v.itemId)?.precoCusto || 0)) * v.quantidade, 0)
    const despMes = despesas.filter(d => d.data.startsWith(mesAtual)).reduce((s, d) => s + d.valor, 0)

    const top = [...new Map(vendasMes.map(v => {
      const p = precos.find(p => p.itemId === v.itemId)
      return [v.itemId, { nome: v.itemNome, receita: (p?.precoVenda || 0) * v.quantidade, custo: (p?.precoCusto || 0) * v.quantidade }]
    }).entries())]

    return `Você é um consultor financeiro especializado em sorveterias e açaíterias.
Data: ${hoje} | Mês: ${mesAtual}

## RESUMO FINANCEIRO DO MÊS
- Receita: R$ ${receitaMes.toFixed(2)}
- Custo dos produtos: R$ ${custoMes.toFixed(2)}
- Lucro bruto: R$ ${(receitaMes - custoMes).toFixed(2)}
- Margem bruta: ${receitaMes > 0 ? ((receitaMes - custoMes) / receitaMes * 100).toFixed(0) : 0}%
- Despesas (total): R$ ${despMes.toFixed(2)}
- Lucro líquido: R$ ${(receitaMes - custoMes - despMes).toFixed(2)}

## DESPESAS POR TIPO
${despesas.filter(d => d.data.startsWith(mesAtual)).map(d => `- ${DESPESA_TIPOS.find(t => t.value === d.tipo)?.icone} ${DESPESA_TIPOS.find(t => t.value === d.tipo)?.label || d.tipo}: R$ ${d.valor.toFixed(2)} (${d.descricao})`).join('\n')}

## PRODUTOS
${todosItens.map(i => {
  const p = precos.find(p => p.itemId === i.id)
  if (!p) return `- ${i.nome}: sem preço cadastrado`
  const margem = p.precoCusto > 0 ? ((p.precoVenda - p.precoCusto) / p.precoCusto * 100).toFixed(0) : 'N/A'
  return `- ${i.nome}: Custo R$ ${p.precoCusto.toFixed(2)} | Venda R$ ${p.precoVenda.toFixed(2)} | Margem ${margem}% | Estoque: ${i.quantidadeAtual} ${i.unidade}`
}).join('\n')}

## TOTAL DE VENDAS NO MÊS
${vendasMes.length} vendas registradas

## SUA FUNÇÃO
- Você é um CONSULTOR financeiro que analisa dados e DÁ RECOMENDAÇÕES
- Analise margens de lucro e sugira ajustes de preço quando necessário
- Identifique despesas que estão pesando e sugira cortes
- Dê dicas para melhorar a lucratividade
- SEJA PROATIVO e dê insights sem o usuário precisar pedir
- SEMPRE use Markdown para formatar suas respostas
- Se o usuário perguntar sobre algo que você não tem dados, peça para ele cadastrar primeiro
- Use emojis para tornar a análise visual: 📈 receita, 💸 despesas, 📊 lucro, ⚠️ alertas, ✅ boas notícias`
  }

  async function enviarFinanceiro() {
    const text = aiInput.trim()
    if (!text || aiLoading || !apiKey) return
    setAiInput('')
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: text, timestamp: new Date() }
    setAiMessages(prev => [...prev, userMsg])
    setAiLoading(true)
    try {
      const history: Message[] = [
        { role: 'system', content: gerarPromptFinanceiro() },
        ...aiConversation,
        { role: 'user', content: text },
      ]
      const result = await chatCompletionWithRetry({ messages: history, tools: [], apiKey })
      const content = result.message.content || 'Pronto!'
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'assistant' as const, content, timestamp: new Date() }
      setAiMessages(prev => [...prev, aiMsg])
      setAiConversation([...aiConversation, { role: 'user', content: text }, { role: 'assistant', content }])
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      setAiMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: `❌ ${errorMsg}`, timestamp: new Date() }])
    } finally { setAiLoading(false) }
  }

  function salvarKey() {
    const trimmed = keyInput.trim()
    setApiKey(trimmed)
    localStorage.setItem(API_KEY_STORAGE, trimmed)
  }

  return (
    <div className="space-y-4">
      {/* Abas: Resumo | Inteligência */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        <button onClick={() => setAba('resumo')}
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            aba === 'resumo' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'
          }`}>📊 Resumo</button>
        <button onClick={() => setAba('inteligencia')}
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
            aba === 'inteligencia' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'
          }`}>🧠 Inteligência Financeira</button>
      </div>

      {aba === 'resumo' && (
        <>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">📈 Resumo Financeiro</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Receita, custo, margens, tendência diária e top produtos. ⚠️ <strong>Se está tudo R$ 0, cadastre os preços em Estoque &gt; Preços.</strong>
            </p>
          </div>

          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
            {periodos.map(p => (
              <button key={p.id} onClick={() => setPeriodoAtivo(p.id)}
                className={`flex-1 px-2.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center justify-center gap-1 ${
                  periodoAtivo === p.id
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {(periodoAtivo === 'custom' || usarHorario) && (
            <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              {periodoAtivo === 'custom' && (
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">De</label>
                    <input type="date" value={customInicio} max={customFim}
                      onChange={e => setCustomInicio(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Até</label>
                    <input type="date" value={customFim} min={customInicio}
                      onChange={e => setCustomFim(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </>
              )}
              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={usarHorario} onChange={e => setUsarHorario(e.target.checked)}
                  className="w-3.5 h-3.5 accent-indigo-600" />
                <span>⏰ Filtrar por horário</span>
              </label>
              {usarHorario && (
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Hora inicial</label>
                    <input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Hora final</label>
                    <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </>
              )}
              <p className="text-[10px] text-gray-400 pb-1.5">📅 {inicio.toLocaleString('pt-BR')} → {fim.toLocaleString('pt-BR')}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 self-center">🔍 Granularidade:</span>
            {(['hora', 'dia', 'semana', 'mes'] as Granularidade[]).map(g => (
              <button key={g} onClick={() => setGranularidade(g)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  granularidade === g ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}>
                {g === 'hora' ? '⏰ Hora' : g === 'dia' ? '📅 Dia' : g === 'semana' ? '🗓 Semana' : '📊 Mês'}
              </button>
            ))}
          </div>

          {/* Cartões principais */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Receita</p>
              <p className="text-xl font-bold text-green-600 mt-1">R$ {receita.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400">{vendasNoPeriodo.length} venda(s) no período</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Custo (COGS)</p>
              <p className="text-xl font-bold text-orange-600 mt-1">R$ {custoMercadorias.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400">custo dos produtos vendidos</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Lucro Bruto</p>
              <p className={`text-xl font-bold mt-1 ${totais.lucroBruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {totais.lucroBruto.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400">margem: {totais.margemBruta.toFixed(0)}%</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Despesas + Perdas</p>
              <p className="text-xl font-bold text-red-600 mt-1">R$ {totalDespesas.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400">R$ {despesasNoPeriodo.toFixed(2)} despesas · R$ {perdasNoPeriodo.toFixed(2)} perdas</p>
            </div>
          </div>

          {/* Lucro Líquido */}
          <div className={`rounded-xl border p-5 ${totais.lucroLiquido >= 0 ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lucro Líquido</p>
            <p className={`text-2xl font-bold mt-1 ${totais.lucroLiquido >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totais.lucroLiquido >= 0 ? '+' : ''}R$ {totais.lucroLiquido.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              margem líquida: {totais.margemLiquida.toFixed(0)}% · R$ {receita.toFixed(2)} receita - R$ {custoMercadorias.toFixed(2)} custo - R$ {totalDespesas.toFixed(2)} despesas
            </p>
          </div>

          {/* 📊 Gráfico: Tendência Diária (últimos 14 dias) */}
          {trendDiario.some(d => d.receita > 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">📊 Tendência Diária (últimos 14 dias)</h3>
              <div className="flex items-end gap-1 h-32">
                {trendDiario.map(d => {
                  const alturaRec = (d.receita / maxDiario) * 100
                  const alturaCusto = (d.custo / maxDiario) * 100
                  const label = d.dia.slice(5)
                  const diaSem = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date(d.dia).getDay()]
                  return (
                    <div key={d.dia} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full flex flex-col items-center justify-end gap-[1px] h-full">
                        {d.receita > 0 && <div className="w-full bg-emerald-400 dark:bg-emerald-500 rounded-t-sm" style={{ height: `${alturaRec}%`, minHeight: d.receita > 0 ? 4 : 0 }} />}
                      </div>
                      <span className="text-[8px] text-gray-400 mt-1">{diaSem}<br/>{label}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-sm" /> Receita</span>
              </div>
            </div>
          )}

          {/* 🏆 Top Produtos */}
          {topProdutos.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">🏆 Top Produtos ({periodoLabel})</h3>
              <div className="space-y-3">
                {topProdutos.map(([id, info], idx) => {
                  const margem = info.custo > 0 ? ((info.receita - info.custo) / info.custo * 100) : 0
                  return (
                    <div key={id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-gray-400 w-4">#{idx + 1}</span>
                          <span className="text-gray-800 dark:text-gray-200 truncate">{info.nome}</span>
                          <span className="text-[10px] text-gray-400">{info.qtd} vendas</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="font-medium text-green-600 text-sm">R$ {info.receita.toFixed(2)}</span>
                          <span className={`text-[10px] ml-1 ${margem >= 30 ? 'text-green-500' : margem >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {margem.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all" style={{ width: `${(info.receita / maxTop) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Despesas por tipo */}
          {despesasPorTipo.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">📋 Despesas no Período</h3>
              <div className="space-y-2">
                {despesasPorTipo.map(([tipo, total]) => {
                  const info = DESPESA_TIPOS.find(dt => dt.value === tipo)
                  const pct = totalDespesas > 0 ? (total / totalDespesas) * 100 : 0
                  return (
                    <div key={tipo}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-gray-700 dark:text-gray-300">{info?.icone} {info?.label || tipo}</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">R$ {total.toFixed(2)} <span className="text-[10px] text-gray-400">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 dark:bg-red-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 📊 Gráficos Interativos (Recharts) */}
          {trendDiarioChart.some(d => d.Receita > 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">📈 Evolução 14 dias</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendDiarioChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCust" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLuc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                    formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Receita" stroke="#10b981" fill="url(#gRec)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Custo" stroke="#f59e0b" fill="url(#gCust)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Lucro" stroke="#3b82f6" fill="url(#gLuc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {despesasPieChart.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">🥧 Composição de Despesas</h3>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <ResponsiveContainer width="100%" height={220} minWidth={220}>
                  <PieChart>
                    <Pie data={despesasPieChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                      {despesasPieChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                      formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1 min-w-0">
                  {despesasPieChart.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-gray-700 dark:text-gray-300 truncate">{d.icone} {d.name}</span>
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-200 shrink-0">{formatBRL(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {topProdutosChart.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">🏆 Top 8 Produtos (14 dias)</h3>
              <ResponsiveContainer width="100%" height={Math.max(180, topProdutosChart.length * 28)}>
                <BarChart data={topProdutosChart} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="nome" type="category" tick={{ fontSize: 10 }} stroke="#9ca3af" width={80} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' }}
                    formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Receita" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Lucro" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Custo do estoque */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">📦 Estoque — Custo Total</h3>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">R$ {custoEstoque.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Valor total dos produtos em estoque (preço de custo)</p>
          </div>

          {/* Debug */}
          {(receita === 0 && custoMercadorias === 0 && despesasNoPeriodo === 0) && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs space-y-1">
              <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">🔍 Dados brutos ({periodoLabel})</p>
              <p className="text-amber-600 dark:text-amber-400">Vendas totais: {vendas.length}</p>
              <p className="text-amber-600 dark:text-amber-400">Vendas no período: {vendasNoPeriodo.length}</p>
              <p className="text-amber-600 dark:text-amber-400">Preços cadastrados: {precos.length}</p>
              <p className="text-amber-600 dark:text-amber-400">Despesas no período: {despesas.filter(d => d.data >= inicioStr.slice(0, 10) && d.data <= fimStr.slice(0, 10)).length}</p>
              <p className="text-amber-600 dark:text-amber-400">Período: {inicio.toLocaleString('pt-BR')} a {fim.toLocaleString('pt-BR')}</p>
              {precos.length === 0 && <p className="text-red-500 font-semibold">⚠️ Nenhum preço cadastrado! Vá em Estoque &gt; Preços.</p>}
              {vendas.length === 0 && <p className="text-amber-600">📌 Nenhuma venda registrada ainda. Faça uma venda no PDV.</p>}
            </div>
          )}

          {/* 💰 Lucro por Produto (completo, ordenável) */}
          {lucroPorProduto.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">💰 Lucro por Produto ({periodoLabel})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="text-left px-2 py-2 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                      {([['qtd', 'Qtd'], ['receita', 'Receita'], ['lucro', 'Lucro'], ['margem', 'Margem']] as const).map(([k, label]) => (
                        <th key={k} onClick={() => { if (sortLucroProd === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortLucroProd(k); setSortDir('desc') } }}
                          className="text-right px-2 py-2 font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none">
                          {label} {sortLucroProd === k && (sortDir === 'desc' ? '▼' : '▲')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {lucroPorProduto.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-2 py-2 text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{p.nome}</td>
                        <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-400">{p.qtd} {p.unidade}</td>
                        <td className="px-2 py-2 text-right text-green-600 dark:text-green-400">R$ {p.receita.toFixed(2)}</td>
                        <td className={`px-2 py-2 text-right font-bold ${p.lucro >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>R$ {p.lucro.toFixed(2)}</td>
                        <td className={`px-2 py-2 text-right font-medium ${p.margem >= 30 ? 'text-green-600' : p.margem >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>{p.margem.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ⏰ Análise por Horário (vendas agrupadas por hora do dia) */}
          {porHorario.some(b => b.receita > 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">⏰ Análise por Horário ({periodoLabel})</h3>
              <p className="text-[10px] text-gray-400 mb-2">Em qual horário do dia você vende mais? Quanto cada hora rende?</p>
              <div className="flex items-end gap-px h-28">
                {porHorario.map(b => {
                  const altura = maxHorario > 0 ? (b.receita / maxHorario) * 100 : 0
                  return (
                    <div key={b.hora} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      {b.receita > 0 && (
                        <div className="w-full bg-gradient-to-t from-indigo-500 to-blue-400 dark:from-indigo-600 dark:to-blue-500 rounded-t-sm transition-all group-hover:from-indigo-600 group-hover:to-blue-500"
                          style={{ height: `${altura}%`, minHeight: 4 }} title={`${b.hora}h — R$ ${b.receita.toFixed(2)}`} />
                      )}
                      {b.hora % 3 === 0 && <span className="text-[8px] text-gray-400 mt-1">{b.hora}h</span>}
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {(() => {
                  const buckets = [{ label: 'Madrugada (0-5h)', ini: 0, fim: 5 }, { label: 'Manhã (6-11h)', ini: 6, fim: 11 }, { label: 'Tarde (12-17h)', ini: 12, fim: 17 }, { label: 'Noite (18-23h)', ini: 18, fim: 23 }]
                  return buckets.map(b => {
                    const total = porHorario.filter(h => h.hora >= b.ini && h.hora <= b.fim).reduce((s, h) => s + h.receita, 0)
                    const lucro = porHorario.filter(h => h.hora >= b.ini && h.hora <= b.fim).reduce((s, h) => s + h.lucro, 0)
                    return (
                      <div key={b.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{b.label}</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">R$ {total.toFixed(2)}</p>
                        <p className={`text-[10px] ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>lucro R$ {lucro.toFixed(2)}</p>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {/* 📅 Análise por Granularidade (dia/semana/mês) */}
          {porGranularidade.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">📅 Análise por {granularidade === 'hora' ? 'Hora' : granularidade === 'dia' ? 'Dia' : granularidade === 'semana' ? 'Semana' : 'Mês'}</h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-2 py-2 font-semibold text-gray-600 dark:text-gray-400">Período</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600 dark:text-gray-400">Transações</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600 dark:text-gray-400">Receita</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600 dark:text-gray-400">Custo</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600 dark:text-gray-400">Lucro</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">% do total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {porGranularidade.map(g => {
                      const pct = porGranularidade.reduce((s, x) => s + x.receita, 0) > 0 ? (g.receita / porGranularidade.reduce((s, x) => s + x.receita, 0)) * 100 : 0
                      return (
                        <tr key={g.chave} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-2 py-2 text-gray-800 dark:text-gray-200 capitalize">{labelGranularidade(g.dataRef)}</td>
                          <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-400">{g.transacoes}</td>
                          <td className="px-2 py-2 text-right text-green-600 dark:text-green-400 font-medium">R$ {g.receita.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right text-orange-600 dark:text-orange-400">R$ {g.custo.toFixed(2)}</td>
                          <td className={`px-2 py-2 text-right font-bold ${g.lucro >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>R$ {g.lucro.toFixed(2)}</td>
                          <td className="px-2 py-2 text-right hidden sm:table-cell">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-500 w-9 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                    <tr>
                      <td className="px-2 py-2 font-bold text-gray-700 dark:text-gray-300 text-xs">TOTAL</td>
                      <td className="px-2 py-2 text-right text-xs font-bold text-gray-800 dark:text-gray-200">{porGranularidade.reduce((s, g) => s + g.transacoes, 0)}</td>
                      <td className="px-2 py-2 text-right text-xs font-bold text-green-600 dark:text-green-400">R$ {porGranularidade.reduce((s, g) => s + g.receita, 0).toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-xs font-bold text-orange-600 dark:text-orange-400">R$ {porGranularidade.reduce((s, g) => s + g.custo, 0).toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-xs font-bold text-gray-800 dark:text-gray-200">R$ {porGranularidade.reduce((s, g) => s + g.lucro, 0).toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-xs text-gray-400 hidden sm:table-cell">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 🗑️ Perdas Detalhadas */}
          {perdasDetalhadas.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">🗑️ Perdas Detalhadas ({periodoLabel})</h3>
              <p className="text-[10px] text-gray-400 mb-3">Total: <strong className="text-red-600">{perdasLogsNoPeriodo.length} registro(s)</strong> · valor perdido: <strong className="text-red-600">R$ {perdasNoPeriodo.toFixed(2)}</strong></p>
              <div className="space-y-2">
                {perdasDetalhadas.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(p.motivos).map(([m, n]) => (
                          <span key={m} className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">{MOTIVOS_PERDA_LABELS[m] || m} ×{n}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{p.qtd} un</p>
                      {p.valor > 0 && <p className="text-[10px] text-gray-500">R$ {p.valor.toFixed(2)} perdidos</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {aba === 'inteligencia' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">🧠 Inteligência Financeira</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Converse com um consultor de IA especializado em finanças para sorveterias. Peça análises, recomendações de preço, sugestões de corte de gastos e muito mais.
            </p>
          </div>

          {!apiKey ? (
            <div className="max-w-lg bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">🔑 Conecte sua IA</h2>
              <p className="text-xs text-gray-400 mb-4">Para usar o consultor financeiro, você precisa de uma chave da API OpenRouter.</p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chave da API OpenRouter</label>
              <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                🔒 Sua chave fica salva apenas no seu navegador. Obtenha uma grátis em <a href="https://openrouter.ai/keys" target="_blank" className="text-indigo-500 underline" rel="noreferrer">openrouter.ai/keys</a>
              </p>
              <button onClick={salvarKey} disabled={!keyInput.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Salvar e Começar</button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {aiMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <p className="text-3xl mb-2">🧠</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Faça perguntas sobre suas finanças!</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm">Peça análises, recomendação de preços, corte de gastos, etc.</p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {sugestoesFinanceiras.map((s, i) => (
                        <button key={i} onClick={() => setAiInput(s)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/60">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`max-w-[95%] md:max-w-[80%] rounded-2xl px-3 md:px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                <div className="flex gap-2">
                  <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviarFinanceiro())}
                    placeholder="Ex: Analise minhas finanças do mês..."
                    disabled={aiLoading}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50" />
                  <button onClick={enviarFinanceiro} disabled={aiLoading || !aiInput.trim()}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {aiLoading ? '...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
