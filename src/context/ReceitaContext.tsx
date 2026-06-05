import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import { Receita, UnidadeMedida } from '../types'

const STORAGE_KEY = 'estoque_receitas'

interface ReceitaContextType {
  receitas: Receita[]
  getReceita: (id: string) => Receita | undefined
  getReceitaByProduto: (produtoId: string) => Receita | undefined
  salvarReceita: (receita: Omit<Receita, 'id' | 'dataCriacao'> & { id?: string }) => Receita
  removerReceita: (id: string) => void
  calcularCusto: (receita: Receita, custoUnitario: (itemId: string) => number) => number
  custoTotal: (produtoId: string, custoUnitario: (itemId: string) => number) => number
}

const ReceitaContext = createContext<ReceitaContextType | null>(null)

function carregarReceitas(): Receita[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export function ReceitaProvider({ children }: { children: ReactNode }) {
  const [receitas, setReceitas] = useState<Receita[]>(carregarReceitas)

  const persistir = useCallback((novas: Receita[]) => {
    setReceitas(novas)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novas))
  }, [])

  const getReceita = useCallback((id: string) => receitas.find(r => r.id === id), [receitas])

  const getReceitaByProduto = useCallback((produtoId: string) => receitas.find(r => r.produtoId === produtoId), [receitas])

  const salvarReceita = useCallback((dados: Omit<Receita, 'id' | 'dataCriacao'> & { id?: string }): Receita => {
    const id = dados.id || 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const receita: Receita = {
      id,
      nome: dados.nome,
      produtoId: dados.produtoId,
      itens: dados.itens,
      rendimento: dados.rendimento,
      dataCriacao: dados.id ? (receitas.find(r => r.id === dados.id)?.dataCriacao || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
    }
    setReceitas(prev => {
      const idx = prev.findIndex(r => r.id === id)
      const updated = idx >= 0 ? prev.map((r, i) => i === idx ? receita : r) : [...prev, receita]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
    return receita
  }, [receitas])

  const removerReceita = useCallback((id: string) => {
    persistir(receitas.filter(r => r.id !== id))
  }, [receitas, persistir])

  const calcularCusto = useCallback((receita: Receita, custoUnitario: (itemId: string) => number) => {
    return receita.itens.reduce((acc, it) => acc + (custoUnitario(it.itemId) || 0) * it.quantidade, 0)
  }, [])

  const custoTotal = useCallback((produtoId: string, custoUnitario: (itemId: string) => number) => {
    const r = receitas.find(rec => rec.produtoId === produtoId)
    if (!r) return 0
    const custo = r.itens.reduce((acc, it) => acc + (custoUnitario(it.itemId) || 0) * it.quantidade, 0)
    return r.rendimento > 0 ? custo / r.rendimento : custo
  }, [receitas])

  const value = useMemo(() => ({
    receitas, getReceita, getReceitaByProduto, salvarReceita, removerReceita, calcularCusto, custoTotal
  }), [receitas, getReceita, getReceitaByProduto, salvarReceita, removerReceita, calcularCusto, custoTotal])

  return (
    <ReceitaContext.Provider value={value}>
      {children}
    </ReceitaContext.Provider>
  )
}

export function useReceita() {
  const ctx = useContext(ReceitaContext)
  if (!ctx) throw new Error('useReceita precisa de ReceitaProvider')
  return ctx
}

export const UNIDADES_RECEITA: UnidadeMedida[] = ['L', 'mL', 'g', 'kg', 'un', 'cx', 'pct', 'fardo']
