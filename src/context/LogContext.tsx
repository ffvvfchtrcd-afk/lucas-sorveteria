import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { Movimentacao, TipoMovimentacao } from '../types'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'estoque_movimentacoes'

interface LogContextType {
  logs: Movimentacao[]
  addLog: (tipo: TipoMovimentacao, itemId: string, itemNome: string, quantidade: number, origem?: string, motivo?: string) => void
  getLogsPorItem: (itemId: string) => Movimentacao[]
  getLogsPorTipo: (tipo: TipoMovimentacao) => Movimentacao[]
  limparLogs: () => void
}

const LogContext = createContext<LogContextType | null>(null)

function carregarLogs(): Movimentacao[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export function LogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Movimentacao[]>(carregarLogs)
  const { user } = useAuth()

  const salvarLogs = useCallback((novos: Movimentacao[]) => {
    setLogs(novos)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novos))
  }, [])

  const addLog = useCallback((
    tipo: TipoMovimentacao,
    itemId: string,
    itemNome: string,
    quantidade: number,
    origem?: string,
    motivo?: string,
  ) => {
    const nova: Movimentacao = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId,
      itemNome,
      tipo,
      quantidade,
      data: new Date().toISOString(),
      origem,
      motivo,
      usuario: user?.username,
    }
    setLogs(prev => {
      const updated = [nova, ...prev].slice(0, 5000)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [user?.username])

  const getLogsPorItem = useCallback((itemId: string) => {
    return logs.filter(l => l.itemId === itemId)
  }, [logs])

  const getLogsPorTipo = useCallback((tipo: TipoMovimentacao) => {
    return logs.filter(l => l.tipo === tipo)
  }, [logs])

  const limparLogs = useCallback(() => {
    salvarLogs([])
  }, [salvarLogs])

  return (
    <LogContext.Provider value={{ logs, addLog, getLogsPorItem, getLogsPorTipo, limparLogs }}>
      {children}
    </LogContext.Provider>
  )
}

export function useLog() {
  const ctx = useContext(LogContext)
  if (!ctx) throw new Error('useLog precisa de LogProvider')
  return ctx
}
