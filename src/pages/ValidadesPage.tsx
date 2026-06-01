import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { useValidade } from '../context/ValidadeContext'
import { useLog } from '../context/LogContext'

export default function ValidadesPage() {
  const { todosItens, definirQuantidade } = useStock()
  const { lotes, adicionarLote, consumirLote, removerLote, getLotesVencidos, getLotesProximosVencer } = useValidade()
  const { addLog } = useLog()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [novoItem, setNovoItem] = useState('')
  const [novoQtd, setNovoQtd] = useState(0)
  const [novoValidade, setNovoValidade] = useState('')
  const [novoObs, setNovoObs] = useState('')

  const vencidos = useMemo(() => getLotesVencidos(), [getLotesVencidos])
  const proximos = useMemo(() => getLotesProximosVencer(15), [getLotesProximosVencer])

  const hoje = new Date()

  function adicionar() {
    if (!novoItem || novoQtd <= 0 || !novoValidade) return
    const item = todosItens.find(i => i.id === novoItem)
    if (!item) return
    adicionarLote(novoItem, item.nome, novoQtd, novoValidade, novoObs || undefined)
    setNovoItem(''); setNovoQtd(0); setNovoValidade(''); setNovoObs('')
    setMostrarForm(false)
  }

  function baixarLote(loteId: string) {
    if (consumirLote.length === 0) return
    consumirLote(loteId, 999999)
  }

  function handleRemoverLote(loteId: string, itemId: string, itemNome: string, quantidade: number) {
    removerLote(loteId)
    addLog('perda', itemId, itemNome, quantidade, 'Validade', 'Lote removido (vencido/descartado)')
  }

  function getStatus(dataValidade: string): { label: string; cor: string } {
    const val = new Date(dataValidade)
    const diff = Math.ceil((val.getTime() - hoje.getTime()) / 86400000)
    if (diff < 0) return { label: 'Vencido', cor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
    if (diff <= 7) return { label: `Vence em ${diff}d`, cor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' }
    if (diff <= 15) return { label: `Vence em ${diff}d`, cor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' }
    return { label: val.toLocaleDateString('pt-BR'), cor: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' }
  }

  function getNome(id: string) {
    return todosItens.find(i => i.id === id)?.nome || id
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">📅 Validades</h1>
          <p className="text-sm text-gray-400 mt-1">Controle de lotes e vencimentos</p>
        </div>
        <button onClick={() => setMostrarForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">+ Novo Lote</button>
      </div>

      {vencidos.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">⚠️ {vencidos.length} lote(s) vencido(s)</h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Remova os lotes vencidos para dar baixa no estoque.</p>
        </div>
      )}

      {proximos.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">🔔 {proximos.length} lote(s) próximos ao vencimento</h3>
        </div>
      )}

      {mostrarForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Novo Lote</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={novoItem} onChange={e => setNovoItem(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg">
              <option value="">Selecione o item</option>
              {todosItens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
            <input type="number" value={novoQtd} min={0} onChange={e => setNovoQtd(Number(e.target.value))}
              placeholder="Quantidade" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg" />
            <input type="date" value={novoValidade} onChange={e => setNovoValidade(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg" />
            <input type="text" value={novoObs} onChange={e => setNovoObs(e.target.value)}
              placeholder="Observação" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <button onClick={adicionar} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Adicionar</button>
            <button onClick={() => setMostrarForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-700 rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Item</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Qtd</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Validade</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Entrada</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Obs</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {lotes.map(lote => {
                const status = getStatus(lote.dataValidade)
                return (
                  <tr key={lote.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{lote.itemNome}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lote.quantidade}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cor}`}>{status.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(lote.dataEntrada).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[150px] truncate">{lote.observacao || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleRemoverLote(lote.id, lote.itemId, lote.itemNome, lote.quantidade)}
                        className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/40 rounded-md hover:bg-red-100">Descartar</button>
                    </td>
                  </tr>
                )
              })}
              {lotes.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum lote cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
