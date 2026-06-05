import { useState } from 'react'
import { useAuth, User } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function UsuariosPage() {
  const { isAdmin, usuarios, adicionarUsuario, editarUsuario, removerUsuario } = useAuth()
  const toast = useToast()

  const [editUsername, setEditUsername] = useState<string | null>(null)
  const [novoUsername, setNovoUsername] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoPapel, setNovoPapel] = useState<'admin' | 'funcionario'>('funcionario')
  const [novaSenha, setNovaSenha] = useState('')
  const [editNome, setEditNome] = useState('')
  const [editPapel, setEditPapel] = useState<'admin' | 'funcionario'>('funcionario')
  const [editSenha, setEditSenha] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">👥 Usuários</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Gerencie quem pode acessar o sistema</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Acesso restrito</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Apenas administradores podem gerenciar usuários.</p>
        </div>
      </div>
    )
  }

  function limpar() {
    setNovoUsername('')
    setNovoNome('')
    setNovaSenha('')
    setNovoPapel('funcionario')
  }

  function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    const erro = adicionarUsuario({
      username: novoUsername,
      nome: novoNome,
      papel: novoPapel,
      password: novaSenha,
    })
    if (erro) {
      toast.erro('Erro ao criar', erro)
      return
    }
    toast.sucesso('Usuário criado!', `${novoNome} (${novoUsername}) agora tem acesso.`)
    limpar()
    setShowAdd(false)
  }

  function iniciarEdicao(u: User) {
    setEditUsername(u.username)
    setEditNome(u.nome)
    setEditPapel(u.papel)
    setEditSenha('')
  }

  function salvarEdicao() {
    if (!editUsername) return
    const updates: any = { nome: editNome.trim(), papel: editPapel }
    if (editSenha.trim()) updates.password = editSenha
    const erro = editarUsuario(editUsername, updates)
    if (erro) {
      toast.erro('Erro ao editar', erro)
      return
    }
    toast.sucesso('Usuário atualizado!', `${editNome} foi atualizado.`)
    setEditUsername(null)
  }

  function handleRemover(u: User) {
    if (window.confirm(`Remover "${u.nome}" (${u.username})? Esta ação não pode ser desfeita.`)) {
      const erro = removerUsuario(u.username)
      if (erro) {
        toast.erro('Erro ao remover', erro)
        return
      }
      toast.info('Usuário removido', `${u.nome} foi excluído.`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">👥 Usuários</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Gerencie quem pode acessar o sistema e seus papéis</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
          <span>➕</span><span>{showAdd ? 'Cancelar' : 'Novo usuário'}</span>
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdicionar} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">➕ Criar novo usuário</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Username (login)</label>
              <input type="text" value={novoUsername} onChange={e => setNovoUsername(e.target.value)} required
                placeholder="ex: lucas, atendente1"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome completo</label>
              <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} required
                placeholder="ex: Lucas Silva"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Senha</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={4}
                placeholder="mínimo 4 caracteres"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Papel</label>
              <select value={novoPapel} onChange={e => setNovoPapel(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="funcionario">👤 Funcionário (só operação)</option>
                <option value="admin">🔑 Administrador (tudo)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
              Criar usuário
            </button>
            <button type="button" onClick={() => { setShowAdd(false); limpar() }} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Usuário</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Papel</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {usuarios.map(u => (
                <tr key={u.username} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    {editUsername === u.username ? (
                      <span className="font-mono text-xs text-gray-500">@{u.username}</span>
                    ) : (
                      <span className="font-mono text-sm text-gray-800 dark:text-gray-200">@{u.username}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                    {editUsername === u.username ? (
                      <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded" />
                    ) : (
                      u.nome
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editUsername === u.username ? (
                      <select value={editPapel} onChange={e => setEditPapel(e.target.value as any)}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded">
                        <option value="funcionario">👤 Funcionário</option>
                        <option value="admin">🔑 Admin</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.papel === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {u.papel === 'admin' ? '🔑' : '👤'} {u.papel}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editUsername === u.username ? (
                      <div className="flex gap-1 justify-end flex-wrap">
                        <input type="password" value={editSenha} onChange={e => setEditSenha(e.target.value)} placeholder="Nova senha (opcional)"
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded w-40" />
                        <button onClick={salvarEdicao} className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700">Salvar</button>
                        <button onClick={() => setEditUsername(null)} className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200">Cancelar</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => iniciarEdicao(u)} className="px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 rounded hover:bg-indigo-100">Editar</button>
                        <button onClick={() => handleRemover(u)} className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded hover:bg-red-100">Remover</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300 space-y-1">
        <p className="font-semibold">ℹ️ Sobre os papéis</p>
        <p>• <strong>🔑 Admin</strong>: acesso total ao sistema, incluindo esta tela, configurações e gerenciamento de usuários.</p>
        <p>• <strong>👤 Funcionário</strong>: pode usar PDV, registrar movimentações, lançar gastos, mas <strong>não pode</strong> acessar Configurações, Cadastro, Usuários ou remover dados.</p>
      </div>
    </div>
  )
}
