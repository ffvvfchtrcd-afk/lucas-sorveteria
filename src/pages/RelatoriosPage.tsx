import { useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { useValidade } from '../context/ValidadeContext'

export default function RelatoriosPage() {
  const { todosItens, data } = useStock()
  const { logs } = useLog()
  const { precos } = usePreco()
  const { getLotesVencidos } = useValidade()

  const vendas = useMemo(() => logs.filter(l => l.tipo === 'venda'), [logs])
  const producoes = useMemo(() => logs.filter(l => l.tipo === 'producao'), [logs])
  const perdas = useMemo(() => logs.filter(l => l.tipo === 'perda'), [logs])
  const entradas = useMemo(() => logs.filter(l => l.tipo === 'entrada'), [logs])

  const vendasPorDia = useMemo(() => {
    const map: Record<string, { qtd: number; total: number }> = {}
    for (const v of vendas) {
      const dia = v.data.slice(0, 10)
      if (!map[dia]) map[dia] = { qtd: 0, total: 0 }
      map[dia].qtd += v.quantidade
      const preco = precos.find(p => p.itemId === v.itemId)
      map[dia].total += (preco?.precoVenda || 0) * v.quantidade
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 30)
  }, [vendas, precos])

  const itensCriticos = useMemo(() => {
    return todosItens.filter(i => i.alerta === 'critico')
  }, [todosItens])

  const itensBaixo = useMemo(() => {
    return todosItens.filter(i => i.alerta === 'baixo')
  }, [todosItens])

  const listaCompras = useMemo(() => {
    return [...itensCriticos, ...itensBaixo].sort((a, b) => a.alerta === 'critico' && b.alerta !== 'critico' ? -1 : 1)
  }, [itensCriticos, itensBaixo])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">📊 Relatórios</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Visão geral do negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{vendas.length}</div>
          <div className="text-xs text-gray-400">Total de Vendas</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{producoes.length}</div>
          <div className="text-xs text-gray-400">Produções</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-red-600">{perdas.length}</div>
          <div className="text-xs text-gray-400">Perdas Registradas</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{entradas.length}</div>
          <div className="text-xs text-gray-400">Entradas</div>
        </div>
      </div>

      {listaCompras.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">🛒 Lista de Compras Sugerida</h2>
          <div className="space-y-2">
            {listaCompras.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.nome}</span>
                  <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.alerta === 'critico' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{item.alerta === 'critico' ? 'Crítico' : 'Baixo'}</span>
                </div>
                <span className="text-sm text-gray-500">Atual: {item.quantidadeAtual} {item.unidade} | Mín: {item.quantidadeMinima}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vendasPorDia.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">📈 Vendas por Dia</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Data</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Itens Vendidos</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Faturamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {vendasPorDia.map(([dia, dados]) => (
                  <tr key={dia}>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{new Date(dia).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{dados.qtd}</td>
                    <td className="px-3 py-2 text-right font-medium text-green-600">R$ {dados.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nenhum dado disponível. Comece registrando vendas, produções e movimentações.
        </div>
      )}
    </div>
  )
}
