import { ItemEstoque } from '../types'

interface Props { itens: ItemEstoque[] }

const alertaStyle = {
  ok: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  baixo: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  critico: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

const alertaDot = {
  ok: 'bg-green-500',
  baixo: 'bg-yellow-500',
  critico: 'bg-red-500',
}

export default function TabelaEstoque({ itens }: Props) {
  if (itens.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">Nenhum item encontrado</div>
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {itens.map(item => (
          <div key={item.id}
            className={`bg-white dark:bg-gray-900 rounded-xl border-l-4 p-3 ${
              item.alerta === 'critico' ? 'border-l-red-500' :
              item.alerta === 'baixo' ? 'border-l-yellow-500' :
              'border-l-green-500'
            } border border-gray-100 dark:border-gray-800`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate mr-2">{item.nome}</span>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${alertaStyle[item.alerta]}`}>
                {item.alerta === 'critico' ? 'Crítico' : item.alerta === 'baixo' ? 'Baixo' : 'OK'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Atual: <strong className={`${item.alerta === 'critico' ? 'text-red-600' : item.alerta === 'baixo' ? 'text-yellow-600' : 'text-gray-800 dark:text-gray-200'}`}>{item.quantidadeAtual}</strong></span>
              <span>Mín: <strong>{item.quantidadeMinima}</strong></span>
              <span className="text-gray-400">{item.unidade}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Item</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Qtd</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Mín</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Atualiz</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {itens.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.nome}</td>
                <td className={`px-4 py-3 font-semibold ${item.alerta === 'critico' ? 'text-red-600' : item.alerta === 'baixo' ? 'text-yellow-600' : 'text-gray-700 dark:text-gray-300'}`}>{item.quantidadeAtual} {item.unidade}</td>
                <td className="px-4 py-3 text-gray-500">{item.quantidadeMinima}</td>
                <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${alertaStyle[item.alerta]}`}>{item.alerta === 'critico' ? 'Crítico' : item.alerta === 'baixo' ? 'Baixo' : 'OK'}</span></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{item.ultimaAtualizacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
