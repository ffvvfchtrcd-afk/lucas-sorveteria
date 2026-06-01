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

export default function App() {
  return (
    <ThemeProvider>
    <StockProvider>
      <ConfigProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 dark:text-gray-100">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
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
      </ConfigProvider>
    </StockProvider>
    </ThemeProvider>
  )
}
