import { useState, useMemo } from 'react'
import { useStock } from '../context/StockContext'
import { usePreco } from '../context/PrecoContext'
import { UnidadeMedida, TipoItem, UNIDADES, CATEGORIAS_BASE, ItemEstoque } from '../types'

interface EditForm {
  id: string
  nome: string
  unidade: UnidadeMedida
  tipo: TipoItem
  precoCusto: number
  precoVenda: number
}

const TIPO_OPCOES: { value: TipoItem; label: string }[] = [
  { value: 'venda', label: 'Venda (PDV)' },
  { value: 'producao', label: 'Insumo' },
  { value: 'ambos', label: 'Ambos' },
]

function CardProduto({
  item,
  editando,
  onChange,
  onSalvar,
  onCancelar,
  onEditar,
  preco,
}: {
  item: ItemEstoque
  editando: EditForm | null
  onChange: (updates: Partial<EditForm>) => void
  onSalvar: () => void
  onCancelar: () => void
  onEditar: () => void
  preco: { precoCusto: number; precoVenda: number } | undefined
}) {
  const isEditing = editando?.id === item.id
  const catNome = CATEGORIAS_BASE.find(c => c.slug === item.categoria)?.nome || item.categoria.replace(/_/g, ' ')
  const catIcone = CATEGORIAS_BASE.find(c => c.slug === item.categoria)?.icone || '📂'

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-indigo-400 dark:border-indigo-500 shadow-md p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Editando</span>
          <span className="text-[10px] text-gray-400">{catIcone} {catNome}</span>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Nome</label>
          <input type="text" value={editando.nome}
            onChange={e => onChange({ nome: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Unidade</label>
            <select value={editando.unidade}
              onChange={e => onChange({ unidade: e.target.value as UnidadeMedida })}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Tipo</label>
            <select value={editando.tipo}
              onChange={e => onChange({ tipo: e.target.value as TipoItem })}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {TIPO_OPCOES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Preço de Custo</label>
            <input type="number" value={editando.precoCusto} min={0} step={0.01}
              onChange={e => onChange({ precoCusto: Number(e.target.value) })}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Preço de Venda</label>
            <input type="number" value={editando.precoVenda} min={0} step={0.01}
              onChange={e => onChange({ precoVenda: Number(e.target.value) })}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onSalvar}
            className="flex-1 min-h-[44px] text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors">
            ✓ Salvar
          </button>
          <button onClick={onCancelar}
            className="min-h-[44px] px-5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  const margem = preco && preco.precoCusto > 0
    ? ((preco.precoVenda - preco.precoCusto) / preco.precoCusto * 100).toFixed(0)
    : null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.nome}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">{catIcone} {catNome}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{item.unidade}</span>
      </div>

      <div className="flex items-center gap-2 mb-2.5">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          item.tipo === 'venda' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
          item.tipo === 'producao' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {item.tipo === 'venda' ? 'Venda' : item.tipo === 'producao' ? 'Insumo' : 'Ambos'}
        </span>
        {margem && (
          <span className={`text-[10px] font-medium ${Number(margem) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {margem}% margem
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          {preco ? (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">Custo: <span className="font-medium text-gray-700 dark:text-gray-200">R$ {preco.precoCusto.toFixed(2)}</span></p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Venda: <span className="font-medium text-gray-700 dark:text-gray-200">R$ {preco.precoVenda.toFixed(2)}</span></p>
            </>
          ) : (
            <p className="text-xs text-gray-300 dark:text-gray-600">Sem preço definido</p>
          )}
        </div>
        <button onClick={onEditar}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center text-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:bg-indigo-200 transition-colors">
          ✏️
        </button>
      </div>
    </div>
  )
}

export default function ProdutosPage() {
  const { todosItens, editarItem } = useStock()
  const { precos, setPreco } = usePreco()
  const [busca, setBusca] = useState('')
  const [filtroCat, setFiltroCat] = useState('todas')
  const [editando, setEditando] = useState<EditForm | null>(null)
  const [salvo, setSalvo] = useState('')

  const categorias = useMemo(() => {
    const slugs = new Set(todosItens.map(i => i.categoria))
    const base = CATEGORIAS_BASE.map(c => ({ slug: c.slug, nome: c.nome, icone: c.icone }))
    const extra = [...slugs]
      .filter(s => !CATEGORIAS_BASE.some(c => c.slug === s))
      .map(s => ({
        slug: s,
        nome: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icone: '📂',
      }))
    return [{ slug: 'todas', nome: 'Todas', icone: '📋' }, ...base, ...extra]
  }, [todosItens])

  const itens = useMemo(() => {
    let lista = filtroCat === 'todas' ? todosItens : todosItens.filter(i => i.categoria === filtroCat)
    if (busca.trim()) {
      const lower = busca.toLowerCase()
      lista = lista.filter(i => i.nome.toLowerCase().includes(lower))
    }
    return lista.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [todosItens, filtroCat, busca])

  function iniciarEdicao(item: ItemEstoque) {
    const p = precos.find(p => p.itemId === item.id)
    setEditando({
      id: item.id,
      nome: item.nome,
      unidade: item.unidade,
      tipo: item.tipo || 'ambos',
      precoCusto: p?.precoCusto || 0,
      precoVenda: p?.precoVenda || 0,
    })
  }

  function handleEditChange(updates: Partial<EditForm>) {
    setEditando(prev => prev ? { ...prev, ...updates } : null)
  }

  function salvar() {
    if (!editando) return
    const { id, nome, unidade, tipo, precoCusto, precoVenda } = editando
    const item = todosItens.find(i => i.id === id)
    if (!item) return

    if (nome !== item.nome || unidade !== item.unidade || tipo !== (item.tipo || 'ambos')) {
      editarItem(id, { nome, unidade, tipo })
    }
    setPreco(id, nome, precoCusto, precoVenda)
    setEditando(null)
    setSalvo(`✓ "${nome}" salvo`)
    setTimeout(() => setSalvo(''), 2500)
  }

  function cancelar() {
    setEditando(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">📦 Produtos</h1>
        {salvo && <span className="text-xs text-green-600 font-medium animate-pulse">{salvo}</span>}
      </div>

      <div className="flex gap-2">
        <div className="flex gap-1 overflow-x-auto pb-0.5 flex-1 scrollbar-thin">
          {categorias.map(cat => (
            <button key={cat.slug} onClick={() => { setFiltroCat(cat.slug); setEditando(null) }}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filtroCat === cat.slug
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}>
              {cat.icone} {cat.nome}
            </button>
          ))}
        </div>
      </div>

      <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="🔍 Buscar produto..."
        className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />

      <div className="text-xs text-gray-400 px-0.5">{itens.length} produto(s) · toque em ✏️ para editar</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {itens.map(item => (
          <CardProduto
            key={item.id}
            item={item}
            editando={editando}
            onChange={handleEditChange}
            onSalvar={salvar}
            onCancelar={cancelar}
            onEditar={() => iniciarEdicao(item)}
            preco={precos.find(p => p.itemId === item.id)}
          />
        ))}
        {itens.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p className="font-medium text-sm">Nenhum produto encontrado</p>
            <p className="text-xs mt-1">{busca ? 'Tente outro termo na busca.' : 'Selecione outra categoria.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
