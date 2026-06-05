import { useState, useMemo, useEffect } from 'react'
import { ItemEstoque, UnidadeMedida, Receita } from '../types'
import { useReceita } from '../context/ReceitaContext'
import { usePreco } from '../context/PrecoContext'
import { useStock } from '../context/StockContext'

interface Props {
  item: ItemEstoque
  onClose: () => void
}

const UNIDADES_PADRAO: UnidadeMedida[] = ['L', 'mL', 'g', 'kg', 'un', 'cx', 'pct', 'fardo']

export default function ReceitaModal({ item, onClose }: Props) {
  const { getReceitaByProduto, salvarReceita, removerReceita, calcularCusto } = useReceita()
  const { precos, setPreco } = usePreco()
  const { todosItens } = useStock()

  const receitaExistente = getReceitaByProduto(item.id)

  const [nome, setNome] = useState(receitaExistente?.nome || `${item.nome} - Receita`)
  const [itens, setItens] = useState<{ itemId: string; quantidade: number }[]>(receitaExistente?.itens.map(i => ({ itemId: i.itemId, quantidade: i.quantidade })) || [])
  const [rendimento, setRendimento] = useState(receitaExistente?.rendimento || 1)
  const [busca, setBusca] = useState('')
  const [salvo, setSalvo] = useState('')

  const candidatos = useMemo(() => {
    const lower = busca.toLowerCase()
    return todosItens
      .filter(i => i.id !== item.id)
      .filter(i => !itens.some(it => it.itemId === i.id))
      .filter(i => !lower || i.nome.toLowerCase().includes(lower))
      .slice(0, 8)
  }, [todosItens, busca, itens, item.id])

  const custoUnitario = (itemId: string) => precos.find(p => p.itemId === itemId)?.precoCusto || 0
  const custoReceita = useMemo(() => {
    const r: Receita = {
      id: 'tmp', nome, produtoId: item.id,
      itens: itens.map(i => ({ ...i, itemNome: '', unidade: 'un' as UnidadeMedida })),
      rendimento, dataCriacao: ''
    }
    return calcularCusto(r, custoUnitario)
  }, [itens, rendimento, nome, item.id, calcularCusto])
  const custoUnitarioFinal = rendimento > 0 ? custoReceita / rendimento : custoReceita

  function addItem(itemId: string) {
    setItens(prev => [...prev, { itemId, quantidade: 1 }])
    setBusca('')
  }

  function removerItem(itemId: string) {
    setItens(prev => prev.filter(i => i.itemId !== itemId))
  }

  function alterarQtd(itemId: string, qtd: number) {
    setItens(prev => prev.map(i => i.itemId === itemId ? { ...i, quantidade: Math.max(0.01, qtd) } : i))
  }

  function getNome(id: string) { return todosItens.find(i => i.id === id)?.nome || id }
  function getUnidade(id: string) { return todosItens.find(i => i.id === id)?.unidade || '' }

  function handleSalvar() {
    if (itens.length === 0) {
      alert('Adicione pelo menos 1 ingrediente')
      return
    }
    if (rendimento <= 0) {
      alert('Rendimento deve ser maior que 0')
      return
    }
    salvarReceita({
      id: receitaExistente?.id,
      nome: nome.trim(),
      produtoId: item.id,
      itens: itens.map(i => ({
        itemId: i.itemId,
        itemNome: getNome(i.itemId),
        quantidade: i.quantidade,
        unidade: (todosItens.find(t => t.id === i.itemId)?.unidade || 'un') as UnidadeMedida,
      })),
      rendimento,
    })
    const precoAtual = precos.find(p => p.itemId === item.id)
    setPreco(item.id, item.nome, custoUnitarioFinal, precoAtual?.precoVenda || 0)
    setSalvo(`✓ Receita salva! Custo calculado: R$ ${custoUnitarioFinal.toFixed(2)} por ${item.unidade}`)
    setTimeout(() => setSalvo(''), 3000)
  }

  function handleRemover() {
    if (!receitaExistente) return
    if (!confirm(`Remover a receita de "${item.nome}"?`)) return
    removerReceita(receitaExistente.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">📋 Receita de {item.nome}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cadastre os ingredientes para calcular o custo automaticamente.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 text-xl">✕</button>
        </div>

        {salvo && (
          <div className="mx-5 mt-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">{salvo}</div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nome da receita</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">🧪 Ingredientes</h3>
            <p className="text-xs text-gray-400 mb-2">Adicione as matérias-primas que são consumidas para produzir 1 lote.</p>
            <div className="relative mb-2">
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="🔍 Buscar ingrediente..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              {candidatos.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  {candidatos.map(c => (
                    <button key={c.id} onClick={() => addItem(c.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{c.nome}</span>
                      <span className="text-xs text-gray-400">{c.quantidadeAtual} {c.unidade} · R$ {custoUnitario(c.id).toFixed(2)}/{c.unidade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {itens.length > 0 && (
              <div className="space-y-1.5">
                {itens.map(i => (
                  <div key={i.itemId} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{getNome(i.itemId)}</span>
                    <input type="number" value={i.quantidade} min={0.01} step={0.1}
                      onChange={e => alterarQtd(i.itemId, Number(e.target.value))}
                      className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-center" />
                    <span className="text-xs text-gray-400 w-8">{getUnidade(i.itemId)}</span>
                    <span className="text-xs text-gray-500 w-20 text-right">R$ {(custoUnitario(i.itemId) * i.quantidade).toFixed(2)}</span>
                    <button onClick={() => removerItem(i.itemId)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                ))}
              </div>
            )}
            {itens.length === 0 && (
              <p className="text-xs text-gray-400 italic py-3 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">Nenhum ingrediente. Busque acima para adicionar.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Rendimento (lote)</label>
              <input type="number" value={rendimento} min={0.1} step={0.1}
                onChange={e => setRendimento(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <p className="text-[10px] text-gray-400 mt-0.5">Quantas {item.unidade} esta receita produz</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Custo por {item.unidade}</label>
              <div className="px-3 py-2 text-sm bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold">
                R$ {custoUnitarioFinal.toFixed(2)}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Custo total do lote ÷ rendimento</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs space-y-1">
            <p className="text-gray-600 dark:text-gray-400"><span className="font-semibold">Custo total dos ingredientes:</span> R$ {custoReceita.toFixed(2)}</p>
            <p className="text-gray-600 dark:text-gray-400"><span className="font-semibold">Rendimento:</span> {rendimento} {item.unidade}</p>
            <p className="text-indigo-700 dark:text-indigo-300"><span className="font-semibold">Custo unitário:</span> R$ {custoUnitarioFinal.toFixed(2)} por {item.unidade} (será salvo no preço de custo)</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex flex-wrap gap-2 justify-between">
          {receitaExistente ? (
            <button onClick={handleRemover} className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg hover:bg-red-100">🗑 Remover Receita</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200">Fechar</button>
            <button onClick={handleSalvar} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">✓ Salvar Receita</button>
          </div>
        </div>
      </div>
    </div>
  )
}
