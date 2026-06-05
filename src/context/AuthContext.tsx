import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Papel, getPapelLabel } from '../types'

const USERS_KEY = 'estoque_usuarios'

export interface User {
  username: string
  nome: string
  papel: Papel
  password: string
}

type SessionUser = { username: string; nome: string; papel: Papel }

interface AuthContextType {
  user: SessionUser | null
  login: (username: string, password: string) => string | null
  logout: () => void
  isAdmin: boolean
  isLoggedIn: boolean
  usuarios: User[]
  adicionarUsuario: (u: Omit<User, 'username'> & { username: string }) => string | null
  editarUsuario: (username: string, updates: Partial<Omit<User, 'username'>>) => string | null
  removerUsuario: (username: string) => string | null
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

function salvarUsuarios(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const SESSAO_KEY = 'estoque_sessao'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<User[]>(carregarUsuarios)
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
      const saved = localStorage.getItem(SESSAO_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const exigirAdmin = useCallback((): string | null => {
    if (!user) return 'Você precisa estar logado.'
    if (user.papel !== 'admin') return 'Acesso restrito a administradores.'
    return null
  }, [user])

  const login = useCallback((username: string, password: string): string | null => {
    const users = carregarUsuarios()
    const found = users.find(u => u.username === username && u.password === password)
    if (!found) return 'Usuário ou senha inválidos'
    const sessao: SessionUser = { username: found.username, nome: found.nome, papel: found.papel }
    setUser(sessao)
    localStorage.setItem(SESSAO_KEY, JSON.stringify(sessao))
    return null
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSAO_KEY)
  }, [])

  const adicionarUsuario = useCallback((u: Omit<User, 'username'> & { username: string }): string | null => {
    const guard = exigirAdmin(); if (guard) return guard
    if (!u.username.trim() || !u.password) return 'Username e senha são obrigatórios'
    const users = carregarUsuarios()
    if (users.find(x => x.username === u.username)) return 'Já existe um usuário com esse username'
    const novo: User = { username: u.username.trim(), nome: u.nome.trim(), papel: u.papel, password: u.password }
    const lista = [...users, novo]
    salvarUsuarios(lista)
    setUsuarios(lista)
    return null
  }, [exigirAdmin])

  const editarUsuario = useCallback((username: string, updates: Partial<Omit<User, 'username'>>): string | null => {
    const guard = exigirAdmin(); if (guard) return guard
    const users = carregarUsuarios()
    const idx = users.findIndex(x => x.username === username)
    if (idx < 0) return 'Usuário não encontrado'
    if (username === 'admin' && updates.papel && updates.papel !== 'admin') {
      const outrosAdmins = users.filter(x => x.username !== 'admin' && x.papel === 'admin')
      if (outrosAdmins.length === 0) return 'Não é possível rebaixar o admin padrão. Crie outro admin antes.'
    }
    const atualizado: User = { ...users[idx], ...updates, username }
    const lista = [...users]
    lista[idx] = atualizado
    salvarUsuarios(lista)
    setUsuarios(lista)
    if (user?.username === username) {
      const sessao: SessionUser = { ...user, nome: atualizado.nome, papel: atualizado.papel }
      setUser(sessao)
      localStorage.setItem(SESSAO_KEY, JSON.stringify(sessao))
    }
    return null
  }, [exigirAdmin, user])

  const removerUsuario = useCallback((username: string): string | null => {
    const guard = exigirAdmin(); if (guard) return guard
    if (username === 'admin') return 'Não é possível remover o usuário admin padrão'
    const users = carregarUsuarios()
    const alvo = users.find(x => x.username === username)
    if (alvo?.papel === 'admin') {
      const outrosAdmins = users.filter(x => x.username !== username && x.papel === 'admin')
      if (outrosAdmins.length === 0) return 'Não é possível remover o último admin. Crie outro antes.'
    }
    const lista = users.filter(x => x.username !== username)
    salvarUsuarios(lista)
    setUsuarios(lista)
    return null
  }, [exigirAdmin])

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAdmin: user?.papel === 'admin',
      isLoggedIn: !!user,
      usuarios,
      adicionarUsuario,
      editarUsuario,
      removerUsuario,
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

export { getPapelLabel }
