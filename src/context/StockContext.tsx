import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { ItemEstoque, EstoqueData, LimitesItem } from '../types'
import { carregarDados as carregarDadosBase, calcularAlerta } from '../utils/estoque'

const STORAGE_KEY = 'estoque_quantidades'

interface StockOverride {
  [itemId: string]: {
    quantidadeAtual: number
    ultimaAtualizacao: string
  }
}

interface StockContextType {
  data: EstoqueData
  version: number
  adicionarQuantidade: (itemId: string, quantidade: number) => void
  definirQuantidade: (itemId: string, quantidade: number) => void
  getLimites: (itemId: string, defaults: { minimo: number }) => LimitesItem
  buscarItemPorNome: (nome: string) => ItemEstoque | null
  todosItens: ItemEstoque[]
}

const StockContext = createContext<StockContextType | null>(null)

function mergeData(overrides: StockOverride): EstoqueData {
  const base = carregarDadosBase()
  const merged: EstoqueData = { acai: [], sorvetes: [], materias_primas: [] }
  for (const cat of ['acai', 'sorvetes', 'materias_primas'] as const) {
    merged[cat] = base[cat].map(item => {
      const ovr = overrides[item.id]
      if (ovr) {
        return { ...item, quantidadeAtual: ovr.quantidadeAtual, ultimaAtualizacao: ovr.ultimaAtualizacao }
      }
      return { ...item }
    })
  }
  return merged
}

export function StockProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<StockOverride>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  }, [overrides])

  const data = mergeData(overrides)
  const todosItens = [...data.acai, ...data.sorvetes, ...data.materias_primas]

  const adicionarQuantidade = useCallback((itemId: string, quantidade: number) => {
    setOverrides(prev => {
      const base = carregarDadosBase()
      const todos = [...base.acai, ...base.sorvetes, ...base.materias_primas]
      const item = todos.find(i => i.id === itemId)
      if (!item) return prev
      const atual = prev[itemId]?.quantidadeAtual ?? item.quantidadeAtual
      return {
        ...prev,
        [itemId]: { quantidadeAtual: atual + quantidade, ultimaAtualizacao: new Date().toISOString().slice(0, 10) },
      }
    })
    setVersion(v => v + 1)
  }, [])

  const definirQuantidade = useCallback((itemId: string, quantidade: number) => {
    setOverrides(prev => ({
      ...prev,
      [itemId]: { quantidadeAtual: Math.max(0, quantidade), ultimaAtualizacao: new Date().toISOString().slice(0, 10) },
    }))
    setVersion(v => v + 1)
  }, [])

  const getLimites = useCallback((_itemId: string, defaults: { minimo: number }): LimitesItem => {
    const fromLS = localStorage.getItem('estoque_limites')
    if (fromLS) {
      const parsed = JSON.parse(fromLS)
      if (parsed[_itemId]) return parsed[_itemId]
    }
    return { minimo: defaults.minimo, critico: Math.max(1, Math.round(defaults.minimo * 0.4)) }
  }, [])

  const buscarItemPorNome = useCallback((nome: string): ItemEstoque | null => {
    const lower = nome.toLowerCase()
    return todosItens.find(i =>
      i.nome.toLowerCase().includes(lower) ||
      lower.includes(i.nome.toLowerCase().split(' ')[0])
    ) ?? null
  }, [todosItens])

  return (
    <StockContext.Provider value={{ data, version, adicionarQuantidade, definirQuantidade, getLimites, buscarItemPorNome, todosItens }}>
      {children}
    </StockContext.Provider>
  )
}

export function useStock() {
  const ctx = useContext(StockContext)
  if (!ctx) throw new Error('useStock precisa de StockProvider')
  return ctx
}
