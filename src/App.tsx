import { useState, createContext, useContext } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { StockProvider } from './context/StockContext'
import { ConfigProvider } from './context/ConfigContext'
import { LogProvider } from './context/LogContext'
import { PrecoProvider } from './context/PrecoContext'
import { ValidadeProvider } from './context/ValidadeContext'
import { GastosProvider } from './context/GastosContext'
import Sidebar from './components/Sidebar'
import BuscaGlobal from './components/BuscaGlobal'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import AcaiPage from './pages/AcaiPage'
import SorvetesPage from './pages/SorvetesPage'
import MateriasPrimasPage from './pages/MateriasPrimasPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'
import ChatPage from './pages/ChatPage'
import CadastroPage from './pages/CadastroPage'
import PDVPage from './pages/PDVPage'
import ProducaoPage from './pages/ProducaoPage'
import MovimentacoesPage from './pages/MovimentacoesPage'
import PrecosPage from './pages/PrecosPage'
import ValidadesPage from './pages/ValidadesPage'
import RelatoriosPage from './pages/RelatoriosPage'
import CategoriaPage from './pages/CategoriaPage'
import ProdutosPage from './pages/ProdutosPage'
import GastosPage from './pages/GastosPage'
import FinanceiroPage from './pages/FinanceiroPage'

interface SidebarCtx {
  open: boolean
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarCtx>({ open: false, toggle: () => {}, close: () => {} })
export const useSidebar = () => useContext(SidebarContext)

export default function App() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const isHome = location.pathname === '/'

  return (
    <ThemeProvider>
    <StockProvider>
    <PrecoProvider>
    <LogProvider>
      <ValidadeProvider>
      <GastosProvider>
      <ConfigProvider>
        <SidebarContext.Provider value={{ open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }}>
        {isHome ? (
          <Home />
        ) : (
          <div className="flex flex-col md:flex-row h-dvh bg-gray-50 dark:bg-gray-950 dark:text-gray-100">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto p-3 pb-2 md:p-6 lg:p-8">
              <div className="hidden md:flex justify-end mb-3">
                <BuscaGlobal />
              </div>
              <div key={location.pathname} className="animate-fadeIn">
              <Routes>
                <Route path="/estoque" element={<Dashboard />} />
                <Route path="/estoque/acai" element={<AcaiPage />} />
                <Route path="/estoque/sorvetes" element={<SorvetesPage />} />
                <Route path="/estoque/materias-primas" element={<MateriasPrimasPage />} />
                <Route path="/estoque/configuracoes" element={<ConfiguracoesPage />} />
                <Route path="/estoque/chat" element={<ChatPage />} />
                <Route path="/estoque/cadastro" element={<CadastroPage />} />
                <Route path="/estoque/producao" element={<ProducaoPage />} />
                <Route path="/estoque/precos" element={<PrecosPage />} />
                <Route path="/estoque/validades" element={<ValidadesPage />} />
                <Route path="/estoque/categoria/:slug" element={<CategoriaPage />} />

                <Route path="/caixa/pdv" element={<PDVPage />} />
                <Route path="/caixa/movimentacoes" element={<MovimentacoesPage />} />
                <Route path="/caixa/relatorios" element={<RelatoriosPage />} />
                <Route path="/estoque/produtos" element={<ProdutosPage />} />
                <Route path="/financeiro/gastos" element={<GastosPage />} />
                <Route path="/financeiro/resumo" element={<FinanceiroPage />} />
              </Routes>
              </div>
            </main>
          </div>
        )}
        </SidebarContext.Provider>
      </ConfigProvider>
      </GastosProvider>
    </ValidadeProvider>
    </LogProvider>
    </PrecoProvider>
    </StockProvider>
    </ThemeProvider>
  )
}
