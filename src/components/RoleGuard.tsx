import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface RoleGuardProps {
  adminOnly?: boolean
  children: ReactNode
}

export default function RoleGuard({ adminOnly = false, children }: RoleGuardProps) {
  const { user, isAdmin, isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">🔒 Acesso restrito</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Esta área é exclusiva para administradores.</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-6 text-center space-y-2">
          <p className="text-3xl" aria-hidden="true">🚫</p>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Você não tem permissão para acessar esta página.</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">Logado como: <strong>{user?.nome}</strong> ({user?.papel})</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 pt-2">Se precisa de acesso, peça ao administrador do sistema.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
