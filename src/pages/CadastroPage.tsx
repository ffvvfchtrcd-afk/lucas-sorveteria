import { useState } from 'react'
import { useStock } from '../context/StockContext'
import { CustomItemInput, CATEGORIAS_BASE, UNIDADES, UnidadeMedida, TipoItem } from '../types'

export default function CadastroPage() {
  const { customItems, adicionarItemPersonalizado, removerItemPersonalizado, editarItemPersonalizado } = useStock()

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('materias_primas')
  const [tipo, setTipo] = useState<TipoItem>('ambos')
  const [unidade, setUnidade] = useState<UnidadeMedida>('un')
  const [quantidadeAtual, setQuantidadeAtual] = useState(0)
  const [quantidadeMinima, setQuantidadeMinima] = useState(10)
  const [categoriaCustom, setCategoriaCustom] = useState('')
  const [sucesso, setSucesso] = useState('')

  function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return

    const catFinal = categoria === '__custom__' ? categoriaCustom.trim().toLowerCase().replace(/\s+/g, '_') : categoria
    if (categoria === '__custom__' && !categoriaCustom.trim()) return

    const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const item: CustomItemInput = {
      id,
      nome: nome.trim(),
      categoria: catFinal,
      quantidadeAtual,
      quantidadeMinima,
      unidade,
      tipo,
    }

    adicionarItemPersonalizado(item)
    setNome('')
    setQuantidadeAtual(0)
    setSucesso(`✓ "${item.nome}" adicionado com sucesso! Agora ele aparece nas categorias do sistema.`)
    setTimeout(() => setSucesso(''), 4000)
  }

  function handleRemover(id: string, nome: string) {
    if (window.confirm(`Remover "${nome}" permanentemente? Esta ação não pode ser desfeita.`)) {
      removerItemPersonalizado(id)
    }
  }

  function getTipoLabel(t?: TipoItem): string {
    const map: Record<string, string> = { venda: 'Venda (PDV)', producao: 'Produção (insumo)', ambos: 'Ambos' }
    return map[t || 'ambos'] || 'Ambos'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">📝 Cadastro de Produtos</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Crie produtos personalizados que não existem nas categorias padrão. Eles aparecerão no Dashboard e no PDV.
        </p>
      </div>

      {sucesso && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4 text-sm text-green-700 dark:text-green-300 animate-pulse flex items-center gap-2">
          <span>✅</span> {sucesso}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-1 bg-indigo-500 rounded-full" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Criar Novo Produto</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Preencha os campos abaixo para adicionar um novo item ao estoque.</p>
        <form onSubmit={handleAdicionar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nome do Produto <span className="text-red-400">*</span></label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
              placeholder="Ex: Morango Unidade"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <p className="text-[10px] text-gray-400 mt-0.5">Nome visível em todo o sistema</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Categoria <span className="text-red-400">*</span></label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {CATEGORIAS_BASE.map(cat => (
                <option key={cat.slug} value={cat.slug}>{cat.icone} {cat.nome}</option>
              ))}
              <option value="__custom__">➕ Nova categoria...</option>
            </select>
            {categoria === '__custom__' && (
              <input type="text" value={categoriaCustom} onChange={e => setCategoriaCustom(e.target.value)}
                placeholder="Digite o nome da nova categoria"
                className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            )}
            <p className="text-[10px] text-gray-400 mt-0.5">Para agrupar produtos do mesmo tipo</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoItem)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="ambos">Venda + Produção</option>
              <option value="venda">Venda (aparece no PDV)</option>
              <option value="producao">Produção (insumo)</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-0.5"><strong>Venda:</strong> aparece no PDV · <strong>Produção:</strong> usado como insumo</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Unidade de Medida <span className="text-red-400">*</span></label>
            <select value={unidade} onChange={e => setUnidade(e.target.value as UnidadeMedida)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-0.5">Ex: litros, quilos, unidades, pacotes...</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Quantidade Inicial</label>
            <input type="number" value={quantidadeAtual} onChange={e => setQuantidadeAtual(Number(e.target.value))} min={0}
              placeholder="Ex: 50"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <p className="text-[10px] text-gray-400 mt-0.5">Quanto já tem em estoque agora</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Quantidade Mínima</label>
            <input type="number" value={quantidadeMinima} onChange={e => setQuantidadeMinima(Number(e.target.value))} min={0}
              placeholder="Ex: 10"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <p className="text-[10px] text-gray-400 mt-0.5">Gatilho para alerta de estoque baixo</p>
          </div>

          <div className="flex items-end">
            <button type="submit"
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
              + Adicionar Produto
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Produtos Customizados {customItems.length > 0 && <span className="text-sm text-gray-400 font-normal">({customItems.length} cadastrados)</span>}
          </h2>
        </div>

        {customItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <p className="text-3xl mb-2">📝</p>
            <p className="font-medium">Nenhum produto customizado ainda.</p>
            <p className="text-xs mt-1">Use o formulário acima para adicionar produtos que não estão nas categorias padrão.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Tipo (uso)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Unidade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Em Estoque</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Mínimo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {customItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.nome}</td>
                    <td className="px-4 py-3 text-gray-500">{CATEGORIAS_BASE.find(c => c.slug === item.categoria)?.nome ?? item.categoria}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.tipo === 'venda' ? 'bg-green-100 text-green-700' : item.tipo === 'producao' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{getTipoLabel(item.tipo)}</span></td>
                    <td className="px-4 py-3 text-gray-500">{item.unidade}</td>
                    <td className="px-4 py-3 text-gray-500">{item.quantidadeAtual}</td>
                    <td className="px-4 py-3 text-gray-500">{item.quantidadeMinima}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleRemover(item.id, item.nome)}
                        className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">Excluir</button>
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
