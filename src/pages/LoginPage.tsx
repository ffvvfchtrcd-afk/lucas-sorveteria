import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/estoque'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (isLoggedIn) {
    navigate(from, { replace: true })
    return null
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErro('Preencha usuário e senha')
      return
    }
    const err = login(username.trim(), password)
    if (err) setErro(err)
    else navigate(from, { replace: true })
  }

  return (
    <div className="min-h-dvh overflow-y-auto flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" aria-hidden="true">🏪</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Gestão de Estoque</h1>
          <p className="text-sm text-gray-400 mt-1">Faça login para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
          <div>
            <label htmlFor="username" className="text-[10px] text-gray-400 font-medium block mb-1">Usuário</label>
            <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
              placeholder="Digite seu usuário"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label htmlFor="password" className="text-[10px] text-gray-400 font-medium block mb-1">Senha</label>
            <div className="relative">
              <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                placeholder="••••••"
                className="w-full pr-10 px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {erro && <p role="alert" className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{erro}</p>}

          <button type="submit"
            className="min-h-[44px] w-full text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800">Entrar</button>
        </form>
      </div>
    </div>
  )
}
