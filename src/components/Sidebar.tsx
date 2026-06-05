import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../App'

function useModulo() {
  const loc = useLocation()
  if (loc.pathname.startsWith('/caixa')) return 'caixa' as const
  if (loc.pathname.startsWith('/estoque')) return 'estoque' as const
  if (loc.pathname.startsWith('/financeiro')) return 'financeiro' as const
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

const gruposFinanceiro = [
  {
    label: 'Financeiro',
    links: [
      { to: '/financeiro/resumo', label: 'Resumo (Lucros)', icon: '📈' },
      { to: '/financeiro/gastos', label: 'Gastos & Despesas', icon: '💸' },
      { to: '/financeiro/metas', label: 'Metas Financeiras', icon: '🎯' },
      { to: '/financeiro/usuarios', label: 'Usuários', icon: '👥', adminOnly: true },
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
    label: 'Produtos',
    links: [
      { to: '/estoque/produtos', label: 'Listar', icon: '📦' },
      { to: '/estoque/cadastro', label: 'Criar Novo', icon: '📝' },
      { to: '/estoque/precos', label: 'Preços', icon: '💰' },
      { to: '/estoque/validades', label: 'Validades', icon: '📅' },
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
  { to: '/caixa/movimentacoes', label: 'Histórico', icon: '📋' },
  { to: '/caixa/relatorios', label: 'Relatórios', icon: '📈' },
]

const tabsEstoque = [
  { to: '/estoque', label: 'Início', icon: '📊' },
  { to: '/estoque/produtos', label: 'Produtos', icon: '📦' },
  { to: '/estoque/chat', label: 'IA', icon: '🤖' },
]

const tabsFinanceiro = [
  { to: '/financeiro/resumo', label: 'Lucros', icon: '📈' },
  { to: '/financeiro/gastos', label: 'Gastos', icon: '💸' },
  { to: '/financeiro/metas', label: 'Metas', icon: '🎯' },
  { to: '/financeiro/usuarios', label: 'Usuários', icon: '👥', adminOnly: true },
]

const MODULOS = [
  { id: 'caixa', label: 'CAIXA', icon: '🧾', path: '/caixa/pdv', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'estoque', label: 'ESTOQUE', icon: '📦', path: '/estoque', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 'financeiro', label: 'FINANCEIRO', icon: '💰', path: '/financeiro/resumo', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
] as const

export default function Sidebar() {
  const modulo = useModulo()
  const { theme, toggle } = useTheme()
  const { open, close, toggle: toggleSidebar } = useSidebar()
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const gruposAtivos = (modulo === 'caixa' ? gruposCaixa
    : modulo === 'financeiro' ? gruposFinanceiro
    : gruposEstoqueBase).map(g => ({
      ...g,
      links: g.links.filter(l => !('adminOnly' in l && l.adminOnly) || isAdmin),
    })).filter(g => g.links.length > 0)

  const isActive = (path: string) => {
    if (path === '/estoque') return location.pathname === '/estoque'
    return location.pathname.startsWith(path)
  }

  const moduleInfo = modulo === 'caixa'
    ? { label: 'CAIXA', icon: '🧾', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' }
    : modulo === 'financeiro'
    ? { label: 'FINANCEIRO', icon: '📈', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' }
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
        {user && (
          <div className="flex items-center justify-between px-4 py-1.5">
            <span className="text-xs text-gray-400">
              {user.nome} <span className="text-[10px]">({user.papel})</span>
            </span>
            <button onClick={() => { logout(); navigate('/login') }}
              className="text-[10px] text-red-400 hover:text-red-600">Sair</button>
          </div>
        )}
        <button onClick={toggle}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-600 px-4">v3.0</p>
      </div>
    </aside>
  )

  const tabsMobile = (modulo === 'caixa' ? tabsCaixa : modulo === 'financeiro' ? tabsFinanceiro : tabsEstoque).filter(t => !('adminOnly' in t && t.adminOnly) || isAdmin)

  const menuOverlay = (
    <div className="fixed inset-0 z-50 md:hidden transition-opacity duration-200" onClick={close}>
      <div className="absolute inset-0 bg-black/50 animate-fadeIn" />
      <div className="absolute right-0 top-0 h-full shadow-xl bg-white dark:bg-gray-900 w-80 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">{moduleInfo.icon}</span>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{moduleInfo.label}</h2>
          </div>
          <button onClick={close} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <nav className="overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 60px)' }}>
          {/* Seletor de módulo */}
          <div className="grid grid-cols-3 gap-2">
            {MODULOS.map(m => {
              const ativo = modulo === m.id
              return (
                <button key={m.id} onClick={() => { close(); navigate(m.path) }}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all ${
                    ativo ? `${m.bg} ${m.color} ring-2 ring-offset-1 ring-gray-200 dark:ring-gray-700` : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  <span className="text-xl">{m.icon}</span>
                  <span>{m.label.slice(0, 4)}</span>
                </button>
              )
            })}
          </div>
          <hr className="border-gray-100 dark:border-gray-800" />
          {/* Links do módulo atual */}
          {gruposAtivos.map(grupo => (
            <div key={grupo.label}>
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{grupo.label}</p>
              {grupo.links.map(link => (
                <NavLink key={link.to} to={link.to} end={link.to === '/estoque'} onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`
                  }>
                  <span className="text-lg">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
          <hr className="border-gray-100 dark:border-gray-800" />
          {/* Preferências */}
          {user && (
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-gray-400">{user.nome} · <span className="capitalize">{user.papel}</span></span>
              <button onClick={() => { close(); logout(); navigate('/login') }}
                aria-label="Sair da conta"
                className="text-xs text-red-400 hover:text-red-600">Sair</button>
            </div>
          )}
          <button onClick={() => { close(); navigate('/') }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            🏪 Módulos
          </button>
          <button onClick={() => { close(); toggle() }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
        <div className="grid grid-cols-4 items-stretch">
          {tabsMobile.map(tab => {
            const active = isActive(tab.to)
            return (
              <NavLink key={tab.to} to={tab.to} end={tab.to === '/estoque'}
                onClick={close}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 transition-colors min-h-[52px] ${
                  active
                    ? modulo === 'caixa' ? 'text-emerald-600 dark:text-emerald-400' : modulo === 'financeiro' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-500 active:text-gray-600'
                }`}>
                {active && <span className={`absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full ${
                  modulo === 'caixa' ? 'bg-emerald-500' : modulo === 'financeiro' ? 'bg-amber-500' : 'bg-indigo-500'
                }`} />}
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className={`text-[10px] mt-0.5 font-medium ${active ? 'font-bold' : ''}`}>{tab.label}</span>
              </NavLink>
            )
          })}
          <button onClick={toggleSidebar}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 min-h-[52px] transition-colors ${
              open
                ? modulo === 'caixa' ? 'text-emerald-600' : modulo === 'financeiro' ? 'text-amber-600' : 'text-indigo-600'
                : 'text-gray-400 dark:text-gray-500 active:text-gray-600'
            }`}>
            {open && <span className={`absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full ${
              modulo === 'caixa' ? 'bg-emerald-500' : modulo === 'financeiro' ? 'bg-amber-500' : 'bg-indigo-500'
            }`} />}
            <span className="text-xl leading-none">☰</span>
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
