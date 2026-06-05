import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { useValidade } from '../context/ValidadeContext'
import { useGastos } from '../context/GastosContext'
import { usePreco } from '../context/PrecoContext'
import { aplicarLimites, calcularResumo, getItensCriticos, getItensBaixo, getTotalGeral } from '../utils/estoque'
import { CATEGORIAS_BASE, getIconeCategoria, ItemEstoque, DESPESA_TIPOS } from '../types'
import StatusCard from '../components/StatusCard'
import TabelaEstoque from '../components/TabelaEstoque'
import { useConfirm } from '../context/ConfirmContext'

type Aba = 'geral' | 'repor' | 'categorias'

const abas: { id: Aba; label: string; icon: string }[] = [
  { id: 'geral', label: 'Geral', icon: '📊' },
  { id: 'repor', label: 'Estoque para Repor', icon: '⚠️' },
  { id: 'categorias', label: 'Por Categoria', icon: '📂' },
]

function BarraProgresso({ ok, baixo, critico }: { ok: number; baixo: number; critico: number }) {
  const total = ok + baixo + critico
  if (total === 0) return <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
  return (
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full flex overflow-hidden">
      {ok > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${(ok / total) * 100}%` }} />}
      {baixo > 0 && <div className="bg-yellow-500 h-full transition-all" style={{ width: `${(baixo / total) * 100}%` }} />}
      {critico > 0 && <div className="bg-red-500 h-full transition-all" style={{ width: `${(critico / total) * 100}%` }} />}
    </div>
  )
}

function CardCategoriaDetalhado({ icone, nome, total, ok, baixo, critico }: { icone: string; nome: string; total: number; ok: number; baixo: number; critico: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-black/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
          {icone} {nome}
        </h3>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{total} itens</span>
      </div>
      <BarraProgresso ok={ok} baixo={baixo} critico={critico} />
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{ok}</p>
          <p className="text-[10px] text-gray-400 uppercase">OK</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{baixo}</p>
          <p className="text-[10px] text-gray-400 uppercase">Baixo</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{critico}</p>
          <p className="text-[10px] text-gray-400 uppercase">Crítico</p>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, getLimites, adicionarQuantidade, definirQuantidade, todosItens, version } = useStock()
  const { logs, addLog } = useLog()
  const { getLotesProximosVencer, getLotesVencidos, removerLote } = useValidade()
  const { adicionarDespesa } = useGastos()
  const { precos } = usePreco()
  const confirm = useConfirm()
  const [aba, setAba] = useState<Aba>('geral')

  const dados = useMemo(() => ({
    acai: aplicarLimites(data.acai || [], getLimites),
    sorvetes: aplicarLimites(data.sorvetes || [], getLimites),
    materias_primas: aplicarLimites(data.materias_primas || [], getLimites),
    personalizados: aplicarLimites(data.personalizados || [], getLimites),
  }), [data, getLimites])

  const todosComAlertas = useMemo(() =>
    [...dados.acai, ...dados.sorvetes, ...dados.materias_primas, ...dados.personalizados],
  [dados])

  const criticos = getItensCriticos({ acai: dados.acai, sorvetes: dados.sorvetes, materias_primas: dados.materias_primas, personalizados: dados.personalizados })
  const baixos = getItensBaixo({ acai: dados.acai, sorvetes: dados.sorvetes, materias_primas: dados.materias_primas, personalizados: dados.personalizados })

  const criticosPersonalizados = dados.personalizados.filter(i => i.alerta === 'critico')
  const baixosPersonalizados = dados.personalizados.filter(i => i.alerta === 'baixo')
  const todosBaixos = [...baixos, ...baixosPersonalizados]
  const todosCriticos = [...criticos, ...criticosPersonalizados]
  const itensAlerta = [...todosCriticos, ...todosBaixos]

  const totalGeral = getTotalGeral({ acai: dados.acai, sorvetes: dados.sorvetes, materias_primas: dados.materias_primas, personalizados: dados.personalizados })

  const categoriasDinamicas = useMemo(() => {
    const slugs = new Set(dados.personalizados.map(i => i.categoria))
    return Array.from(slugs).map(slug => {
      const itens = dados.personalizados.filter(i => i.categoria === slug)
      const r = calcularResumo(itens)
      const base = CATEGORIAS_BASE.find(c => c.slug === slug)
      return {
        nome: base?.nome || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        slug,
        itens,
        ...r,
        cor: base?.cor || '#6B7280',
        icone: getIconeCategoria(slug),
      }
    })
  }, [dados.personalizados])

  const categoriasBaseComDados = CATEGORIAS_BASE.map(cat => {
    const itens = dados[cat.slug as keyof typeof dados] as typeof dados.acai
    const r = calcularResumo(itens)
    return { ...cat, itens, total: itens.length, ...r }
  })

  const todasCategorias = [
    ...categoriasBaseComDados,
    ...categoriasDinamicas,
  ]

  const lotesProximos = useMemo(() => getLotesProximosVencer(15), [getLotesProximosVencer, version])
  const lotesVencidos = useMemo(() => getLotesVencidos(), [getLotesVencidos, version])

  const ultimasMov = useMemo(() => logs.slice(0, 8), [logs])

  const totalEstoque = todosComAlertas.reduce((sum, i) => sum + i.quantidadeAtual, 0)
  const saudePercentual = totalGeral.total > 0 ? Math.round((totalGeral.ok / totalGeral.total) * 100) : 0

function ItemRepor({ item, adicionarQuantidade, addLog }: { item: ItemEstoque; adicionarQuantidade: (id: string, qtd: number) => void; addLog: (tipo: any, id: string, nome: string, qtd: number, origem?: string) => void }) {
  const [qtd, setQtd] = useState(0)
  function handleAdd() {
    if (qtd <= 0) return
    adicionarQuantidade(item.id, qtd)
    addLog('entrada', item.id, item.nome, qtd, 'Reposição')
    setQtd(0)
  }
  return (
    <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 rounded-lg px-3 py-2 text-sm">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${item.alerta === 'critico' ? 'bg-red-500' : 'bg-yellow-500'}`} />
        <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{item.nome}</span>
        <span className="text-xs text-gray-400 shrink-0">{item.quantidadeAtual} {item.unidade}</span>
        {item.quantidadeMinima > 0 && (
          <span className="text-xs text-gray-400 shrink-0">mín: {item.quantidadeMinima}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          min={0}
          value={qtd || ''}
          onChange={e => setQtd(Math.max(0, Number(e.target.value)))}
          onFocus={e => e.target.select()}
          placeholder="qtd"
          className="w-16 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          onClick={handleAdd}
          disabled={qtd <= 0}
          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

function getSaudeCor(pct: number) {
    if (pct >= 80) return { cor: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', label: 'Bom' }
    if (pct >= 50) return { cor: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500', label: 'Atenção' }
    return { cor: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', label: 'Crítico' }
  }
  const saude = getSaudeCor(saudePercentual)

  function tipoMovLabel(tipo: string) {
    const map: Record<string, string> = { entrada: 'Entrada', saida: 'Saída', venda: 'Venda', producao: 'Produção', perda: 'Perda', ajuste: 'Ajuste' }
    return map[tipo] || tipo
  }

  return (
    <div className="space-y-6" key={version}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📊 Dashboard</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Visão geral do estoque: saúde dos itens, últimas movimentações, validades próximas e itens que precisam de reposição.</p>
      </div>

      {/* ════════ ABAS ════════ */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {abas.map(tab => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              aba === tab.id
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════ ABA: GERAL ════════ */}
      {aba === 'geral' && (
        <div className="space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatusCard titulo="Total de Itens" valor={todosComAlertas.length} descricao="itens cadastrados" cor="#4F46E5">
              <p className="text-xs text-gray-400 mt-1">~{totalEstoque} unidades em estoque</p>
            </StatusCard>
            <StatusCard titulo="Estoque OK" valor={totalGeral.ok} descricao="dentro do normal" cor="#16A34A" />
            <StatusCard titulo="Precisa Repor" valor={todosBaixos.length} descricao="itens com estoque baixo" cor="#D97706" />
            <StatusCard titulo="Crítico" valor={todosCriticos.length} descricao="itens em falta" cor="#DC2626" />
          </div>

          {/* Saúde geral + alertas rápidos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-black/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span>❤️</span>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Saúde do Estoque</h3>
                </div>
                <span className={`text-lg font-bold ${saude.cor}`}>{saudePercentual}%</span>
              </div>
              <BarraProgresso ok={totalGeral.ok} baixo={totalGeral.baixo} critico={totalGeral.critico} />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{totalGeral.ok} OK</span>
                <span>{totalGeral.baixo} baixo</span>
                <span>{totalGeral.critico} crítico</span>
              </div>
              {(itensAlerta.length > 0) && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    ⚠️ {itensAlerta.length} item(ns) precisam de reposição — veja na aba "Estoque para Repor"
                  </p>
                </div>
              )}
              {(lotesVencidos.length > 0 || lotesProximos.length > 0) && (
                <div className={`mt-2 p-3 rounded-lg border ${lotesVencidos.length > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900'}`}>
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">
                    📅 {lotesVencidos.length} lote(s) vencido(s) — <button onClick={() => setAba('geral')} className="underline">descartar abaixo</button>
                    {lotesProximos.length > 0 && <> · {lotesProximos.length} a vencer em 15 dias</>}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-black/20">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">📦 Total por Categoria</h3>
              <div className="space-y-3">
                {categoriasBaseComDados.map(cat => (
                  <div key={cat.slug} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{cat.icone} {cat.nome}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.total}</span>
                  </div>
                ))}
                {categoriasDinamicas.map(cat => (
                  <div key={cat.slug} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{cat.icone} {cat.nome}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cat.itens.length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cards por categoria */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">Situação por Categoria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriasBaseComDados.map(cat => (
                <CardCategoriaDetalhado key={cat.slug} icone={cat.icone} nome={cat.nome} total={cat.total} ok={cat.ok} baixo={cat.baixo} critico={cat.critico} />
              ))}
              {categoriasDinamicas.map(cat => (
                <CardCategoriaDetalhado key={cat.slug} icone={cat.icone} nome={cat.nome} total={cat.itens.length} ok={cat.ok} baixo={cat.baixo} critico={cat.critico} />
              ))}
            </div>
          </div>

          {/* Últimas movimentações + validades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-black/20">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">🔄 Últimas Movimentações</h3>
              {ultimasMov.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">Nenhuma movimentação ainda</p>
              ) : (
                <div className="space-y-2">
                  {ultimasMov.map(mov => (
                    <div key={mov.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                          mov.tipo === 'entrada' || mov.tipo === 'venda' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                          mov.tipo === 'saida' || mov.tipo === 'perda' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                          'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>{tipoMovLabel(mov.tipo)}</span>
                        <span className="truncate text-gray-800 dark:text-gray-200 font-medium">{mov.itemNome}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-semibold ${mov.quantidade > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(mov.data).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-black/20">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">📅 Validades</h3>
              {lotesVencidos.length === 0 && lotesProximos.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">Nenhum lote com validade próxima</p>
              ) : (
                <div className="space-y-3">
                  {lotesVencidos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">🔴 Vencidos — jogar fora ({lotesVencidos.length})</p>
                      <div className="space-y-1.5">
                        {lotesVencidos.slice(0, 6).map(l => {
                          const item = todosItens.find(i => i.id === l.itemId)
                          return (
                            <div key={l.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                              <div className="min-w-0 flex-1">
                                <span className="text-gray-800 dark:text-gray-200 font-medium text-xs block truncate">{l.itemNome}</span>
                                <span className="text-[10px] text-red-500">{l.quantidade} {item?.unidade || 'un'} · Venceu {new Date(l.dataValidade).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <button onClick={async () => {
                                if (await confirm({ title: 'Descartar lote vencido?', message: `Descartar ${l.quantidade} ${item?.unidade || 'un'} de "${l.itemNome}" (vencido)? Isso registra uma perda financeira.`, confirmText: 'Descartar', variant: 'danger', icon: '🗑️' })) {
                                  const atual = item?.quantidadeAtual ?? 0
                                  const p = precos.find(p => p.itemId === l.itemId)
                                  const valorPerda = (p?.precoCusto || 0) * l.quantidade
                                  definirQuantidade(l.itemId, Math.max(0, atual - l.quantidade))
                                  removerLote(l.id)
                                  addLog('perda', l.itemId, l.itemNome, l.quantidade, 'Dashboard', 'Vencido')
                                  if (valorPerda > 0) {
                                    adicionarDespesa('perda', valorPerda, `${l.itemNome} vencido (${l.quantidade} ${item?.unidade || 'un'})`, new Date().toISOString().slice(0, 10), `Lote descartado - venceu em ${l.dataValidade}`)
                                  }
                                }
                              }}
                                className="shrink-0 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 bg-red-100 dark:bg-red-900/50 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 active:bg-red-300 transition-colors">
                                🗑️ Descartar
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {lotesProximos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1.5">🟡 A vencer em breve ({lotesProximos.length})</p>
                      <div className="space-y-1">
                        {lotesProximos.slice(0, 4).map(l => {
                          const dias = Math.ceil((new Date(l.dataValidade).getTime() - Date.now()) / 86400000)
                          const item = todosItens.find(i => i.id === l.itemId)
                          return (
                            <div key={l.id} className="flex items-center justify-between text-sm py-1">
                              <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{l.itemNome}</span>
                              <span className="text-xs text-yellow-500 shrink-0">{l.quantidade} {item?.unidade || ''} · {dias}d</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabela rápida de alertas */}
          {itensAlerta.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">Itens que Precisam de Reposição</h3>
              <TabelaEstoque itens={itensAlerta} />
            </div>
          )}
        </div>
      )}

      {/* ════════ ABA: REPOR ════════ */}
      {aba === 'repor' && (
        <>
          {itensAlerta.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-medium">Nenhum item precisa de reposição</p>
              <p className="text-sm mt-1">Todos os itens estão dentro do nível mínimo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todosCriticos.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
                    🔴 Críticos ({todosCriticos.length})
                  </h3>
                  <div className="space-y-2">
                    {todosCriticos.map(item => (
                      <ItemRepor key={item.id} item={item} adicionarQuantidade={adicionarQuantidade} addLog={addLog} />
                    ))}
                  </div>
                </div>
              )}
              {todosBaixos.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
                    🟡 Baixos ({todosBaixos.length})
                  </h3>
                  <div className="space-y-2">
                    {todosBaixos.map(item => (
                      <ItemRepor key={item.id} item={item} adicionarQuantidade={adicionarQuantidade} addLog={addLog} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ════════ ABA: CATEGORIAS ════════ */}
      {aba === 'categorias' && (
        <div className="space-y-6">
          {todasCategorias.map(cat => (
            <div key={cat.slug} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  {cat.icone} {cat.nome}
                </h3>
                <span className="text-xs text-gray-400">
                  {cat.ok} OK · {cat.baixo} baixo · {cat.critico} crítico
                </span>
              </div>
              <div className="p-4 md:p-6">
                <TabelaEstoque itens={cat.itens} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
