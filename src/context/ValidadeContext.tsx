import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { LoteValidade, UnidadeMedida } from '../types'

const STORAGE_KEY = 'estoque_lotes'

interface ValidadeContextType {
  lotes: LoteValidade[]
  adicionarLote: (itemId: string, itemNome: string, quantidade: number, dataValidade: string, observacao?: string) => void
  consumirLote: (loteId: string, quantidade: number) => void
  removerLote: (loteId: string) => void
  getLotesProximosVencer: (dias?: number) => LoteValidade[]
  getLotesVencidos: () => LoteValidade[]
  getLotesPorItem: (itemId: string) => LoteValidade[]
}

const ValidadeContext = createContext<ValidadeContextType | null>(null)

function carregarLotes(): LoteValidade[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export function ValidadeProvider({ children }: { children: ReactNode }) {
  const [lotes, setLotes] = useState<LoteValidade[]>(carregarLotes)

  const salvar = useCallback((novos: LoteValidade[]) => {
    setLotes(novos)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novos))
  }, [])

  const adicionarLote = useCallback((itemId: string, itemNome: string, quantidade: number, dataValidade: string, observacao?: string) => {
    const lote: LoteValidade = {
      id: `lote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId,
      itemNome,
      quantidade,
      dataValidade,
      dataEntrada: new Date().toISOString().slice(0, 10),
      observacao,
    }
    setLotes(prev => {
      const updated = [...prev, lote]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const consumirLote = useCallback((loteId: string, quantidade: number) => {
    setLotes(prev => {
      const updated = prev.map(l => {
        if (l.id !== loteId) return l
        const novaQtd = l.quantidade - quantidade
        return novaQtd <= 0 ? { ...l, quantidade: 0 } : { ...l, quantidade: novaQtd }
      }).filter(l => l.quantidade > 0)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removerLote = useCallback((loteId: string) => {
    setLotes(prev => {
      const updated = prev.filter(l => l.id !== loteId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const getLotesProximosVencer = useCallback((dias: number = 15) => {
    const hoje = new Date()
    const limite = new Date(hoje.getTime() + dias * 86400000)
    return lotes.filter(l => {
      const val = new Date(l.dataValidade)
      return val > hoje && val <= limite
    })
  }, [lotes])

  const getLotesVencidos = useCallback(() => {
    const hoje = new Date()
    return lotes.filter(l => new Date(l.dataValidade) < hoje)
  }, [lotes])

  const getLotesPorItem = useCallback((itemId: string) => {
    return lotes.filter(l => l.itemId === itemId)
  }, [lotes])

  return (
    <ValidadeContext.Provider value={{ lotes, adicionarLote, consumirLote, removerLote, getLotesProximosVencer, getLotesVencidos, getLotesPorItem }}>
      {children}
    </ValidadeContext.Provider>
  )
}

export function useValidade() {
  const ctx = useContext(ValidadeContext)
  if (!ctx) throw new Error('useValidade precisa de ValidadeProvider')
  return ctx
}
