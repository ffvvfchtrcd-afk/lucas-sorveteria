import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

const USERS_KEY = 'estoque_usuarios'

interface User {
  username: string
  nome: string
  papel: 'admin' | 'funcionario'
  password: string
}

interface AuthContextType {
  user: { username: string; nome: string; papel: 'admin' | 'funcionario' } | null
  login: (username: string, password: string) => string | null
  logout: () => void
  isAdmin: boolean
  isLoggedIn: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function carregarUsuarios(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  const defaultUsers: User[] = [
    { username: 'admin', nome: 'Administrador', papel: 'admin', password: 'admin123' },
    { username: 'funcionario', nome: 'Funcionário', papel: 'funcionario', password: 'func123' },
  ]
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers))
  return defaultUsers
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username: string; nome: string; papel: 'admin' | 'funcionario' } | null>(() => {
    try {
      const saved = localStorage.getItem('estoque_sessao')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const login = useCallback((username: string, password: string): string | null => {
    const users = carregarUsuarios()
    const found = users.find(u => u.username === username && u.password === password)
    if (!found) return 'Usuário ou senha inválidos'
    const sessao = { username: found.username, nome: found.nome, papel: found.papel }
    setUser(sessao)
    localStorage.setItem('estoque_sessao', JSON.stringify(sessao))
    return null
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('estoque_sessao')
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAdmin: user?.papel === 'admin',
      isLoggedIn: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa de AuthProvider')
  return ctx
}
