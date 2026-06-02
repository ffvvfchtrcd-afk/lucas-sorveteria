import { createContext, useContext, useEffect, useRef, ReactNode } from 'react'
import { useStock } from './StockContext'
import { useValidade } from './ValidadeContext'

interface NotificationContextType {
  permission: NotificationPermission | 'unavailable'
}

const NotificationContext = createContext<NotificationContextType>({ permission: 'unavailable' })

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data, getLimites, version } = useStock()
  const { getLotesVencidos, getLotesProximosVencer } = useValidade()
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const todos = [...data.acai, ...data.sorvetes, ...data.materias_primas, ...data.personalizados]

    for (const item of todos) {
      const lim = getLimites(item.id, { minimo: item.quantidadeMinima })
      if (item.quantidadeAtual <= lim.critico) {
        const key = `critico_${item.id}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          try {
            new Notification(`🔴 Item Crítico: ${item.nome}`, {
              body: `Apenas ${item.quantidadeAtual} ${item.unidade} em estoque (mín: ${lim.minimo}, crítico: ${lim.critico})`,
              tag: key,
            })
          } catch {}
        }
      } else if (item.quantidadeAtual <= lim.minimo) {
        const key = `baixo_${item.id}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          try {
            new Notification(`🟡 Estoque Baixo: ${item.nome}`, {
              body: `${item.quantidadeAtual} ${item.unidade} restantes (mínimo: ${lim.minimo})`,
              tag: key,
            })
          } catch {}
        }
      } else {
        notifiedRef.current.delete(`critico_${item.id}`)
        notifiedRef.current.delete(`baixo_${item.id}`)
      }
    }

    const vencidos = getLotesVencidos()
    for (const lote of vencidos) {
      const key = `vencido_${lote.id}`
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key)
        try {
          new Notification(`🗑️ Lote Vencido: ${lote.itemNome}`, {
            body: `${lote.quantidade} unidades vencidas em ${lote.dataValidade}`,
            tag: key,
          })
        } catch {}
      }
    }

    const proximos = getLotesProximosVencer(5)
    for (const lote of proximos) {
      const key = `proximo_${lote.id}`
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key)
        try {
          new Notification(`⚠️ Lote a Vencer: ${lote.itemNome}`, {
            body: `${lote.quantidade} unidades vencem em ${lote.dataValidade}`,
            tag: key,
          })
        } catch {}
      }
    }
  }, [data, getLimites, getLotesVencidos, getLotesProximosVencer, version])

  return (
    <NotificationContext.Provider value={{ permission: 'Notification' in window ? Notification.permission : 'unavailable' }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationContext)
}
