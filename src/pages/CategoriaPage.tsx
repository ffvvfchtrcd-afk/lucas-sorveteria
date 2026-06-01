import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useStock } from '../context/StockContext'
import { aplicarLimites, calcularResumo } from '../utils/estoque'
import { CATEGORIAS_BASE, getIconeCategoria } from '../types'
import StatusCard from '../components/StatusCard'
import TabelaEstoque from '../components/TabelaEstoque'
import AlertasEstoque from '../components/AlertasEstoque'

export default function CategoriaPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data, getLimites, version } = useStock()

  const info = useMemo(() => {
    const base = CATEGORIAS_BASE.find(c => c.slug === slug)
    const nome = base?.nome || (slug ? slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Desconhecida')
    const icone = base?.icone || getIconeCategoria(slug || '')
    return { nome, icone }
  }, [slug])

  const itens = useMemo(() => {
    if (!slug) return []
    const all = [...data.acai, ...data.sorvetes, ...data.materias_primas, ...data.personalizados]
    return aplicarLimites(all.filter(i => i.categoria === slug), getLimites)
  }, [slug, data, getLimites])

  const resumo = calcularResumo(itens)
  const criticos = itens.filter(i => i.alerta === 'critico')
  const baixos = itens.filter(i => i.alerta === 'baixo')

  return (
    <div className="space-y-6" key={version}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{info.icone} Estoque — {info.nome}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Gerenciamento de {info.nome.toLowerCase()}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard titulo="Total de Itens" valor={itens.length} descricao="itens cadastrados" cor="#6B7280" />
        <StatusCard titulo="OK" valor={resumo.ok} descricao="dentro do normal" cor="#16A34A" />
        <StatusCard titulo="Estoque Baixo" valor={resumo.baixo} descricao="precisa repor" cor="#D97706" />
        <StatusCard titulo="Crítico" valor={resumo.critico} descricao="repor urgente" cor="#DC2626" />
      </div>

      {criticos.length > 0 && <AlertasEstoque itens={criticos} tipo="critico" />}
      {baixos.length > 0 && <AlertasEstoque itens={baixos} tipo="baixo" />}

      {itens.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Nenhum item nesta categoria</div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Todos os Itens</h2>
          <TabelaEstoque itens={itens} />
        </div>
      )}
    </div>
  )
}
