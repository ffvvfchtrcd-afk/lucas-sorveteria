import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  icon?: string
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const close = useCallback(
    (v: boolean) => {
      state?.resolve(v)
      setState(null)
    },
    [state]
  )

  const variant = state?.variant ?? 'warning'
  const colorMap = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  } as const

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => close(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slideInRight"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {state.icon && (
                <span className="text-3xl shrink-0" aria-hidden="true">
                  {state.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <h2 id="confirm-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {state.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-line">
                  {state.message}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {state.cancelText ?? 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition focus:outline-none focus:ring-2 ${colorMap[variant]}`}
                autoFocus
              >
                {state.confirmText ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
  return ctx.confirm
}
