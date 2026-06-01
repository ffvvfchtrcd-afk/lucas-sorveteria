import { useState } from 'react'
import { useStock } from '../context/StockContext'
import { CategoriaSlug, CustomItemInput, CATEGORIAS_BASE, UNIDADES, UnidadeMedida } from '../types'

export default function CadastroPage() {
  const { customItems, adicionarItemPersonalizado, removerItemPersonalizado } = useStock()

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState<CategoriaSlug>('materias_primas')
  const [unidade, setUnidade] = useState<UnidadeMedida>('un')
  const [quantidadeAtual, setQuantidadeAtual] = useState(0)
  const [quantidadeMinima, setQuantidadeMinima] = useState(10)
  const [sucesso, setSucesso] = useState('')

  function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return

    const id = 'custom_' + Date.now()
    const item: CustomItemInput = {
      id,
      nome: nome.trim(),
      categoria,
      quantidadeAtual,
      quantidadeMinima,
      unidade,
    }

    adicionarItemPersonalizado(item)
    setNome('')
    setQuantidadeAtual(0)
    setSucesso(`"${item.nome}" adicionado com sucesso!`)
    setTimeout(() => setSucesso(''), 3000)
  }

  function handleRemover(id: string, nome: string) {
    if (window.confirm(`Remover "${nome}" permanentemente?`)) {
      removerItemPersonalizado(id)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">📝 Cadastro de Produtos</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Adicione ou remova itens do estoque
        </p>
      </div>

      {sucesso && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4 text-sm text-green-700 dark:text-green-300 animate-pulse">
          ✓ {sucesso}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Novo Produto</h2>
        <form onSubmit={handleAdicionar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nome do Produto</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              placeholder="Ex: Leite Condensado"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value as CategoriaSlug)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {CATEGORIAS_BASE.map(cat => (
                <option key={cat.slug} value={cat.slug}>{cat.icone} {cat.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Unidade</label>
            <select
              value={unidade}
              onChange={e => setUnidade(e.target.value as UnidadeMedida)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {UNIDADES.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Quant. Inicial</label>
            <input
              type="number"
              value={quantidadeAtual}
              onChange={e => setQuantidadeAtual(Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Quant. Mínima (alerta baixo)</label>
            <input
              type="number"
              value={quantidadeMinima}
              onChange={e => setQuantidadeMinima(Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Adicionar Produto
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Produtos Customizados {customItems.length > 0 && <span className="text-sm text-gray-400 font-normal">({customItems.length})</span>}
          </h2>
        </div>

        {customItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Nenhum produto customizado ainda. Adicione um acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Unidade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Qtd Inicial</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Mínimo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {customItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.nome}</td>
                    <td className="px-4 py-3 text-gray-500">{CATEGORIAS_BASE.find(c => c.slug === item.categoria)?.nome ?? item.categoria}</td>
                    <td className="px-4 py-3 text-gray-500">{item.unidade}</td>
                    <td className="px-4 py-3 text-gray-500">{item.quantidadeAtual}</td>
                    <td className="px-4 py-3 text-gray-500">{item.quantidadeMinima}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemover(item.id, item.nome)}
                        className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
