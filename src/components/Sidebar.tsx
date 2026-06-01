import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useSidebar } from '../App'
import { useStock } from '../context/StockContext'

const gruposBase = [
  {
    label: 'Visão Geral',
    links: [
      { to: '/', label: 'Dashboard', icon: '📊' },
      { to: '/relatorios', label: 'Relatórios', icon: '📈' },
    ],
  },
  {
    label: 'Operações',
    links: [
      { to: '/pdv', label: 'PDV - Vendas', icon: '🧾' },
      { to: '/producao', label: 'Produção', icon: '🏭' },
      { to: '/movimentacoes', label: 'Movimentações', icon: '📋' },
      { to: '/validades', label: 'Validades', icon: '📅' },
    ],
  },
  {
    label: 'Configurações',
    links: [
      { to: '/precos', label: 'Preços', icon: '💰' },
      { to: '/cadastro', label: 'Cadastro', icon: '📝' },
      { to: '/configuracoes', label: 'Limites', icon: '⚙️' },
    ],
  },
  {
    label: 'Inteligência',
    links: [
      { to: '/chat', label: 'Assistente IA', icon: '🤖' },
    ],
  },
]

export default function Sidebar() {
  const { theme, toggle } = useTheme()
  const { open, close } = useSidebar()
  const { data } = useStock()

  const categoriasCustom = useMemo(() => {
    const slugs = new Set((data.personalizados || []).map(i => i.categoria))
    return Array.from(slugs).map(slug => ({
      to: `/categoria/${slug}`,
      label: slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: '📂',
    }))
  }, [data.personalizados])

  const grupos = useMemo(() => {
    const categoriasLink = [
      { to: '/acai', label: 'Açaí', icon: '🟣' },
      { to: '/sorvetes', label: 'Sorvetes', icon: '🟠' },
      { to: '/materias-primas', label: 'Matérias-Primas', icon: '🔵' },
      ...categoriasCustom,
    ]
    return gruposBase.map(g => {
      if (g.label === 'Configurações') {
        return {
          ...g,
          links: [...categoriasLink, ...g.links],
        }
      }
      return g
    })
  }, [categoriasCustom])

  const content = (
    <aside className="h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">📦 Estoque</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Painel de Controle</p>
        </div>
        <button onClick={close} className="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Fechar menu">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {grupos.map(grupo => (
          <div key={grupo.label}>
            <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{grupo.label}</p>
            {grupo.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                  }`
                }
              >
                <span>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-600 px-4">Dashboard v3.0</p>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden md:flex">{content}</div>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="absolute left-0 top-0 h-full shadow-xl animate-slide-in">{content}</div>
        </div>
      )}
    </>
  )
}
