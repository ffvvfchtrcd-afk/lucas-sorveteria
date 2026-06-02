import { useState, useMemo } from 'react'
import { useGastos } from '../context/GastosContext'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { DESPESA_TIPOS, DespesaTipo } from '../types'

interface LotePreview {
  id: string
  tipo: DespesaTipo
  valor: number
  descricao: string
  data: string
  itemPerda?: string
  qtdPerda?: number
}

function autoCategoria(texto: string): DespesaTipo {
  const t = texto.toLowerCase()
  if (/aluguel/.test(t)) return 'aluguel'
  if (/luz|energia|conta de luz/.test(t)) return 'energia'
  if (/agua|conta de água/.test(t)) return 'agua'
  if (/internet|wi-?fi|wifi|net/.test(t)) return 'internet'
  if (/salario|salário|funcionário|funcionario|empregado|folha/.test(t)) return 'salario'
  if (/manutenção|manutencao|conserto|reparo|troca|quebr/.test(t)) return 'manutencao'
  if (/imposto|taxa|iss|icms|simples|nota fiscal/.test(t)) return 'imposto'
  if (/perda|perdeu|venceu|estragou|joguei fora|quebrou|lixo/.test(t)) return 'perda'
  return 'outros'
}

function parseLinha(linha: string): { valor: number; descricao: string; data: string; tipo: DespesaTipo; itemPerda?: string; qtdPerda?: number } | null {
  const t = linha.trim()
  if (!t) return null

  const valorMatch = t.match(/(\d+[.,]?\d*)/)
  if (!valorMatch) return null
  const valor = parseFloat(valorMatch[1].replace(',', '.'))
  if (valor <= 0) return null

  const dataMatch = t.match(/dia\s+(\d{1,2})/)
  const hoje = new Date()
  const dia = dataMatch ? Math.min(31, Math.max(1, parseInt(dataMatch[1]))) : hoje.getDate()
  const dataStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  const descricao = t.replace(/\d+[.,]?\d*/g, '').replace(/dia\s+\d{1,2}/g, '').replace(/[,;:]/g, '').trim()
  const tipo = autoCategoria(t)

  // Se for perda, tenta extrair quantidade + item
  let itemPerda: string | undefined
  let qtdPerda: number | undefined
  if (tipo === 'perda') {
    const qtdMatch = t.match(/(\d+[.,]?\d*)\s*(kg|g|l|ml|un|cx|pct|fardo|litro|quilo|quilos|kgs?)/i) || t.match(/(kg|g|l|ml|un|cx|pct|fardo)\s*de\s+(\S+)/i)
    if (qtdMatch) {
      qtdPerda = parseFloat(qtdMatch[1].replace(',', '.'))
      itemPerda = descricao.replace(/perda|perdi|joguei fora|descartei|estragou|estragado/i, '').trim()
    }
  }

  return { valor, descricao: descricao || 'Gasto', data: dataStr, tipo, itemPerda, qtdPerda }
}

