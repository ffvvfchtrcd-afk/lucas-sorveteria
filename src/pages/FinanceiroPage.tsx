import { useMemo, useState, useRef, useEffect } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { useGastos } from '../context/GastosContext'
import { DESPESA_TIPOS, DespesaTipo } from '../types'
import { chatCompletionWithRetry, Message } from '../services/openrouter'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Periodo = 'hoje' | 'mes' | 'ano' | 'total'
type Aba = 'resumo' | 'inteligencia'

const API_KEY_STORAGE = 'openrouter_key'

function getPeriodo(t: Periodo): [string, string] {
  const agora = new Date()
  const y = agora.getFullYear()
  const m = String(agora.getMonth() + 1).padStart(2, '0')
  const d = String(agora.getDate()).padStart(2, '0')
  if (t === 'hoje') return [`${y}-${m}-${d}`, `${y}-${m}-${d}`]
  if (t === 'mes') return [`${y}-${m}-01`, `${y}-${m}-31`]
  if (t === 'ano') return [`${y}-01-01`, `${y}-12-31`]
  return ['2000-01-01', '2099-12-31']
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

  const [inicio, fim] = getPeriodo(periodoAtivo)
  const hoje = new Date().toISOString().slice(0, 10)
  const mesAtual = hoje.slice(0, 7)

  const vendas = useMemo(() => logs.filter(l => l.tipo === 'venda'), [logs])

  const vendasNoPeriodo = useMemo(() =>
    vendas.filter(l => (l.data || '').slice(0, 10) >= inicio && (l.data || '').slice(0, 10) <= fim),
  [vendas, inicio, fim])

  const receita = useMemo(() =>
    vendasNoPeriodo.reduce((s, v) => s + ((precos.find(p => p.itemId === v.itemId)?.precoVenda || 0)) * v.quantidade, 0),
  [vendasNoPeriodo, precos])

  const custoMercadorias = useMemo(() =>
    vendasNoPeriodo.reduce((s, v) => s + ((precos.find(p => p.itemId === v.itemId)?.precoCusto || 0)) * v.quantidade, 0),
  [vendasNoPeriodo, precos])

  const perdasNoPeriodo = useMemo(() =>
    logs.filter(l => l.tipo === 'perda' && (l.data || '').slice(0, 10) >= inicio && (l.data || '').slice(0, 10) <= fim)
      .reduce((s, l) => s + ((precos.find(p => p.itemId === l.itemId)?.precoCusto || 0)) * Math.abs(l.quantidade), 0),
  [logs, inicio, fim, precos])

  const despesasNoPeriodo = useMemo(() =>
    despesas.filter(d => d.data >= inicio && d.data <= fim).reduce((s, d) => s + d.valor, 0),
  [despesas, inicio, fim])

  const totalDespesas = despesasNoPeriodo + perdasNoPeriodo

  const despesasPorTipo = useMemo(() => {
    const filtradas = despesas.filter(d => d.data >= inicio && d.data <= fim)
    const map = new Map<string, number>()
    for (const d of filtradas) map.set(d.tipo, (map.get(d.tipo) || 0) + d.valor)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [despesas, inicio, fim])

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

  const periodos: { id: Periodo; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'mes', label: 'Este Mês' },
    { id: 'ano', label: 'Este Ano' },
    { id: 'total', label: 'Total Geral' },
  ]
  const periodoLabel = periodos.find(p => p.id === periodoAtivo)?.label || ''

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
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  periodoAtivo === p.id
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                {p.label}
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
              <p className="text-amber-600 dark:text-amber-400">Despesas no período: {despesas.filter(d => d.data >= inicio && d.data <= fim).length}</p>
              <p className="text-amber-600 dark:text-amber-400">Período: {inicio} a {fim}</p>
              {precos.length === 0 && <p className="text-red-500 font-semibold">⚠️ Nenhum preço cadastrado! Vá em Estoque &gt; Preços.</p>}
              {vendas.length === 0 && <p className="text-amber-600">📌 Nenhuma venda registrada ainda. Faça uma venda no PDV.</p>}
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
