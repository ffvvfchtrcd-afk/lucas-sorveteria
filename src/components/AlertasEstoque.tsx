import { ItemEstoque } from '../types'

interface AlertasEstoqueProps {
  itens: ItemEstoque[]
  tipo: 'critico' | 'baixo'
}

const alertaConfig = {
  critico: {
    titulo: '🔴 Estoque Crítico — Repor AGORA',
    corBg: 'bg-red-50 dark:bg-red-950/40',
    corBorda: 'border-red-200 dark:border-red-900',
    corTexto: 'text-red-800 dark:text-red-300',
    corBadge: 'bg-red-500',
  },
  baixo: {
    titulo: '🟡 Estoque Baixo — Precisa Repor',
    corBg: 'bg-yellow-50 dark:bg-yellow-950/40',
    corBorda: 'border-yellow-200 dark:border-yellow-900',
    corTexto: 'text-yellow-800 dark:text-yellow-300',
    corBadge: 'bg-yellow-500',
  },
}

export default function AlertasEstoque({ itens, tipo }: AlertasEstoqueProps) {
  if (itens.length === 0) return null

  const cfg = alertaConfig[tipo]

  return (
    <div className={`${cfg.corBg} border ${cfg.corBorda} rounded-xl p-4`}>
      <h3 className={`text-sm font-semibold ${cfg.corTexto} mb-3 flex items-center gap-2`}>
        {cfg.titulo} ({itens.length})
      </h3>
      <div className="space-y-2">
        {itens.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-white/80 dark:bg-gray-800/80 rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${cfg.corBadge}`} />
              <span className="font-medium text-gray-700 dark:text-gray-200">{item.nome}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Atual: <strong className="text-gray-700 dark:text-gray-200">{item.quantidadeAtual} {item.unidade}</strong>
              </span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span className="text-gray-500 dark:text-gray-400">
                Mínimo: <strong className="text-gray-700 dark:text-gray-200">{item.quantidadeMinima} {item.unidade}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
