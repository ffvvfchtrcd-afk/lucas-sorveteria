import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { PrecoItem } from '../types'

const STORAGE_KEY = 'estoque_precos'

interface PrecoContextType {
  precos: PrecoItem[]
  getPreco: (itemId: string) => PrecoItem | undefined
  setPreco: (itemId: string, itemNome: string, precoCusto: number, precoVenda: number) => void
  removerPreco: (itemId: string) => void
}

const PrecoContext = createContext<PrecoContextType | null>(null)

function carregarPrecos(): PrecoItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export function PrecoProvider({ children }: { children: ReactNode }) {
  const [precos, setPrecos] = useState<PrecoItem[]>(carregarPrecos)

  const salvar = useCallback((novos: PrecoItem[]) => {
    setPrecos(novos)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novos))
  }, [])

  const getPreco = useCallback((itemId: string) => {
    return precos.find(p => p.itemId === itemId)
  }, [precos])

  const setPreco = useCallback((itemId: string, itemNome: string, precoCusto: number, precoVenda: number) => {
    setPrecos(prev => {
      const idx = prev.findIndex(p => p.itemId === itemId)
      const novo: PrecoItem = { itemId, itemNome, precoCusto, precoVenda, dataAtualizacao: new Date().toISOString().slice(0, 10) }
      const updated = idx >= 0
        ? prev.map((p, i) => i === idx ? novo : p)
        : [...prev, novo]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removerPreco = useCallback((itemId: string) => {
    setPrecos(prev => {
      const updated = prev.filter(p => p.itemId !== itemId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <PrecoContext.Provider value={{ precos, getPreco, setPreco, removerPreco }}>
      {children}
    </PrecoContext.Provider>
  )
}

export function usePreco() {
  const ctx = useContext(PrecoContext)
  if (!ctx) throw new Error('usePreco precisa de PrecoProvider')
  return ctx
}
