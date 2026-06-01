import { useState, createContext, useContext } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { StockProvider } from './context/StockContext'
import { ConfigProvider } from './context/ConfigContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AcaiPage from './pages/AcaiPage'
import SorvetesPage from './pages/SorvetesPage'
import MateriasPrimasPage from './pages/MateriasPrimasPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'
import ChatPage from './pages/ChatPage'

interface SidebarCtx {
  open: boolean
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarCtx>({ open: false, toggle: () => {}, close: () => {} })
export const useSidebar = () => useContext(SidebarContext)

export default function App() {
  const [open, setOpen] = useState(false)

  return (
    <ThemeProvider>
    <StockProvider>
      <ConfigProvider>
        <SidebarContext.Provider value={{ open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }}>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 lg:p-8">
            <button
              onClick={() => setOpen(true)}
              className="md:hidden mb-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label="Abrir menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-xs">Menu</span>
            </button>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/acai" element={<AcaiPage />} />
              <Route path="/sorvetes" element={<SorvetesPage />} />
              <Route path="/materias-primas" element={<MateriasPrimasPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              <Route path="/chat" element={<ChatPage />} />
            </Routes>
          </main>
        </div>
        </SidebarContext.Provider>
      </ConfigProvider>
    </StockProvider>
    </ThemeProvider>
  )
}
