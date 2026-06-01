import { useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { aplicarLimites, calcularResumo, getItensCriticos, getItensBaixo, getTotalGeral } from '../utils/estoque'
import { CATEGORIAS_BASE, getIconeCategoria } from '../types'
import StatusCard from '../components/StatusCard'
import AlertasEstoque from '../components/AlertasEstoque'

export default function Dashboard() {
  const { data, getLimites, version } = useStock()

  const dados = useMemo(() => ({
    acai: aplicarLimites(data.acai || [], getLimites),
    sorvetes: aplicarLimites(data.sorvetes || [], getLimites),
    materias_primas: aplicarLimites(data.materias_primas || [], getLimites),
    personalizados: aplicarLimites(data.personalizados || [], getLimites),
  }), [data, getLimites])

  const todosComAlertas = useMemo(() =>
    [...dados.acai, ...dados.sorvetes, ...dados.materias_primas, ...dados.personalizados],
  [dados])

  const resumo = getTotalGeral({ acai: dados.acai, sorvetes: dados.sorvetes, materias_primas: dados.materias_primas })
  const criticos = getItensCriticos({ acai: dados.acai, sorvetes: dados.sorvetes, materias_primas: dados.materias_primas })
  const baixos = getItensBaixo({ acai: dados.acai, sorvetes: dados.sorvetes, materias_primas: dados.materias_primas })

  const resumoPersonalizados = calcularResumo(dados.personalizados)
  const criticosPersonalizados = dados.personalizados.filter(i => i.alerta === 'critico')
  const baixosPersonalizados = dados.personalizados.filter(i => i.alerta === 'baixo')

  const categoriasDinamicas = useMemo(() => {
    const slugs = new Set(dados.personalizados.map(i => i.categoria))
    return Array.from(slugs).map(slug => {
      const itens = dados.personalizados.filter(i => i.categoria === slug)
      const r = calcularResumo(itens)
      const base = CATEGORIAS_BASE.find(c => c.slug === slug)
      return {
        nome: base?.nome || slug,
        slug,
        totalItens: itens.length,
        itensOk: r.ok,
        itensBaixo: r.baixo,
        itensCritico: r.critico,
        cor: base?.cor || '#6B7280',
        icone: getIconeCategoria(slug),
      }
    })
  }, [dados.personalizados])

  return (
    <div className="space-y-6" key={version}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📊 Dashboard</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Visão geral do estoque</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard titulo="Total de Itens" valor={todosComAlertas.length} descricao="itens cadastrados no estoque" cor="#4F46E5" />
        <StatusCard titulo="Estoque OK" valor={todosComAlertas.filter(i => i.alerta === 'ok').length} descricao="itens dentro do normal" cor="#16A34A" />
        <StatusCard titulo="Estoque Baixo" valor={todosComAlertas.filter(i => i.alerta === 'baixo').length} descricao="itens precisando de reposição" cor="#D97706" />
        <StatusCard titulo="Estoque Crítico" valor={todosComAlertas.filter(i => i.alerta === 'critico').length} descricao="itens em falta ou quase sem" cor="#DC2626" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {CATEGORIAS_BASE.map(cat => {
          const itens = dados[cat.slug as keyof typeof dados] as typeof dados.acai
          const r = calcularResumo(itens)
          return (
            <div key={cat.slug} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-black/20">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                {cat.icone} {cat.nome}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total</span><span className="font-semibold text-gray-800 dark:text-gray-200">{itens.length} itens</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">OK</span><span className="font-semibold text-green-600 dark:text-green-400">{r.ok}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600 dark:text-yellow-400">Baixo</span><span className="font-semibold text-yellow-600 dark:text-yellow-400">{r.baixo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600 dark:text-red-400">Crítico</span><span className="font-semibold text-red-600 dark:text-red-400">{r.critico}</span>
                </div>
              </div>
            </div>
          )
        })}
        {categoriasDinamicas.map(cat => (
          <div key={cat.slug} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-black/20">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              {cat.icone} {cat.nome}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total</span><span className="font-semibold text-gray-800 dark:text-gray-200">{cat.totalItens} itens</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">OK</span><span className="font-semibold text-green-600 dark:text-green-400">{cat.itensOk}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-600 dark:text-yellow-400">Baixo</span><span className="font-semibold text-yellow-600 dark:text-yellow-400">{cat.itensBaixo}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600 dark:text-red-400">Crítico</span><span className="font-semibold text-red-600 dark:text-red-400">{cat.itensCritico}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(criticos.length > 0 || criticosPersonalizados.length > 0) && (
        <AlertasEstoque itens={[...criticos, ...criticosPersonalizados]} tipo="critico" />
      )}
      {(baixos.length > 0 || baixosPersonalizados.length > 0) && (
        <AlertasEstoque itens={[...baixos, ...baixosPersonalizados]} tipo="baixo" />
      )}
    </div>
  )
}
