import { useNavigate } from 'react-router-dom'

const modules = [
  {
    id: 'caixa',
    titulo: 'CAIXA',
    descricao: 'Venda no PDV, veja o histórico de movimentações e gere relatórios de vendas.',
    icon: '🧾',
    gradient: 'from-emerald-500 to-teal-600',
    hoverGradient: 'from-emerald-600 to-teal-700',
    path: '/caixa/pdv',
  },
  {
    id: 'estoque',
    titulo: 'ESTOQUE',
    descricao: 'Gerencie produtos, preços, validades, produção — e converse com a IA para ajudar no dia a dia.',
    icon: '📦',
    gradient: 'from-indigo-500 to-violet-600',
    hoverGradient: 'from-indigo-600 to-violet-700',
    path: '/estoque',
  },
  {
    id: 'financeiro',
    titulo: 'FINANCEIRO',
    descricao: 'Resumo de lucros, registro de despesas, acompanhamento de metas financeiras mensais.',
    icon: '💰',
    gradient: 'from-amber-500 to-orange-600',
    hoverGradient: 'from-amber-600 to-orange-700',
    path: '/financeiro/resumo',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="flex flex-col items-center px-6 py-8 md:py-16">
        <div className="text-center mb-8 md:mb-12">
          <div className="text-5xl mb-4">🏪</div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Sorveteria & Açaí</h1>
          <p className="text-gray-400 dark:text-gray-500 mt-2">Escolha abaixo o que você quer fazer:</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 w-full max-w-3xl">
          {modules.map(mod => (
            <button
              key={mod.id}
              onClick={() => navigate(mod.path)}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${mod.gradient} p-[2px] transition-transform active:scale-[0.97]`}
            >
              <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 md:p-7 h-full transition-all group-hover:bg-opacity-90 dark:group-hover:bg-gray-800/90">
                <div className="flex flex-col items-center text-center gap-3">
                  <span className="text-4xl md:text-5xl">{mod.icon}</span>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">{mod.titulo}</h2>
                  <p className="text-sm text-gray-400 dark:text-gray-500">{mod.descricao}</p>
                  <span className={`text-xs font-semibold bg-gradient-to-r ${mod.gradient} text-white px-4 py-1.5 rounded-full mt-2`}>
                    Entrar
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-8 md:mt-12 shrink-0">v3.0</p>
      </div>
    </div>
  )
}
