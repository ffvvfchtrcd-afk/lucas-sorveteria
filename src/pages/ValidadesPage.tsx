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

  function getUnidade(id: string) {
    return todosItens.find(i => i.id === id)?.unidade || ''
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">📅 Validades (Lotes)</h1>
          <p className="text-sm text-gray-400 mt-1">Cadastre lotes com data de validade para cada produto. Itens próximos ao vencimento aparecem em amarelo, vencidos em vermelho — você pode descartar e registrar a perda automaticamente.</p>
        </div>
        <button onClick={() => setMostrarForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">+ Novo Lote</button>
      </div>

      {vencidos.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">⚠️</span>
          <div>
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">{vencidos.length} lote(s) vencido(s)</h3>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Clique em "Descartar" para remover do estoque e registrar como perda.</p>
          </div>
        </div>
      )}

      {proximos.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">🔔</span>
          <div>
            <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">{proximos.length} lote(s) próximos ao vencimento</h3>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Use ou venda esses itens antes do vencimento para evitar perdas.</p>
          </div>
        </div>
      )}

      {mostrarForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">➕ Novo Lote</h3>
            <p className="text-xs text-gray-400 mt-0.5">Registre um lote com data de validade para controle de vencimentos. Ao cadastrar, a quantidade é adicionada ao estoque automaticamente.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Produto <span className="text-red-400">*</span></label>
              <select value={novoItem} onChange={e => setNovoItem(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">— Selecione o produto —</option>
                {todosItens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
              <p className="text-[10px] text-gray-400 mt-0.5">Item que está recebendo o lote</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantidade <span className="text-red-400">*</span></label>
                <input type="number" value={novoQtd} min={0} onChange={e => setNovoQtd(Number(e.target.value))}
                  placeholder="Ex: 50"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <p className="text-[10px] text-gray-400 mt-0.5">Quantidade recebida neste lote {novoItem ? `(em ${getUnidade(novoItem)})` : ''}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Validade <span className="text-red-400">*</span></label>
              <input type="date" value={novoValidade} onChange={e => setNovoValidade(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <p className="text-[10px] text-gray-400 mt-0.5">Data em que o lote vence</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Observação <span className="text-gray-300">(opcional)</span></label>
              <input type="text" value={novoObs} onChange={e => setNovoObs(e.target.value)}
                placeholder="Ex: Fornecedor X, Nota fiscal..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <p className="text-[10px] text-gray-400 mt-0.5">Informações extras do lote (opcional)</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={adicionar} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Adicionar Lote</button>
            <button onClick={() => setMostrarForm(false)} className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">📋 Todos os Lotes</h3>
            <p className="text-xs text-gray-400 mt-0.5">{lotes.length} lote(s) cadastrado(s) · Controle de validade por lote</p>
          </div>
          <span className="text-xs text-gray-400">
            {lotes.filter(l => new Date(l.dataValidade) >= hoje).length} válidos · {vencidos.length} vencidos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Qtd (unid.)</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status / Validade</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Data de Entrada</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Observação</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {lotes.map(lote => {
                const status = getStatus(lote.dataValidade)
                return (
                  <tr key={lote.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{lote.itemNome}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lote.quantidade} <span className="text-[10px] text-gray-400">{getUnidade(lote.itemId)}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cor}`} title={lote.dataValidade}>{status.label}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(lote.dataEntrada).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[180px] truncate" title={lote.observacao || ''}>{lote.observacao || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => {
                        if (window.confirm(`Descartar lote de "${lote.itemNome}" (${lote.quantidade} ${getUnidade(lote.itemId)})? Isso dá baixa no estoque.`))
                          handleRemoverLote(lote.id, lote.itemId, lote.itemNome, lote.quantidade)
                      }}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/40 rounded-md hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors">Descartar</button>
                    </td>
                  </tr>
                )
              })}
              {lotes.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-400">Nenhum lote cadastrado. Clique em "+ Novo Lote" para começar.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
