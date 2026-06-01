import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useSidebar } from '../App'

function useModulo() {
  const loc = useLocation()
  if (loc.pathname.startsWith('/caixa')) return 'caixa' as const
  if (loc.pathname.startsWith('/estoque')) return 'estoque' as const
  return null
}

const gruposCaixa = [
  {
    label: 'Operações',
    links: [
      { to: '/caixa/pdv', label: 'PDV - Vendas', icon: '🧾' },
      { to: '/caixa/movimentacoes', label: 'Movimentações', icon: '📋' },
    ],
  },
  {
    label: 'Relatórios',
    links: [
      { to: '/caixa/relatorios', label: 'Relatórios', icon: '📈' },
    ],
  },
]

const gruposEstoqueBase = [
  {
    label: 'Visão Geral',
    links: [
      { to: '/estoque', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'Configurações',
    links: [
      { to: '/estoque/precos', label: 'Preços', icon: '💰' },
      { to: '/estoque/validades', label: 'Validades', icon: '📅' },
      { to: '/estoque/cadastro', label: 'Cadastro', icon: '📝' },
      { to: '/estoque/configuracoes', label: 'Limites', icon: '⚙️' },
    ],
  },
  {
    label: 'Operações',
    links: [
      { to: '/estoque/producao', label: 'Produção', icon: '🏭' },
    ],
  },
  {
    label: 'Inteligência',
    links: [
      { to: '/estoque/chat', label: 'Assistente IA', icon: '🤖' },
    ],
  },
]

const tabsCaixa = [
  { to: '/caixa/pdv', label: 'Vender', icon: '🧾' },
  { to: '/caixa/movimentacoes', label: 'Mov.', icon: '📋' },
  { to: '/caixa/relatorios', label: 'Relát.', icon: '📈' },
]

const tabsEstoque = [
  { to: '/estoque', label: 'Início', icon: '📊' },
  { to: '/estoque/producao', label: 'Produzir', icon: '🏭' },
  { to: '/estoque/chat', label: 'IA', icon: '🤖' },
]

export default function Sidebar() {
  const modulo = useModulo()
  const { theme, toggle } = useTheme()
  const { open, close, toggle: toggleSidebar } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()

  const gruposEstoque = gruposEstoqueBase

  const isActive = (path: string) => {
    if (path === '/estoque') return location.pathname === '/estoque'
    return location.pathname.startsWith(path)
  }

  const gruposAtivos = modulo === 'caixa' ? gruposCaixa : gruposEstoque

  const moduleInfo = modulo === 'caixa'
    ? { label: 'CAIXA', icon: '🧾', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' }
    : { label: 'ESTOQUE', icon: '📦', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' }

  const desktopSidebar = (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 space-y-2">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">📦 Gestão</h1>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${moduleInfo.bg} ${moduleInfo.border} border`}>
          <span className="text-lg">{moduleInfo.icon}</span>
          <span className={`text-sm font-bold ${moduleInfo.color}`}>{moduleInfo.label}</span>
        </div>
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pl-1">
          ← Trocar módulo
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {gruposAtivos.map(grupo => (
          <div key={grupo.label}>
            <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{grupo.label}</p>
            {grupo.links.map(link => (
              <NavLink key={link.to} to={link.to} end={link.to === '/estoque'} onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                  }`
                }>
                <span>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <button onClick={toggle}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-600 px-4">v3.0</p>
      </div>
    </aside>
  )

  const tabsMobile = modulo === 'caixa' ? tabsCaixa : tabsEstoque

  const menuOverlay = (
    <div className="fixed inset-0 z-50 md:hidden transition-opacity duration-200" onClick={close}>
      <div className="absolute inset-0 bg-black/50 animate-fadeIn" />
      <div className="absolute left-0 top-0 h-full shadow-xl bg-white dark:bg-gray-900 w-72 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">{moduleInfo.icon}</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{moduleInfo.label}</h2>
          </div>
          <button onClick={close} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors text-xl">✕</button>
        </div>
        <nav className="overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 60px)' }}>
          <button onClick={() => { close(); navigate('/') }}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-2">
            ← Trocar módulo
          </button>
          {gruposAtivos.map(grupo => (
            <div key={grupo.label}>
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{grupo.label}</p>
              {grupo.links.map(link => (
                <NavLink key={link.to} to={link.to} end={link.to === '/estoque'} onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`
                  }>
                  <span>{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
          <button onClick={toggle}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </nav>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">{desktopSidebar}</div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="flex items-center justify-around">
          {tabsMobile.map(tab => {
            const active = isActive(tab.to)
            return (
              <NavLink key={tab.to} to={tab.to} end={tab.to === '/estoque'}
                onClick={close}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 min-w-0 transition-colors min-h-[48px] ${
                  active
                    ? modulo === 'caixa' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-500 active:text-gray-600'
                }`}>
                {active && <span className={`absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full ${modulo === 'caixa' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />}
                <span className={`text-xl leading-none transition-transform duration-150 ${active ? 'scale-110' : ''}`}>{tab.icon}</span>
                <span className={`text-[10px] mt-0.5 font-medium whitespace-nowrap ${active ? 'font-bold' : ''}`}>{tab.label}</span>
              </NavLink>
            )
          })}
          <button onClick={toggleSidebar}
            className={`relative flex flex-col items-center justify-center py-1.5 px-3 min-h-[48px] transition-colors ${
              open ? moduleInfo.color : 'text-gray-400 dark:text-gray-500 active:text-gray-600'
            }`}>
            {open && <span className={`absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full ${modulo === 'caixa' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />}
            <span className={`text-xl leading-none transition-transform duration-150 ${open ? 'scale-110' : ''}`}>☰</span>
            <span className="text-[10px] mt-0.5 font-medium">Menu</span>
          </button>
        </div>
      </div>

      {/* Mobile padding for bottom bar */}
      <div className="md:hidden h-14" />

      {/* Mobile drawer overlay */}
      {open && menuOverlay}
    </>
  )
}
