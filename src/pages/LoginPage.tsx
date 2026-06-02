import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const usersPredef = [
  { username: 'admin', papel: 'admin', senha: 'admin123' },
  { username: 'funcionario', papel: 'funcionario', senha: 'func123' },
]

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')

  if (isLoggedIn) {
    navigate('/estoque', { replace: true })
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
    else navigate('/estoque', { replace: true })
  }

  return (
    <div className="min-h-dvh overflow-y-auto flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Gestão de Estoque</h1>
          <p className="text-sm text-gray-400 mt-1">Faça login para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-1">Usuário</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {erro && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{erro}</p>}

          <button type="submit"
            className="min-h-[44px] w-full text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800">Entrar</button>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-400 text-center">Usuários padrão:</p>
            <div className="flex justify-center gap-4 mt-1">
              {usersPredef.map(u => (
                <button key={u.username} type="button" onClick={() => { setUsername(u.username); setPassword(u.senha); setErro('') }}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 underline">{u.username} ({u.papel})</button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
