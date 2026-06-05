import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastTipo = 'sucesso' | 'erro' | 'info' | 'alerta'

export interface Toast {
  id: string
  tipo: ToastTipo
  titulo: string
  mensagem?: string
  duracao: number
}

interface ToastContextType {
  toasts: Toast[]
  mostrar: (tipo: ToastTipo, titulo: string, mensagem?: string, duracao?: number) => void
  sucesso: (titulo: string, mensagem?: string) => void
  erro: (titulo: string, mensagem?: string) => void
  info: (titulo: string, mensagem?: string) => void
  alerta: (titulo: string, mensagem?: string) => void
  remover: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const ICONES: Record<ToastTipo, string> = {
  sucesso: '✅',
  erro: '❌',
  info: 'ℹ️',
  alerta: '⚠️',
}

const CORES: Record<ToastTipo, string> = {
  sucesso: 'border-green-500 bg-green-50 dark:bg-green-950/40',
  erro: 'border-red-500 bg-red-50 dark:bg-red-950/40',
  info: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40',
  alerta: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40',
}

const CORES_TEXTO: Record<ToastTipo, string> = {
  sucesso: 'text-green-800 dark:text-green-200',
  erro: 'text-red-800 dark:text-red-200',
  info: 'text-blue-800 dark:text-blue-200',
  alerta: 'text-yellow-800 dark:text-yellow-200',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remover = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const mostrar = useCallback((tipo: ToastTipo, titulo: string, mensagem?: string, duracao = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6)
    setToasts(t => [...t, { id, tipo, titulo, mensagem, duracao }])
    setTimeout(() => remover(id), duracao)
  }, [remover])

  const sucesso = useCallback((titulo: string, mensagem?: string) => mostrar('sucesso', titulo, mensagem), [mostrar])
  const erro = useCallback((titulo: string, mensagem?: string) => mostrar('erro', titulo, mensagem, 5000), [mostrar])
  const info = useCallback((titulo: string, mensagem?: string) => mostrar('info', titulo, mensagem), [mostrar])
  const alerta = useCallback((titulo: string, mensagem?: string) => mostrar('alerta', titulo, mensagem, 4500), [mostrar])

  return (
    <ToastContext.Provider value={{ toasts, mostrar, sucesso, erro, info, alerta, remover }}>
      {children}
      <div className="fixed top-3 right-3 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-1.5rem)] pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border-l-4 ${CORES[t.tipo]} ${CORES_TEXTO[t.tipo]} shadow-lg animate-slideInRight`}
            role="alert"
          >
            <span className="text-lg shrink-0 mt-0.5">{ICONES[t.tipo]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{t.titulo}</p>
              {t.mensagem && <p className="text-xs mt-0.5 opacity-90 leading-snug">{t.mensagem}</p>}
            </div>
            <button
              onClick={() => remover(t.id)}
              className="shrink-0 text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa de ToastProvider')
  return ctx
}
