import { useState, createContext, useContext, Suspense, lazy } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { StockProvider } from './context/StockContext'
import { ConfigProvider } from './context/ConfigContext'
import { LogProvider } from './context/LogContext'
import { PrecoProvider } from './context/PrecoContext'
import { ReceitaProvider } from './context/ReceitaContext'
import { ValidadeProvider } from './context/ValidadeContext'
import { GastosProvider } from './context/GastosContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import Sidebar from './components/Sidebar'
import BuscaGlobal from './components/BuscaGlobal'
import RoleGuard from './components/RoleGuard'
import Home from './pages/Home'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import LoadingFallback from './components/LoadingFallback'

const AcaiPage = lazy(() => import('./pages/AcaiPage'))
const SorvetesPage = lazy(() => import('./pages/SorvetesPage'))
const MateriasPrimasPage = lazy(() => import('./pages/MateriasPrimasPage'))
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const CadastroPage = lazy(() => import('./pages/CadastroPage'))
const PDVPage = lazy(() => import('./pages/PDVPage'))
const ProducaoPage = lazy(() => import('./pages/ProducaoPage'))
const MovimentacoesPage = lazy(() => import('./pages/MovimentacoesPage'))
const PrecosPage = lazy(() => import('./pages/PrecosPage'))
const ValidadesPage = lazy(() => import('./pages/ValidadesPage'))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'))
const CategoriaPage = lazy(() => import('./pages/CategoriaPage'))
const ProdutosPage = lazy(() => import('./pages/ProdutosPage'))
const GastosPage = lazy(() => import('./pages/GastosPage'))
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage'))
const MetasPage = lazy(() => import('./pages/MetasPage'))
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'))

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
  const isLogin = location.pathname === '/login'

  function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isLoggedIn } = useAuth()
    const location = useLocation()
    if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    return <>{children}</>
  }

  return (
    <ThemeProvider>
    <AuthProvider>
    <StockProvider>
    <PrecoProvider>
    <ReceitaProvider>
    <LogProvider>
      <ValidadeProvider>
      <GastosProvider>
      <NotificationProvider>
      <ConfigProvider>
        <ToastProvider>
        <ConfirmProvider>
        <SidebarContext.Provider value={{ open, toggle: () => setOpen(v => !v), close: () => setOpen(false) }}>
        {isHome ? (
          <Home />
        ) : isLogin ? (
          <LoginPage />
        ) : (
          <AuthGuard>
          <div className="flex flex-col md:flex-row h-dvh bg-gray-50 dark:bg-gray-950 dark:text-gray-100 overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto p-3 pb-16 md:pb-6 md:p-6 lg:p-8">
              <div className="hidden md:flex justify-end mb-3">
                <BuscaGlobal />
              </div>
              <div key={location.pathname} className="animate-fadeIn max-w-full">
              <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/estoque" element={<Dashboard />} />
                <Route path="/estoque/acai" element={<AcaiPage />} />
                <Route path="/estoque/sorvetes" element={<SorvetesPage />} />
                <Route path="/estoque/materias-primas" element={<MateriasPrimasPage />} />
                <Route path="/estoque/configuracoes" element={<RoleGuard adminOnly><ConfiguracoesPage /></RoleGuard>} />
                <Route path="/estoque/chat" element={<ChatPage />} />
                <Route path="/estoque/cadastro" element={<RoleGuard adminOnly><CadastroPage /></RoleGuard>} />
                <Route path="/estoque/producao" element={<ProducaoPage />} />
                <Route path="/estoque/precos" element={<PrecosPage />} />
                <Route path="/estoque/validades" element={<ValidadesPage />} />
                <Route path="/estoque/categoria/:slug" element={<CategoriaPage />} />

                <Route path="/caixa/pdv" element={<PDVPage />} />
                <Route path="/caixa/movimentacoes" element={<MovimentacoesPage />} />
                <Route path="/caixa/relatorios" element={<RoleGuard adminOnly><RelatoriosPage /></RoleGuard>} />
                <Route path="/estoque/produtos" element={<ProdutosPage />} />
                <Route path="/financeiro/gastos" element={<GastosPage />} />
                <Route path="/financeiro/resumo" element={<RoleGuard adminOnly><FinanceiroPage /></RoleGuard>} />
                <Route path="/financeiro/metas" element={<RoleGuard adminOnly><MetasPage /></RoleGuard>} />
                <Route path="/financeiro/usuarios" element={<RoleGuard adminOnly><UsuariosPage /></RoleGuard>} />
              </Routes>
              </Suspense>
              </div>
            </main>
          </div>
          </AuthGuard>
        )}
        </SidebarContext.Provider>
        </ConfirmProvider>
        </ToastProvider>
      </ConfigProvider>
      </NotificationProvider>
      </GastosProvider>
    </ValidadeProvider>
    </LogProvider>
    </ReceitaProvider>
    </PrecoProvider>
    </StockProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
