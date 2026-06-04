import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { TipoMovimentacao } from '../types'

type FiltroTipo = '' | TipoMovimentacao

const TIPOS: { value: FiltroTipo; label: string; emoji: string; cor: string; bg: string; border: string; ring: string; chip: string }[] = [
  { value: '', label: 'Todas', emoji: '📋', cor: 'text-gray-700', bg: 'bg-white dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', ring: 'ring-gray-300', chip: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'entrada', label: 'Entradas', emoji: '📥', cor: 'text-green-700', bg: 'bg-green-50 dark:bg-green-950/40', border: 'border-green-200 dark:border-green-900', ring: 'ring-green-300', chip: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  { value: 'saida', label: 'Saídas', emoji: '📤', cor: 'text-red-700', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-900', ring: 'ring-red-300', chip: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  { value: 'venda', label: 'Vendas', emoji: '💰', cor: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900', ring: 'ring-blue-300', chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { value: 'producao', label: 'Produção', emoji: '🏭', cor: 'text-indigo-700', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-900', ring: 'ring-indigo-300', chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
  { value: 'perda', label: 'Perdas', emoji: '🗑️', cor: 'text-orange-700', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-900', ring: 'ring-orange-300', chip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' },
  { value: 'ajuste', label: 'Ajustes', emoji: '🔧', cor: 'text-gray-700', bg: 'bg-gray-50 dark:bg-gray-800/60', border: 'border-gray-200 dark:border-gray-700', ring: 'ring-gray-300', chip: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
]

const isNegativo = (tipo: TipoMovimentacao) =>
  tipo === 'venda' || tipo === 'saida' || tipo === 'perda'

const formatarDataCurta = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatarHora = (iso: string) => {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const labelDia = (iso: string) => {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)
  const mesmaData = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (mesmaData(d, hoje)) return 'Hoje'
  if (mesmaData(d, ontem)) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default function MovimentacoesPage() {
  const { logs, addLog, limparLogs } = useLog()
  const { todosItens, definirQuantidade } = useStock()
  const { getPreco } = usePreco()

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('')
  const [busca, setBusca] = useState('')
  const [mostrarPerda, setMostrarPerda] = useState(false)
  const [perdaItem, setPerdaItem] = useState('')
  const [perdaQtd, setPerdaQtd] = useState(0)
  const [perdaMotivo, setPerdaMotivo] = useState('vencido')
  const [perdaObs, setPerdaObs] = useState('')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const contadores = useMemo(() => {
    const acc: Record<TipoMovimentacao | 'total', number> = {
      total: logs.length, entrada: 0, saida: 0, venda: 0, producao: 0, perda: 0, ajuste: 0,
    }
    for (const l of logs) acc[l.tipo] = (acc[l.tipo] || 0) + 1
    return acc
  }, [logs])

  const valorVendas = useMemo(() => {
    return logs
      .filter(l => l.tipo === 'venda')
      .reduce((s, l) => s + (getPreco(l.itemId)?.precoVenda || 0) * l.quantidade, 0)
  }, [logs, getPreco])

  const filtered = useMemo(() => {
    let result = logs
    if (filtroTipo) result = result.filter(l => l.tipo === filtroTipo)
    if (busca.trim()) {
      const lower = busca.toLowerCase()
      result = result.filter(l =>
        l.itemNome.toLowerCase().includes(lower) ||
        (l.origem || '').toLowerCase().includes(lower) ||
        (l.motivo || '').toLowerCase().includes(lower)
      )
    }
    return result.slice(0, 300)
  }, [logs, filtroTipo, busca])

  const gruposPorDia = useMemo(() => {
    const grupos: { dia: string; itens: typeof filtered }[] = []
    for (const log of filtered) {
      const dia = labelDia(log.data)
      const ultimo = grupos[grupos.length - 1]
      if (ultimo && ultimo.dia === dia) ultimo.itens.push(log)
      else grupos.push({ dia, itens: [log] })
    }
    return grupos
  }, [filtered])

  function toggleExpandir(id: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function registrarPerda() {
    if (!perdaItem || perdaQtd <= 0) return
    const item = todosItens.find(i => i.id === perdaItem)
    if (!item || item.quantidadeAtual < perdaQtd) {
      alert(`❌ Estoque insuficiente. "${item?.nome}" tem apenas ${item?.quantidadeAtual} ${item?.unidade} disponível(is).`)
      return
    }
    definirQuantidade(perdaItem, item.quantidadeAtual - perdaQtd)
    addLog('perda', perdaItem, item.nome, perdaQtd, 'Perdas', `${perdaMotivo}${perdaObs ? `: ${perdaObs}` : ''}`)
    setPerdaItem('')
    setPerdaQtd(0)
    setPerdaObs('')
    setMostrarPerda(false)
  }

  function exportarCSV() {
    const BOM = '\uFEFF'
    const header = 'Data;Item;Tipo;Quantidade;Origem;Motivo'
    const rows = logs.slice(0, 5000).map(l =>
      `${new Date(l.data).toLocaleString('pt-BR')};"${l.itemNome}";${l.tipo};${l.quantidade};${l.origem || ''};${l.motivo || ''}`
    )
    const blob = new Blob([BOM + header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movimentacoes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cardResumo = (tipo: FiltroTipo, label: string, count: number, extra?: React.ReactNode) => {
    const isActive = filtroTipo === tipo
    const cfg = TIPOS.find(t => t.value === tipo) || TIPOS[0]
    return (
      <button
        onClick={() => setFiltroTipo(tipo)}
        className={`text-left p-3 md:p-4 rounded-xl border-2 transition-all hover:shadow-md ${cfg.border} ${cfg.bg} ${isActive ? `ring-2 ${cfg.ring} shadow-sm` : ''}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cfg.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${cfg.cor} opacity-80`}>{label}</p>
            <p className={`text-xl md:text-2xl font-bold ${cfg.cor}`}>{count}</p>
          </div>
        </div>
        {extra}
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">📋 Movimentações</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Histórico completo de tudo que entrou e saiu do estoque. Clique em um card para filtrar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setMostrarPerda(true)} className="px-3 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 rounded-lg hover:bg-orange-100 transition-colors">+ Registrar Perda</button>
          <button onClick={exportarCSV} className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:bg-indigo-100 transition-colors">📤 Exportar CSV</button>
          <button onClick={() => { if (confirm('Tem certeza? Todo o histórico de movimentações será apagado permanentemente.')) limparLogs() }} className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 transition-colors">🗑 Limpar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        {cardResumo('', 'Todas', contadores.total)}
        {cardResumo('entrada', 'Entradas', contadores.entrada)}
        {cardResumo('venda', 'Vendas', contadores.venda,
          <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-0.5">R$ {valorVendas.toFixed(2)}</p>
        )}
        {cardResumo('producao', 'Produção', contadores.producao)}
        {cardResumo('perda', 'Perdas', contadores.perda)}
        {cardResumo('saida', 'Saídas', contadores.saida)}
      </div>

      {mostrarPerda && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-orange-200 dark:border-orange-900 p-4 md:p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-orange-700 dark:text-orange-300">Registrar Perda / Quebra</h3>
            <p className="text-xs text-gray-500 mt-0.5">Use quando um item estragar, quebrar, vencer ou for extraviado. A quantidade será descontada do estoque automaticamente.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Produto <span className="text-red-400">*</span></label>
              <select value={perdaItem} onChange={e => setPerdaItem(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">— Selecione —</option>
                {todosItens.filter(i => i.quantidadeAtual > 0).map(i => (
                  <option key={i.id} value={i.id}>{i.nome} ({i.quantidadeAtual} {i.unidade})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade <span className="text-red-400">*</span></label>
              <input type="number" value={perdaQtd} min={0} onChange={e => setPerdaQtd(Number(e.target.value))}
                placeholder="Ex: 5"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Motivo</label>
              <select value={perdaMotivo} onChange={e => setPerdaMotivo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="vencido">Vencido</option>
                <option value="quebrado">Danificado / Quebrado</option>
                <option value="contaminado">Contaminado</option>
                <option value="extraviado">Extraviado / Perdido</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Observação <span className="text-gray-300">(opcional)</span></label>
              <input type="text" value={perdaObs} onChange={e => setPerdaObs(e.target.value)}
                placeholder="Ex: Vazou na embalagem"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={registrarPerda} className="px-5 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">Registrar Perda</button>
            <button onClick={() => setMostrarPerda(false)} className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar por item, origem ou motivo..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        {filtroTipo && (
          <button onClick={() => setFiltroTipo('')}
            className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors">
            ✕ Limpar filtro
          </button>
        )}
      </div>

      <div className="space-y-4">
        {gruposPorDia.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium text-gray-600 dark:text-gray-300">Nenhuma movimentação encontrada</p>
            <p className="text-xs text-gray-400 mt-1">Tente alterar o filtro ou registrar novas movimentações no PDV, Produção ou Estoque.</p>
          </div>
        ) : (
          gruposPorDia.map(grupo => (
            <div key={grupo.dia}>
              <div className="flex items-center gap-3 mb-2 px-1">
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{grupo.dia}</h2>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-400">{grupo.itens.length} registro(s)</span>
              </div>
              <div className="space-y-2">
                {grupo.itens.map(log => {
                  const cfg = TIPOS.find(t => t.value === log.tipo) || TIPOS[0]
                  const neg = isNegativo(log.tipo)
                  const expandido = expandidos.has(log.id)
                  const item = todosItens.find(i => i.id === log.itemId)
                  const categoria = item ? (cfg.label === 'Entradas' || cfg.label === 'Saídas' ? '' : '') : ''
                  const unidade = item?.unidade
                  const temDetalhe = !!(log.origem || log.motivo)
                  return (
                    <div key={log.id}
                      onClick={() => temDetalhe && toggleExpandir(log.id)}
                      className={`bg-white dark:bg-gray-900 rounded-xl border ${cfg.border} p-3 md:p-4 hover:shadow-sm transition-shadow ${temDetalhe ? 'cursor-pointer' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl ${cfg.bg} ${cfg.cor} flex items-center justify-center text-xl md:text-2xl`}>
                          {cfg.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <p className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">{log.itemNome}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.chip}`}>{cfg.label.slice(0, -1).toUpperCase()}</span>
                            {item?.categoria && (
                              <span className="text-[10px] text-gray-400">· {item.categoria.replace(/_/g, ' ')}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <span className={`text-base md:text-lg font-bold ${neg ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {neg ? '−' : '+'}{Math.abs(log.quantidade)}{unidade && <span className="text-xs font-normal text-gray-400 ml-0.5">{unidade}</span>}
                            </span>
                            <span className="text-xs text-gray-400">⏱ {formatarHora(log.data)}</span>
                            {log.origem && (
                              <span className="text-xs text-gray-500">📍 {log.origem}</span>
                            )}
                            {log.tipo === 'venda' && getPreco(log.itemId)?.precoVenda ? (
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                💵 R$ {(getPreco(log.itemId)!.precoVenda * log.quantidade).toFixed(2)}
                              </span>
                            ) : null}
                            {temDetalhe && (
                              <span className="text-[10px] text-indigo-500 ml-auto">{expandido ? '▲ Recolher' : '▼ Detalhes'}</span>
                            )}
                          </div>
                          {expandido && temDetalhe && (
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                              {log.origem && (
                                <p className="text-xs text-gray-500"><span className="font-medium">Origem:</span> {log.origem}</p>
                              )}
                              {log.motivo && (
                                <p className="text-xs text-gray-500"><span className="font-medium">Motivo:</span> {log.motivo}</p>
                              )}
                              <p className="text-[10px] text-gray-400">ID: {log.id} · {formatarDataCurta(log.data)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
