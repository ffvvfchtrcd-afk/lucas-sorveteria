import { useStock } from '../context/StockContext'
import { aplicarLimites, calcularResumo, getItensCriticos, getItensBaixo } from '../utils/estoque'
import StatusCard from '../components/StatusCard'
import TabelaEstoque from '../components/TabelaEstoque'
import AlertasEstoque from '../components/AlertasEstoque'

export default function SorvetesPage() {
  const { data, getLimites, version } = useStock()
  const itens = aplicarLimites(data.sorvetes, getLimites)
  const resumo = calcularResumo(itens)
  const criticos = getItensCriticos({ acai: [], sorvetes: itens, materias_primas: [] })
  const baixos = getItensBaixo({ acai: [], sorvetes: itens, materias_primas: [] })

  return (
    <div className="space-y-6" key={version}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🟠 Estoque — Sorvetes</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Gerenciamento de sorvetes, picolés e coberturas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard titulo="Total de Itens" valor={itens.length} descricao="itens cadastrados" cor="#E07B39" />
        <StatusCard titulo="OK" valor={resumo.ok} descricao="dentro do normal" cor="#16A34A" />
        <StatusCard titulo="Estoque Baixo" valor={resumo.baixo} descricao="precisa repor" cor="#D97706" />
        <StatusCard titulo="Crítico" valor={resumo.critico} descricao="repor urgente" cor="#DC2626" />
      </div>

      {criticos.length > 0 && <AlertasEstoque itens={criticos} tipo="critico" />}
      {baixos.length > 0 && <AlertasEstoque itens={baixos} tipo="baixo" />}

      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Todos os Itens</h2>
        <TabelaEstoque itens={itens} />
      </div>
    </div>
  )
}
