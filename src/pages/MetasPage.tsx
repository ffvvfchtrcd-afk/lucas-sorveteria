import { useState, useMemo } from 'react'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { useGastos } from '../context/GastosContext'

interface Meta {
  id: string
  nome: string
  tipo: 'lucro_liquido' | 'receita' | 'despesas' | 'lucro_bruto'
  valorMeta: number
  mes: string
}

const STORAGE_KEY = 'estoque_metas'

function carregarMetas(): Meta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function salvarMetas(metas: Meta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metas))
}

const TIPO_INFO: Record<string, { label: string; icone: string; cor: string }> = {
  lucro_liquido: { label: 'Lucro Líquido', icone: '📈', cor: 'text-green-600' },
  receita: { label: 'Receita', icone: '💰', cor: 'text-blue-600' },
  despesas: { label: 'Despesas', icone: '💸', cor: 'text-red-600' },
  lucro_bruto: { label: 'Lucro Bruto', icone: '📊', cor: 'text-emerald-600' },
}

export default function MetasPage() {
  const { logs } = useLog()
  const { precos } = usePreco()
  const { despesas } = useGastos()
  const [metas, setMetas] = useState<Meta[]>(carregarMetas)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<Meta['tipo']>('lucro_liquido')
  const [valorMeta, setValorMeta] = useState(0)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  const mesAtual = new Date().toISOString().slice(0, 7)

  function calcularProgresso(meta: Meta): { atual: number; pct: number; cor: string } {
    const vendas = logs.filter(l => l.tipo === 'venda' && l.data.startsWith(meta.mes))
    const receita = vendas.reduce((s, v) => {
      const p = precos.find(p => p.itemId === v.itemId)
      return s + (p?.precoVenda || 0) * v.quantidade
    }, 0)
    const custo = vendas.reduce((s, v) => {
      const p = precos.find(p => p.itemId === v.itemId)
      return s + (p?.precoCusto || 0) * v.quantidade
    }, 0)
    const desp = despesas.filter(d => d.data.startsWith(meta.mes)).reduce((s, d) => s + d.valor, 0)
    const lucroBruto = receita - custo
    const lucroLiquido = lucroBruto - desp

    let atual = 0
    switch (meta.tipo) {
      case 'receita': atual = receita; break
      case 'despesas': atual = desp; break
      case 'lucro_bruto': atual = lucroBruto; break
      case 'lucro_liquido': atual = lucroLiquido; break
    }

    const pct = meta.valorMeta > 0 ? Math.min(100, (atual / meta.valorMeta) * 100) : 0
    const cor = meta.tipo === 'despesas'
      ? (atual <= meta.valorMeta ? 'bg-green-500' : 'bg-red-500')
      : (pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-indigo-500')
    return { atual, pct, cor }
  }

  function adicionarMeta() {
    if (!nome.trim() || valorMeta <= 0) return
    const nova: Meta = {
      id: `meta_${Date.now()}`,
      nome: nome.trim(),
      tipo,
      valorMeta,
      mes,
    }
    const novas = [...metas, nova]
    setMetas(novas)
    salvarMetas(novas)
    setNome(''); setValorMeta(0); setMostrarForm(false)
  }

  function removerMeta(id: string) {
    const novas = metas.filter(m => m.id !== id)
    setMetas(novas)
    salvarMetas(novas)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">🎯 Metas</h1>
          <p className="text-xs text-gray-400 mt-0.5">Defina metas financeiras e acompanhe o progresso em tempo real.</p>
        </div>
        <button onClick={() => setMostrarForm(true)}
          className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">+ Nova Meta</button>
      </div>

      {mostrarForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Nova Meta</h3>
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Lucrar R$ 5k em junho"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as Meta['tipo'])}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {Object.entries(TIPO_INFO).map(([k, v]) => <option key={k} value={k}>{v.icone} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Valor Meta (R$)</label>
              <input type="number" value={valorMeta || ''} min={1} onChange={e => setValorMeta(Number(e.target.value))}
                placeholder="5000"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Mês</label>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={adicionarMeta}
              className="min-h-[44px] flex-1 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800">✓ Criar Meta</button>
            <button onClick={() => setMostrarForm(false)}
              className="min-h-[44px] px-5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancelar</button>
          </div>
        </div>
      )}

      {metas.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm">Nenhuma meta definida</p>
          <p className="text-xs mt-1">Crie metas como "Lucrar R$ 5k esse mês" e acompanhe o progresso.</p>
        </div>
      )}

      <div className="grid gap-3">
        {metas.sort((a, b) => a.mes.localeCompare(b.mes)).reverse().map(meta => {
          const { atual, pct, cor } = calcularProgresso(meta)
          const info = TIPO_INFO[meta.tipo]
          const atingiu = pct >= 100
          return (
            <div key={meta.id} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 space-y-2 ${
              atingiu ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-800'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">{meta.nome}</h3>
                  <p className="text-[10px] text-gray-400">{info?.icone} {info?.label} · {meta.mes.replace(/-/g, '/')}</p>
                </div>
                <button onClick={() => removerMeta(meta.id)}
                  className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className={`text-xs ${meta.tipo === 'despesas' ? 'text-red-500' : 'text-green-600'} font-bold`}>
                    {meta.tipo === 'despesas' ? 'R$ ' : ''}{atual.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400">de R$ {meta.valorMeta.toFixed(2)}</p>
                </div>
                <span className={`text-lg font-bold ${atingiu ? 'text-green-600' : 'text-gray-400'}`}>
                  {atingiu ? '✅' : `${pct.toFixed(0)}%`}
                </span>
              </div>

              <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${cor}`}
                  style={{ width: `${Math.min(100, pct)}%` }} />
              </div>

              {atingiu && (
                <p className="text-[10px] text-green-600 font-medium">🎉 Meta atingida!</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
