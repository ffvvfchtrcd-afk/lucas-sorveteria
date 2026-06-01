import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { ItemEstoque, EstoqueData, LimitesItem, CustomItemInput, CATEGORIAS_BASE } from '../types'
import { carregarDados as carregarDadosBase } from '../utils/estoque'

const OVERRIDES_KEY = 'estoque_quantidades'
const CUSTOM_ITEMS_KEY = 'estoque_itens_personalizados'

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
  customItems: CustomItemInput[]
  adicionarItemPersonalizado: (item: CustomItemInput) => void
  removerItemPersonalizado: (itemId: string) => void
  editarItemPersonalizado: (itemId: string, updates: Partial<CustomItemInput>) => void
}

const StockContext = createContext<StockContextType | null>(null)

function getCustomItems(): CustomItemInput[] {
  try {
    const saved = localStorage.getItem(CUSTOM_ITEMS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

const CATEGORIAS_CONHECIDAS = CATEGORIAS_BASE.map(c => c.slug)

function mergeData(overrides: StockOverride): EstoqueData {
  const base = carregarDadosBase()
  const custom = getCustomItems()
  const merged: EstoqueData = { acai: [], sorvetes: [], materias_primas: [], personalizados: [] }

  for (const cat of ['acai', 'sorvetes', 'materias_primas'] as const) {
    const baseItems = base[cat].map(item => {
      const ovr = overrides[item.id]
      if (ovr) {
        return { ...item, quantidadeAtual: ovr.quantidadeAtual, ultimaAtualizacao: ovr.ultimaAtualizacao }
      }
      return { ...item }
    })
    merged[cat] = baseItems
  }

  for (const c of custom) {
    const ovr = overrides[c.id]
    const atual = ovr ? ovr.quantidadeAtual : c.quantidadeAtual
    const ultima = ovr ? ovr.ultimaAtualizacao : new Date().toISOString().slice(0, 10)
    const item: ItemEstoque = {
      id: c.id,
      nome: c.nome,
      categoria: c.categoria,
      quantidadeAtual: atual,
      quantidadeMinima: c.quantidadeMinima,
      unidade: c.unidade,
      alerta: 'ok',
      ultimaAtualizacao: ultima,
      tipo: c.tipo || 'ambos',
    }
    if (CATEGORIAS_CONHECIDAS.includes(c.categoria)) {
      merged[c.categoria as keyof EstoqueData] = [
        ...(merged[c.categoria as keyof EstoqueData] as ItemEstoque[]),
        item,
      ]
    } else {
      merged.personalizados.push(item)
    }
  }

  return merged
}

export function StockProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<StockOverride>(() => {
    try {
      const saved = localStorage.getItem(OVERRIDES_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })
  const [customItems, setCustomItems] = useState<CustomItemInput[]>(getCustomItems)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  }, [overrides])

  useEffect(() => {
    localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(customItems))
  }, [customItems])

  const raw = mergeData(overrides)
  const data: EstoqueData = {
    acai: raw.acai || [],
    sorvetes: raw.sorvetes || [],
    materias_primas: raw.materias_primas || [],
    personalizados: raw.personalizados || [],
  }
  const todosItens = [...data.acai, ...data.sorvetes, ...data.materias_primas, ...data.personalizados]

  const adicionarQuantidade = useCallback((itemId: string, quantidade: number) => {
    setOverrides(prev => {
      const base = carregarDadosBase()
      const todos = [...base.acai, ...base.sorvetes, ...base.materias_primas, ...getCustomItems()]
      const item = todos.find(i => i.id === itemId)
      if (!item) return prev
      const atual = prev[itemId]?.quantidadeAtual ?? ('quantidadeAtual' in item ? (item as any).quantidadeAtual : 0)
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

  const adicionarItemPersonalizado = useCallback((item: CustomItemInput) => {
    setCustomItems(prev => {
      if (prev.find(c => c.id === item.id)) return prev
      return [...prev, item]
    })
    setVersion(v => v + 1)
  }, [])

  const removerItemPersonalizado = useCallback((itemId: string) => {
    setCustomItems(prev => prev.filter(c => c.id !== itemId))
    setOverrides(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
    try {
      const limits = JSON.parse(localStorage.getItem('estoque_limites') || '{}')
      delete limits[itemId]
      localStorage.setItem('estoque_limites', JSON.stringify(limits))
    } catch {}
    setVersion(v => v + 1)
  }, [])

  const editarItemPersonalizado = useCallback((itemId: string, updates: Partial<CustomItemInput>) => {
    setCustomItems(prev => prev.map(c => c.id === itemId ? { ...c, ...updates } : c))
    setVersion(v => v + 1)
  }, [])

  return (
    <StockContext.Provider value={{
      data, version, adicionarQuantidade, definirQuantidade, getLimites,
      buscarItemPorNome, todosItens, customItems,
      adicionarItemPersonalizado, removerItemPersonalizado, editarItemPersonalizado
    }}>
      {children}
    </StockContext.Provider>
  )
}

export function useStock() {
  const ctx = useContext(StockContext)
  if (!ctx) throw new Error('useStock precisa de StockProvider')
  return ctx
}
