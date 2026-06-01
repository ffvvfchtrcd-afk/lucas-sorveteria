import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Despesa, DespesaTipo } from '../types'

const STORAGE_KEY = 'estoque_despesas'

interface GastosContextType {
  despesas: Despesa[]
  adicionarDespesa: (tipo: DespesaTipo, valor: number, descricao: string, data: string, observacao?: string) => void
  removerDespesa: (id: string) => void
  getDespesasPorPeriodo: (inicio: string, fim: string) => Despesa[]
  getTotalPorPeriodo: (inicio: string, fim: string) => number
  getTotalPorTipo: (inicio: string, fim: string) => { tipo: DespesaTipo; total: number }[]
}

const GastosContext = createContext<GastosContextType | null>(null)

function carregar(): Despesa[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export function GastosProvider({ children }: { children: ReactNode }) {
  const [despesas, setDespesas] = useState<Despesa[]>(carregar)

  const salvar = useCallback((novas: Despesa[]) => {
    setDespesas(novas)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novas))
  }, [])

  const adicionarDespesa = useCallback((tipo: DespesaTipo, valor: number, descricao: string, data: string, observacao?: string) => {
    const d: Despesa = {
      id: `desp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tipo, valor, descricao, data, observacao,
    }
    salvar([...carregar(), d])
  }, [salvar])

  const removerDespesa = useCallback((id: string) => {
    salvar(carregar().filter(d => d.id !== id))
  }, [salvar])

  const getDespesasPorPeriodo = useCallback((inicio: string, fim: string) => {
    return carregar().filter(d => d.data >= inicio && d.data <= fim)
  }, [])

  const getTotalPorPeriodo = useCallback((inicio: string, fim: string) => {
    return carregar().filter(d => d.data >= inicio && d.data <= fim).reduce((s, d) => s + d.valor, 0)
  }, [])

  const getTotalPorTipo = useCallback((inicio: string, fim: string) => {
    const filtradas = carregar().filter(d => d.data >= inicio && d.data <= fim)
    const map = new Map<DespesaTipo, number>()
    for (const d of filtradas) map.set(d.tipo, (map.get(d.tipo) || 0) + d.valor)
    return Array.from(map.entries()).map(([tipo, total]) => ({ tipo, total }))
  }, [])

  return (
    <GastosContext.Provider value={{ despesas, adicionarDespesa, removerDespesa, getDespesasPorPeriodo, getTotalPorPeriodo, getTotalPorTipo }}>
      {children}
    </GastosContext.Provider>
  )
}

export function useGastos() {
  const ctx = useContext(GastosContext)
  if (!ctx) throw new Error('useGastos precisa de GastosProvider')
  return ctx
}
