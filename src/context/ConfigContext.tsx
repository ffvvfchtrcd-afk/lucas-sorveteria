import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LimitesItem } from '../types'

const STORAGE_KEY = 'estoque_limites'

interface ConfigContextType {
  limites: Record<string, LimitesItem>
  salvarLimite: (itemId: string, limites: LimitesItem) => void
  salvarLimitesMultiplos: (itens: Array<{ id: string; limites: LimitesItem }>) => void
  getLimites: (itemId: string, defaults: { minimo: number }) => LimitesItem
  resetarLimite: (itemId: string) => void
}

const ConfigContext = createContext<ConfigContextType | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [limites, setLimites] = useState<Record<string, LimitesItem>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limites))
  }, [limites])

  function salvarLimite(itemId: string, novos: LimitesItem) {
    setLimites(prev => ({ ...prev, [itemId]: novos }))
  }

  function salvarLimitesMultiplos(itens: Array<{ id: string; limites: LimitesItem }>) {
    setLimites(prev => {
      const novo = { ...prev }
      for (const item of itens) {
        novo[item.id] = item.limites
      }
      return novo
    })
  }

  function getLimites(itemId: string, defaults: { minimo: number }): LimitesItem {
    if (limites[itemId]) return limites[itemId]
    return {
      minimo: defaults.minimo,
      critico: Math.max(1, Math.round(defaults.minimo * 0.4)),
    }
  }

  function resetarLimite(itemId: string) {
    setLimites(prev => {
      const novo = { ...prev }
      delete novo[itemId]
      return novo
    })
  }

  return (
    <ConfigContext.Provider value={{ limites, salvarLimite, salvarLimitesMultiplos, getLimites, resetarLimite }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig precisa de ConfigProvider')
  return ctx
}
