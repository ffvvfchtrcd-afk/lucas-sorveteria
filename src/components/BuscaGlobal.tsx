import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStock } from '../context/StockContext'

export default function BuscaGlobal() {
  const { todosItens } = useStock()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setAberto(v => !v)
      }
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const resultados = useMemo(() => {
    if (!query.trim()) return todosItens.slice(0, 20)
    const lower = query.toLowerCase()
    return todosItens
      .filter(i => i.nome.toLowerCase().includes(lower) || i.categoria.toLowerCase().includes(lower))
      .slice(0, 20)
  }, [query, todosItens])

  function navegar(path: string) {
    setAberto(false)
    setQuery('')
    navigate(path)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && resultados[selectedIndex]) {
      const item = resultados[selectedIndex]
      const path = item.categoria === 'acai' ? '/estoque/acai' : item.categoria === 'sorvetes' ? '/estoque/sorvetes' : '/estoque/materias-primas'
      navegar(path)
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Buscar (Ctrl+K)"
        aria-label="Abrir busca global"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-gray-200 dark:bg-gray-700 rounded">Ctrl+K</kbd>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setAberto(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar produtos, categorias..."
                className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-200 outline-none placeholder-gray-400"
              />
              <kbd className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">ESC</kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {resultados.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">Nenhum resultado</div>
              ) : (
                resultados.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const path = item.categoria === 'acai' ? '/acai' : item.categoria === 'sorvetes' ? '/sorvetes' : '/materias-primas'
                      navegar(path)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${
                      idx === selectedIndex
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.categoria === 'acai' ? '🟣' : item.categoria === 'sorvetes' ? '🟠' : '🔵'}</span>
                      <div>
                        <div className="font-medium">{item.nome}</div>
                        <div className="text-xs text-gray-400">{item.quantidadeAtual} {item.unidade}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.alerta === 'critico' ? 'bg-red-100 text-red-700' :
                      item.alerta === 'baixo' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>{item.alerta}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