export default function GastosPage() {
  const { despesas, adicionarDespesa, removerDespesa } = useGastos()
  const { adicionarQuantidade, definirQuantidade, todosItens } = useStock()
  const { addLog } = useLog()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [tipo, setTipo] = useState<DespesaTipo>('energia')
  const [valor, setValor] = useState(0)
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [observacao, setObservacao] = useState('')
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7))
  const [rapidoTexto, setRapidoTexto] = useState('')
  const [loteTexto, setLoteTexto] = useState('')
  const [preview, setPreview] = useState<LotePreview[]>([])
  const [aba, setAba] = useState<'registro' | 'historico'>('historico')

  function registrarRapido() {
    const t = rapidoTexto.trim()
    if (!t) return
    const parsed = parseLinha(t)
    if (!parsed) return
    adicionarDespesa(parsed.tipo, parsed.valor, parsed.descricao, parsed.data)
    if (parsed.tipo === 'perda') processarPerda(parsed.descricao, parsed.valor)
    setRapidoTexto('')
  }

  function processarPerda(descricao: string, valor: number) {
    const nome = descricao.toLowerCase()
    const item = todosItens.find(i => nome.includes(i.nome.toLowerCase()))
    if (item && item.quantidadeAtual > 0) {
      const qtd = Math.min(item.quantidadeAtual, Math.ceil(valor / 10) || 1)
      definirQuantidade(item.id, item.quantidadeAtual - qtd)
      addLog?.('perda', item.id, item.nome, qtd, 'GastosPage', `Perda financeira: ${descricao}`)
    }
  }

  function processarLote() {
    const linhas = loteTexto.split('\n').filter(l => l.trim())
    const resultados: LotePreview[] = []
    for (const linha of linhas) {
      const parsed = parseLinha(linha)
      if (parsed) {
        resultados.push({
          id: `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          tipo: parsed.tipo,
          valor: parsed.valor,
          descricao: parsed.descricao,
          data: parsed.data,
          itemPerda: parsed.itemPerda,
          qtdPerda: parsed.qtdPerda,
        })
      }
    }
    setPreview(resultados)
  }

  function confirmarLote() {
    for (const item of preview) {
      adicionarDespesa(item.tipo, item.valor, item.descricao, item.data)
      if (item.tipo === 'perda') processarPerda(item.descricao, item.valor)
    }
    setPreview([])
    setLoteTexto('')
  }

  function handleAdicionar() {
    if (valor <= 0 || !descricao.trim()) return
    adicionarDespesa(tipo, valor, descricao.trim(), data, observacao.trim() || undefined)
    if (tipo === 'perda') processarPerda(descricao, valor)
    setValor(0); setDescricao(''); setObservacao(''); setMostrarForm(false)
  }

  const filtradas = useMemo(() => {
    return despesas
      .filter(d => d.data.startsWith(filtroMes))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [despesas, filtroMes])

  const totalMes = useMemo(() => filtradas.reduce((s, d) => s + d.valor, 0), [filtradas])

  const porTipo = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of filtradas) map.set(d.tipo, (map.get(d.tipo) || 0) + d.valor)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [filtradas])

  const meses = useMemo(() => {
    const set = new Set(despesas.map(d => (d.data || '').slice(0, 7)))
    const lista = Array.from(set).sort().reverse()
    const atual = new Date().toISOString().slice(0, 7)
    if (!lista.includes(atual)) lista.unshift(atual)
    return lista
  }, [despesas])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">💰 Financeiro</h1>
          <p className="text-xs text-gray-400 mt-0.5">Receitas, despesas, perdas — tudo que entra e sai de dinheiro.</p>
        </div>
        <button onClick={() => setMostrarForm(true)}
          className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">+ Novo</button>
      </div>

      {/* Abas: Registro vs Histórico */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
        <button onClick={() => setAba('registro')}
          className={`flex-1 min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${aba === 'registro' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>📝 Lançamento</button>
        <button onClick={() => setAba('historico')}
          className={`flex-1 min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${aba === 'historico' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>📋 Histórico</button>
      </div>

      {aba === 'registro' && (
        <div className="space-y-4">
          {/* Registro Rápido - linha única */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-2">
            <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-200">⚡ Registro Rápido</h3>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400">Digite naturalmente — a categoria sai automático</p>
            <div className="flex gap-2">
              <input type="text" value={rapidoTexto} onChange={e => setRapidoTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && registrarRapido()}
                placeholder="Ex: gastei 50 no dia 15 com transporte"
                className="flex-1 px-3 py-2.5 text-sm border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button onClick={registrarRapido}
                className="min-h-[44px] px-4 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 shrink-0">+</button>
            </div>
          </div>

          {/* Lançamento em Lote */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">📋 Lançamento em Lote</h3>
                <p className="text-[10px] text-gray-400">Cole uma lista de gastos — um por linha. Perda também dá baixa no estoque.</p>
              </div>
            </div>
            <textarea value={loteTexto} onChange={e => setLoteTexto(e.target.value)}
              rows={5}
              placeholder="gastei 1000 de aluguel dia 5&#10;paguei 200 de luz&#10;joguei fora 5kg de acai que estragou&#10;comprei 50 de gasolina&#10;paguei 30 de internet dia 10"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono" />
            <button onClick={processarLote}
              className="min-h-[44px] w-full text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800">🔍 Processar Lista</button>
          </div>

          {/* Preview do Lote */}
          {preview.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-green-200 dark:border-green-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-green-700 dark:text-green-300">✓ Preview — {preview.length} item(ns)</h3>
                <span className="text-sm font-bold text-green-600">R$ {preview.reduce((s, i) => s + i.valor, 0).toFixed(2)}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-48 overflow-y-auto">
                {preview.map(item => {
                  const info = DESPESA_TIPOS.find(t => t.value === item.tipo)
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-800 dark:text-gray-200 truncate">{info?.icone} {item.descricao}</p>
                        <p className="text-[10px] text-gray-400">{info?.label} · {item.data}{item.tipo === 'perda' ? ' 🗑️ +baixa estoque' : ''}</p>
                      </div>
                      <span className="font-medium text-red-600 shrink-0 ml-2">R$ {item.valor.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
              <button onClick={confirmarLote}
                className="min-h-[44px] w-full text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 active:bg-green-800">✓ Confirmar e Registrar Tudo</button>
              <button onClick={() => setPreview([])}
                className="text-xs text-gray-400 underline w-full text-center">Cancelar</button>
            </div>
          )}

          {/* Formulário manual completo */}
          {mostrarForm && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Formulário Manual</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Tipo *</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as DespesaTipo)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {DESPESA_TIPOS.map(t => <option key={t.value} value={t.value}>{t.icone} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Valor (R$) *</label>
                  <input type="number" value={valor || ''} min={0} step={0.01}
                    onChange={e => setValor(Number(e.target.value))}
                    placeholder="Ex: 450.00"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Descrição *</label>
                <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Conta de luz julho, aluguel mês..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Data *</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Observação</label>
                  <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              {tipo === 'perda' && (
                <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">🗑️ Perda também dará baixa automática no estoque.</p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={handleAdicionar}
                  className="min-h-[44px] flex-1 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800">✓ Adicionar</button>
                <button onClick={() => setMostrarForm(false)}
                  className="min-h-[44px] px-5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {aba === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {meses.map(m => <option key={m} value={m}>{m.replace(/-/g, '/')}</option>)}
            </select>
            <span className="text-xs text-gray-400">{filtradas.length} registro(s)</span>
            <span className="ml-auto text-sm font-bold text-red-600">R$ {totalMes.toFixed(2)}</span>
          </div>

          {porTipo.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Resumo por Tipo</h3>
              <div className="space-y-3">
                {porTipo.map(([t, total]) => {
                  const info = DESPESA_TIPOS.find(dt => dt.value === t)
                  const pct = totalMes > 0 ? (total / totalMes) * 100 : 0
                  return (
                    <div key={t}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{info?.icone} {info?.label || t}</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">R$ {total.toFixed(2)} <span className="text-[10px] text-gray-400">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Registros</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtradas.map(d => {
                const info = DESPESA_TIPOS.find(dt => dt.value === d.tipo)
                return (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{info?.icone} {d.descricao}</p>
                      <p className="text-[10px] text-gray-400">{info?.label} · {new Date(d.data).toLocaleDateString('pt-BR')}{d.observacao ? ` · ${d.observacao}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-red-600">-R$ {d.valor.toFixed(2)}</span>
                      <button onClick={() => { if (window.confirm(`Remover "${d.descricao}"?`)) removerDespesa(d.id) }}
                        className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                    </div>
                  </div>
                )
              })}
              {filtradas.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <p className="text-2xl mb-1">💸</p>
                  <p>Nenhum gasto neste mês</p>
                  <p className="text-xs mt-1">Registre na aba "Lançamento".</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
