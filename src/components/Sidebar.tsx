import { NavLink } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/acai', label: 'Açaí', icon: '🟣' },
  { to: '/sorvetes', label: 'Sorvetes', icon: '🟠' },
  { to: '/materias-primas', label: 'Matérias-Primas', icon: '🔵' },
  { to: '/chat', label: 'Assistente IA', icon: '🤖' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]

export default function Sidebar() {
  const { theme, toggle } = useTheme()

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">📦 Estoque</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Painel de Controle</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
      </nav>
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-600 px-4">Dashboard Estoque v3.0</p>
      </div>
    </aside>
  )
}
