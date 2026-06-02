import { useMemo, useState } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { useGastos } from '../context/GastosContext'
import { DESPESA_TIPOS } from '../types'

type Periodo = 'hoje' | 'mes' | 'ano' | 'total'

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

function dataLocal(d?: Date): string {
  const dt = d || new Date()
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

export default function FinanceiroPage() {
  const { todosItens } = useStock()
  const { logs } = useLog()
  const { precos } = usePreco()
  const { despesas } = useGastos()
  const [periodoAtivo, setPeriodoAtivo] = useState<Periodo>('mes')

  const [inicio, fim] = getPeriodo(periodoAtivo)

  const hoje = dataLocal()

  const vendas = useMemo(() =>
    logs.filter(l => l.tipo === 'venda'),
  [logs])

  const vendasNoPeriodo = useMemo(() =>
    vendas.filter(l => {
      const d = l.data ? l.data.slice(0, 10) : ''
      return d >= inicio && d <= fim
    }),
  [vendas, inicio, fim])

  const receita = useMemo(() =>
    vendasNoPeriodo.reduce((s, v) => {
      const p = precos.find(p => p.itemId === v.itemId)
      return s + (p?.precoVenda || 0) * v.quantidade
    }, 0),
  [vendasNoPeriodo, precos])

  const custoMercadorias = useMemo(() =>
    vendasNoPeriodo.reduce((s, v) => {
      const p = precos.find(p => p.itemId === v.itemId)
      return s + (p?.precoCusto || 0) * v.quantidade
    }, 0),
  [vendasNoPeriodo, precos])

  const perdasNoPeriodo = useMemo(() =>
    logs.filter(l => l.tipo === 'perda' && (l.data || '').slice(0, 10) >= inicio && (l.data || '').slice(0, 10) <= fim)
      .reduce((s, l) => {
        const p = precos.find(p => p.itemId === l.itemId)
        return s + (p?.precoCusto || 0) * Math.abs(l.quantidade)
      }, 0),
  [logs, inicio, fim, precos])

  const despesasNoPeriodo = useMemo(() =>
    despesas.filter(d => d.data >= inicio && d.data <= fim).reduce((s, d) => s + d.valor, 0),
  [despesas, inicio, fim])

  const despesasPorTipo = useMemo(() => {
    const filtradas = despesas.filter(d => d.data >= inicio && d.data <= fim)
    const map = new Map<string, number>()
    for (const d of filtradas) map.set(d.tipo, (map.get(d.tipo) || 0) + d.valor)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [despesas, inicio, fim])

  const totais = useMemo(() => {
    const lucroBruto = receita - custoMercadorias
    const despesasTotais = despesasNoPeriodo + perdasNoPeriodo
    const lucroLiquido = lucroBruto - despesasTotais
    const margemBruta = receita > 0 ? (lucroBruto / receita) * 100 : 0
    const margemLiquida = receita > 0 ? (lucroLiquido / receita) * 100 : 0
    return { lucroBruto, despesasTotais, lucroLiquido, margemBruta, margemLiquida }
  }, [receita, custoMercadorias, despesasNoPeriodo, perdasNoPeriodo])

  const custoEstoque = useMemo(() =>
    todosItens.reduce((s, i) => {
      const p = precos.find(p => p.itemId === i.id)
      return s + (p?.precoCusto || 0) * i.quantidadeAtual
    }, 0),
  [todosItens, precos])

  const periodos: { id: Periodo; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'mes', label: 'Este Mês' },
    { id: 'ano', label: 'Este Ano' },
    { id: 'total', label: 'Total Geral' },
  ]

  const periodoLabel = periodos.find(p => p.id === periodoAtivo)?.label || ''

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">📈 Financeiro</h1>
        <p className="text-xs text-gray-400 mt-0.5">Receitas, despesas e lucro — resumo completo do negócio.</p>
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
          <p className="text-xl font-bold text-red-600 mt-1">R$ {totais.despesasTotais.toFixed(2)}</p>
          <p className="text-[10px] text-gray-400">R$ {despesasNoPeriodo.toFixed(2)} despesas · R$ {perdasNoPeriodo.toFixed(2)} perdas</p>
        </div>
      </div>

      <div className={`rounded-xl border p-5 ${totais.lucroLiquido >= 0 ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lucro Líquido</p>
        <p className={`text-2xl font-bold mt-1 ${totais.lucroLiquido >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {totais.lucroLiquido >= 0 ? '+' : ''}R$ {totais.lucroLiquido.toFixed(2)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          margem líquida: {totais.margemLiquida.toFixed(0)}% · R$ {receita.toFixed(2)} receita - R$ {custoMercadorias.toFixed(2)} custo - R$ {totais.despesasTotais.toFixed(2)} despesas
        </p>
      </div>

      {despesasPorTipo.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">📋 Despesas no Período</h3>
          <div className="space-y-2">
            {despesasPorTipo.map(([tipo, total]) => {
              const info = DESPESA_TIPOS.find(dt => dt.value === tipo)
              const pct = totais.despesasTotais > 0 ? (total / totais.despesasTotais) * 100 : 0
              return (
                <div key={tipo}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="text-gray-700 dark:text-gray-300">{info?.icone} {info?.label || tipo}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">R$ {total.toFixed(2)}</span>
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

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">📦 Estoque — Custo Total</h3>
        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">R$ {custoEstoque.toFixed(2)}</p>
        <p className="text-xs text-gray-400 mt-0.5">Valor total dos produtos em estoque (preço de custo)</p>
      </div>

      {/* Debug: mostra dados brutos se estiver tudo zerado */}
      {(receita === 0 && custoMercadorias === 0 && despesasNoPeriodo === 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs space-y-1">
          <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">🔍 Dados brutos ({periodoLabel})</p>
          <p className="text-amber-600 dark:text-amber-400">Vendas totais (todo período): {vendas.length}</p>
          <p className="text-amber-600 dark:text-amber-400">Vendas no período: {vendasNoPeriodo.length}</p>
          <p className="text-amber-600 dark:text-amber-400">Preços cadastrados: {precos.length}</p>
          <p className="text-amber-600 dark:text-amber-400">Despesas no período: {despesas.filter(d => d.data >= inicio && d.data <= fim).length}</p>
          <p className="text-amber-600 dark:text-amber-400">Logs totais: {logs.length}</p>
          <p className="text-amber-600 dark:text-amber-400">Período: {inicio} a {fim}</p>
          {precos.length === 0 && <p className="text-red-500 font-semibold">⚠️ Nenhum preço cadastrado! Vá em Estoque &gt; Preços e cadastre.</p>}
          {vendas.length === 0 && <p className="text-amber-600">📌 Nenhuma venda registrada ainda. Faça uma venda no PDV.</p>}
        </div>
      )}
    </div>
  )
}
