type CollectionName = 'logs' | 'precos' | 'lotes' | 'despesas' | 'limites' | 'quantidades' | 'custom_items'

const COLLECTION_KEYS: Record<CollectionName, string> = {
  logs: 'estoque_movimentacoes',
  precos: 'estoque_precos',
  lotes: 'estoque_lotes',
  despesas: 'estoque_despesas',
  limites: 'estoque_limites',
  quantidades: 'estoque_quantidades',
  custom_items: 'estoque_itens_personalizados',
}

function ler<T>(colecao: CollectionName): T[] {
  try {
    const raw = localStorage.getItem(COLLECTION_KEYS[colecao])
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function escrever<T>(colecao: CollectionName, dados: T[]) {
  localStorage.setItem(COLLECTION_KEYS[colecao], JSON.stringify(dados))
}

function lerObj(colecao: CollectionName): Record<string, any> {
  try {
    const raw = localStorage.getItem(COLLECTION_KEYS[colecao])
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function escreverObj(colecao: CollectionName, dados: Record<string, any>) {
  localStorage.setItem(COLLECTION_KEYS[colecao], JSON.stringify(dados))
}

export const db = {
  // Logs (movimentações)
  logs: {
    listar: () => ler<any>('logs'),
    adicionar: (entrada: any) => {
      const lista = ler<any>('logs')
      lista.unshift(entrada)
      escrever('logs', lista.slice(0, 10000))
      return entrada
    },
    filtrar: (fn: (item: any) => boolean) => ler<any>('logs').filter(fn),
    resumo: () => {
      const logs = ler<any>('logs')
      return {
        total: logs.length,
        vendas: logs.filter(l => l.tipo === 'venda').length,
        perdas: logs.filter(l => l.tipo === 'perda').length,
        entradas: logs.filter(l => l.tipo === 'entrada').length,
        producoes: logs.filter(l => l.tipo === 'producao').length,
      }
    },
  },

  // Preços
  precos: {
    listar: () => ler<any>('precos'),
    get: (itemId: string) => ler<any>('precos').find((p: any) => p.itemId === itemId),
    salvar: (itemId: string, nome: string, custo: number, venda: number) => {
      const lista = ler<any>('precos')
      const idx = lista.findIndex((p: any) => p.itemId === itemId)
      const entry = { itemId, itemNome: nome, precoCusto: custo, precoVenda: venda, dataAtualizacao: new Date().toISOString().slice(0, 10) }
      if (idx >= 0) lista[idx] = entry
      else lista.push(entry)
      escrever('precos', lista)
      return entry
    },
    remover: (itemId: string) => escrever('precos', ler<any>('precos').filter((p: any) => p.itemId !== itemId)),
  },

  // Lotes (validades)
  lotes: {
    listar: () => ler<any>('lotes'),
    adicionar: (lote: any) => {
      const lista = ler<any>('lotes')
      lista.push(lote)
      escrever('lotes', lista)
      return lote
    },
    remover: (id: string) => escrever('lotes', ler<any>('lotes').filter((l: any) => l.id !== id)),
    vencidos: () => {
      const hoje = new Date()
      return ler<any>('lotes').filter((l: any) => new Date(l.dataValidade) < hoje)
    },
    aVencer: (dias: number = 15) => {
      const hoje = new Date()
      const limite = new Date(hoje.getTime() + dias * 86400000)
      return ler<any>('lotes').filter((l: any) => {
        const val = new Date(l.dataValidade)
        return val > hoje && val <= limite
      })
    },
    porItem: (itemId: string) => ler<any>('lotes').filter((l: any) => l.itemId === itemId),
  },

  // Despesas
  despesas: {
    listar: () => ler<any>('despesas'),
    adicionar: (d: any) => {
      const lista = ler<any>('despesas')
      lista.push(d)
      escrever('despesas', lista)
      return d
    },
    remover: (id: string) => escrever('despesas', ler<any>('despesas').filter((d: any) => d.id !== id)),
    doMes: (mes: string) => ler<any>('despesas').filter((d: any) => d.data.startsWith(mes)),
    totalPeriodo: (inicio: string, fim: string) =>
      ler<any>('despesas').filter((d: any) => d.data >= inicio && d.data <= fim).reduce((s: number, d: any) => s + d.valor, 0),
    porTipo: (inicio: string, fim: string) => {
      const filtradas = ler<any>('despesas').filter((d: any) => d.data >= inicio && d.data <= fim)
      const map = new Map<string, number>()
      for (const d of filtradas) map.set(d.tipo, (map.get(d.tipo) || 0) + d.valor)
      return Array.from(map.entries()).map(([tipo, total]) => ({ tipo, total }))
    },
  },

  // Limites
  limites: {
    get: (itemId: string, padrao: { minimo: number }) => {
      const obj = lerObj('limites')
      return obj[itemId] || { minimo: padrao.minimo, critico: Math.max(1, Math.round(padrao.minimo * 0.4)) }
    },
    salvar: (itemId: string, limites: { minimo: number; critico: number }) => {
      const obj = lerObj('limites')
      obj[itemId] = limites
      escreverObj('limites', obj)
    },
    resetar: (itemId: string) => {
      const obj = lerObj('limites')
      delete obj[itemId]
      escreverObj('limites', obj)
    },
    salvarMultiplos: (updates: { id: string; limites: { minimo: number; critico: number } }[]) => {
      const obj = lerObj('limites')
      for (const u of updates) obj[u.id] = u.limites
      escreverObj('limites', obj)
    },
  },

  // Quantidades (overrides)
  quantidades: {
    get: () => lerObj('quantidades'),
    definir: (itemId: string, quantidade: number) => {
      const obj = lerObj('quantidades')
      obj[itemId] = { quantidadeAtual: Math.max(0, quantidade), ultimaAtualizacao: new Date().toISOString().slice(0, 10) }
      escreverObj('quantidades', obj)
    },
    adicionar: (itemId: string, quantidade: number) => {
      const obj = lerObj('quantidades')
      const atual = obj[itemId]?.quantidadeAtual ?? 0
      obj[itemId] = { quantidadeAtual: atual + quantidade, ultimaAtualizacao: new Date().toISOString().slice(0, 10) }
      escreverObj('quantidades', obj)
    },
  },

  // Itens personalizados
  customItems: {
    listar: () => ler<any>('custom_items'),
    adicionar: (item: any) => {
      const lista = ler<any>('custom_items')
      if (!lista.find(c => c.id === item.id)) {
        lista.push(item)
        escrever('custom_items', lista)
      }
    },
    editar: (id: string, updates: any) => {
      const lista = ler<any>('custom_items')
      escrever('custom_items', lista.map(c => c.id === id ? { ...c, ...updates } : c))
    },
    remover: (id: string) => escrever('custom_items', ler<any>('custom_items').filter((c: any) => c.id !== id)),
  },

  // Stats gerais
  estatisticas: () => {
    const logs = ler<any>('logs')
    const precos = ler<any>('precos')
    const despesas = ler<any>('despesas')
    const lotes = ler<any>('lotes')
    const hoje = new Date().toISOString().slice(0, 10)
    const mesAtual = hoje.slice(0, 7)

    const vendas = logs.filter((l: any) => l.tipo === 'venda')
    const receitaMes = vendas.filter((l: any) => l.data.startsWith(mesAtual)).reduce((s: number, v: any) => {
      const p = precos.find((p: any) => p.itemId === v.itemId)
      return s + (p?.precoVenda || 0) * v.quantidade
    }, 0)
    const custoMes = vendas.filter((l: any) => l.data.startsWith(mesAtual)).reduce((s: number, v: any) => {
      const p = precos.find((p: any) => p.itemId === v.itemId)
      return s + (p?.precoCusto || 0) * v.quantidade
    }, 0)
    const despesasMes = despesas.filter((d: any) => d.data.startsWith(mesAtual)).reduce((s: number, d: any) => s + d.valor, 0)

    return {
      hoje,
      mes: mesAtual,
      receita_mes: receitaMes,
      custo_mes: custoMes,
      lucro_bruto_mes: receitaMes - custoMes,
      despesas_mes: despesasMes,
      lucro_liquido_mes: receitaMes - custoMes - despesasMes,
      total_vendas: vendas.length,
      total_despesas: despesas.length,
      total_lotes_vencidos: lotes.filter((l: any) => new Date(l.dataValidade) < new Date()).length,
    }
  },
}
