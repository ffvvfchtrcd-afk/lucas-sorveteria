import { ItemEstoque } from '../types'

interface TabelaEstoqueProps {
  itens: ItemEstoque[]
}

const alertaStyle = {
  ok: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  baixo: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  critico: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

const alertaLabel = {
  ok: 'OK',
  baixo: 'Baixo',
  critico: 'Crítico',
}

export default function TabelaEstoque({ itens }: TabelaEstoqueProps) {
  if (itens.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-gray-600">
        <p className="text-lg">Nenhum item encontrado</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Item</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Qtd Atual</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Mínimo</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Unidade</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Última Atualização</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {itens.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.nome}</td>
              <td className={`px-4 py-3 font-semibold ${item.alerta === 'critico' ? 'text-red-600 dark:text-red-400' : item.alerta === 'baixo' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {item.quantidadeAtual}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.quantidadeMinima}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.unidade}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${alertaStyle[item.alerta]}`}>
                  {alertaLabel[item.alerta]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 dark:text-gray-600 text-xs">{item.ultimaAtualizacao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
