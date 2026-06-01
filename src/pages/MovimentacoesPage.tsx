import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { TipoMovimentacao } from '../types'

const TIPOS: { value: '' | TipoMovimentacao; label: string; cor: string }[] = [
  { value: '', label: 'Todos', cor: '' },
  { value: 'entrada', label: 'Entradas', cor: 'text-green-600' },
  { value: 'saida', label: 'Saídas', cor: 'text-red-600' },
  { value: 'venda', label: 'Vendas', cor: 'text-blue-600' },
  { value: 'producao', label: 'Produção', cor: 'text-indigo-600' },
  { value: 'perda', label: 'Perdas', cor: 'text-orange-600' },
  { value: 'ajuste', label: 'Ajustes', cor: 'text-gray-600' },
]

export default function MovimentacoesPage() {
  const { logs, addLog, limparLogs } = useLog()
  const { todosItens, definirQuantidade } = useStock()

  const [filtroTipo, setFiltroTipo] = useState<'' | TipoMovimentacao>('')
  const [busca, setBusca] = useState('')
  const [mostrarPerda, setMostrarPerda] = useState(false)
  const [perdaItem, setPerdaItem] = useState('')
  const [perdaQtd, setPerdaQtd] = useState(0)
  const [perdaMotivo, setPerdaMotivo] = useState('vencido')
  const [perdaObs, setPerdaObs] = useState('')

  const filtered = useMemo(() => {
    let result = logs
    if (filtroTipo) result = result.filter(l => l.tipo === filtroTipo)
    if (busca.trim()) {
      const lower = busca.toLowerCase()
      result = result.filter(l => l.itemNome.toLowerCase().includes(lower))
    }
    return result.slice(0, 200)
  }, [logs, filtroTipo, busca])

  function registrarPerda() {
    if (!perdaItem || perdaQtd <= 0) return
    const item = todosItens.find(i => i.id === perdaItem)
    if (!item || item.quantidadeAtual < perdaQtd) {
      alert('Estoque insuficiente para registrar esta perda')
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">📋 Movimentações</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Histórico completo do estoque ({logs.length} registros)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMostrarPerda(true)} className="px-3 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 rounded-lg hover:bg-orange-100">+ Perda</button>
          <button onClick={exportarCSV} className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:bg-indigo-100">Exportar CSV</button>
          <button onClick={() => { if (confirm('Limpar todo o histórico?')) limparLogs() }} className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100">Limpar</button>
        </div>
      </div>

      {mostrarPerda && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-orange-200 dark:border-orange-900 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-300">Registrar Perda/Quebra</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={perdaItem} onChange={e => setPerdaItem(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg">
              <option value="">Selecione o item</option>
              {todosItens.filter(i => i.quantidadeAtual > 0).map(i => (
                <option key={i.id} value={i.id}>{i.nome} ({i.quantidadeAtual} {i.unidade})</option>
              ))}
            </select>
            <input type="number" value={perdaQtd} min={0} onChange={e => setPerdaQtd(Number(e.target.value))}
              placeholder="Quantidade" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg" />
            <select value={perdaMotivo} onChange={e => setPerdaMotivo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg">
              <option value="vencido">Vencido</option>
              <option value="quebrado">Danificado/Quebrado</option>
              <option value="contaminado">Contaminado</option>
              <option value="extraviado">Extraviado</option>
              <option value="outro">Outro</option>
            </select>
            <input type="text" value={perdaObs} onChange={e => setPerdaObs(e.target.value)}
              placeholder="Observação" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <button onClick={registrarPerda} className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700">Registrar Perda</button>
            <button onClick={() => setMostrarPerda(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TIPOS.map(t => (
          <button key={t.value} onClick={() => setFiltroTipo(t.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filtroTipo === t.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}>{t.label}</button>
        ))}
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por item..." className="ml-auto px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Data</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Item</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Tipo</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Qtd</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Origem</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-xs">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(log.data).toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-200">{log.itemNome}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      log.tipo === 'entrada' ? 'bg-green-100 text-green-700' :
                      log.tipo === 'saida' ? 'bg-red-100 text-red-700' :
                      log.tipo === 'venda' ? 'bg-blue-100 text-blue-700' :
                      log.tipo === 'producao' ? 'bg-indigo-100 text-indigo-700' :
                      log.tipo === 'perda' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{log.tipo}</span>
                  </td>
                  <td className={`px-3 py-2 text-right text-sm font-medium ${log.quantidade < 0 ? 'text-red-600' : log.tipo === 'venda' || log.tipo === 'perda' ? 'text-red-600' : 'text-green-600'}`}>
                    {log.tipo === 'entrada' || log.tipo === 'producao' && log.quantidade > 0 ? '+' : ''}{log.quantidade}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">{log.origem || '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-400 max-w-[200px] truncate">{log.motivo || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Nenhuma movimentação encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
