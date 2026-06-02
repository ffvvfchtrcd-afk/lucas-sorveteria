import { useStock } from '../context/StockContext'
import { aplicarLimites, calcularResumo, getItensCriticos, getItensBaixo } from '../utils/estoque'
import StatusCard from '../components/StatusCard'
import TabelaEstoque from '../components/TabelaEstoque'
import AlertasEstoque from '../components/AlertasEstoque'

export default function AcaiPage() {
  const { data, getLimites, version } = useStock()
  const itens = aplicarLimites(data.acai, getLimites)
  const resumo = calcularResumo(itens)
  const criticos = getItensCriticos({ acai: itens, sorvetes: [], materias_primas: [], personalizados: [] })
  const baixos = getItensBaixo({ acai: itens, sorvetes: [], materias_primas: [], personalizados: [] })

  return (
    <div className="space-y-6" key={version}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🟣 Estoque — Açaí</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Acompanhe e gerencie os insumos de açaí. Itens em <span className="text-yellow-500">amarelo</span> precisam de reposição, em <span className="text-red-500">vermelho</span> estão críticos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard titulo="Total de Itens" valor={itens.length} descricao="itens cadastrados nesta categoria" cor="#7B2D8E" />
        <StatusCard titulo="OK" valor={resumo.ok} descricao="dentro do nível ideal" cor="#16A34A" />
        <StatusCard titulo="Estoque Baixo" valor={resumo.baixo} descricao="precisa repor em breve (🟡)" cor="#D97706" />
        <StatusCard titulo="Crítico" valor={resumo.critico} descricao="repor urgentemente (🔴)" cor="#DC2626" />
      </div>

      {criticos.length > 0 && <AlertasEstoque itens={criticos} tipo="critico" />}
      {baixos.length > 0 && <AlertasEstoque itens={baixos} tipo="baixo" />}

      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-5 w-1 bg-indigo-500 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Lista de Itens — Açaí</h2>
          <span className="text-xs text-gray-400">({itens.length} itens)</span>
        </div>
        <TabelaEstoque itens={itens} />
      </div>
    </div>
  )
}
