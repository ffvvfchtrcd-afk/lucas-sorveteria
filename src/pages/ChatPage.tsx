import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { useValidade } from '../context/ValidadeContext'
import { useGastos } from '../context/GastosContext'
import { chatCompletionWithRetry, Message, ToolCall, ToolDefinition } from '../services/openrouter'
import { db } from '../services/database'
import { ItemEstoque, LimitesItem, EstoqueData, CustomItemInput, UnidadeMedida, UNIDADES, DESPESA_TIPOS, DespesaTipo, Despesa, TipoMovimentacao } from '../types'

const API_KEY_STORAGE = 'openrouter_key';

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function gerarSistema(
  data: EstoqueData,
  getLimites: (id: string, d: { minimo: number }) => LimitesItem,
  logs: { tipo: string; quantidade: number; data: string; itemId: string }[],
  precos: { itemId: string; precoCusto: number; precoVenda: number }[],
  despesas: { tipo: string; valor: number; descricao: string; data: string }[]
): string {
  const todos = [...data.acai, ...data.sorvetes, ...data.materias_primas]
  const agora = new Date().toISOString().slice(0, 10)
  const mesAtual = agora.slice(0, 7)

  const criticos = todos.filter(i => {
    const lim = getLimites(i.id, { minimo: i.quantidadeMinima })
    return i.quantidadeAtual <= lim.critico
  })

  const baixos = todos.filter(i => {
    const lim = getLimites(i.id, { minimo: i.quantidadeMinima })
    return i.quantidadeAtual > lim.critico && i.quantidadeAtual <= lim.minimo
  })

  const inventario = todos.map(item => {
    const lim = getLimites(item.id, { minimo: item.quantidadeMinima })
    const status = item.quantidadeAtual <= lim.critico ? '🔴 CRÍTICO' :
                   item.quantidadeAtual <= lim.minimo ? '🟡 BAIXO' : '🟢 OK'
    return `[${item.id}] ${item.nome} | Atual: ${item.quantidadeAtual} ${item.unidade} | Mín: ${lim.minimo} | Crit: ${lim.critico} | ${status} | Cat: ${item.categoria}`
  }).join('\n')

  const vendasMes = logs.filter(l => l.tipo === 'venda' && l.data.startsWith(mesAtual))
  const receitaMes = vendasMes.reduce((s, v) => {
    const p = precos.find(p => p.itemId === v.itemId)
    return s + (p?.precoVenda || 0) * v.quantidade
  }, 0)
  const despesasMes = despesas.filter(d => d.data.startsWith(mesAtual)).reduce((s, d) => s + d.valor, 0)

  return `Você é um assistente especializado em gestão de estoque e finanças de uma sorveteria/açaíteria.
Você também ENSINA o usuário a usar o sistema quando ele perguntar "como fazer X".

Data de hoje: ${agora}

## INVENTÁRIO ATUAL:
${inventario}

## RESUMO RÁPIDO
- ${criticos.length} itens em estado CRÍTICO 🔴
- ${baixos.length} itens com estoque BAIXO 🟡
- ${todos.length - criticos.length - baixos.length} itens OK 🟢

## RESUMO FINANCEIRO DO MÊS (${mesAtual})
- Receita (vendas): R$ ${receitaMes.toFixed(2)}
- Despesas (contas, aluguel, etc): R$ ${despesasMes.toFixed(2)}
- ${despesas.length} despesas registradas no total

## SEJA PROATIVO
- Se o usuário abrir o chat sem mensagem, faça uma saudação e já sugira ações com base no estado do estoque e finanças
- Ex: "Olá! Este mês temos R$ X em receita e R$ Y em despesas. X itens críticos no estoque."
- Se notar itens críticos, já sugira providências
- Se o usuário perguntar de forma vaga, faça perguntas direcionadas

## ENSINE O USUÁRIO (NOVO!)
Quando o usuário perguntar "como fazer X" ou "como cadastro Y", EXPLIQUE o passo a passo com clareza:
- Ex: "Como cadastrar um produto?" → "Vá em Estoque > Cadastro, preencha nome, unidade e tipo, depois vá em Estoque > Preços para definir o valor de venda."
- Ex: "Como registrar uma venda?" → "Vá em CAIXA > PDV, clique no produto, ajuste a quantidade, e finalize a venda."
- Ex: "Cadastrei um produto, e agora?" → "Agora vá em Estoque > Preços para definir o preço de custo e venda. Sem preço, o PDV e o Financeiro não funcionam."
- Ex: "Como registrar uma despesa?" → "Vá em Financeiro > Lançamentos, use o Registro Rápido (ex: 'paguei 200 de luz') ou o formulário manual."
- Ex: "Por que o financeiro mostra R$ 0?" → "Você precisa cadastrar os preços dos produtos em Estoque > Preços. É o preço de venda que calcula a receita."

## COMANDOS DISPONÍVEIS
Você TEM acesso a funções para consultar TUDO — estoque, finanças, validades, movimentações. Use-as sempre:

### 📦 Estoque
- listar_estoque — inventário completo
- buscar_item — buscar por nome
- listar_criticos / listar_baixos — alertas
- adicionar_estoque / definir_estoque — alterar qtd
- criar_item / editar_item / remover_item — CRUD completo
- resumo_para_compras — lista de compras

### 💰 Finanças
- resumo_financeiro — lucro, receita, despesas (com período)
- listar_despesas — todos os gastos (aluguel, luz...)
- despesas_por_tipo — gastos agrupados por categoria
- registrar_despesa — REGISTRA novo gasto (auto-categoriza pela descrição)
- resumo_despesas_mensal — relatório completo do mês com % de cada tipo
- estatisticas_gerais — resumo completo do negócio

### 📅 Validades
- lotes_vencidos — o que já venceu
- lotes_a_vencer — o que vai vencer em breve
- lotes_por_item — lotes de um produto específico

### 📋 Movimentações
- ultimas_movimentacoes — log detalhado (filtro por tipo)
- resumo_movimentacoes — contagem de vendas, perdas, etc

## REGRAS DE FORMATAÇÃO (IMPORTANTE):
- Use **Markdown** para formatar suas respostas de forma organizada e visual
- SEMPRE use títulos, listas, tabelas e emojis para estruturar resumos financeiros
- Emojis de status: 🟢 OK | 🟡 Baixo | 🔴 Crítico
- Emojis financeiros: 💰 receita | 💸 despesas | 📈 lucro
- Depois de alterar o estoque, confirme com: + Adicionado X de Y
- Use --- como separador entre seções

## REGRAS GERAIS:
- SEMPRE confirme em português o que você fez APÓS executar a ação
- Se o usuário falar o nome de um item mas não o ID, use buscar_item primeiro
- Se o usuário não especificar a quantidade, PERGUNTE antes
- **IMPORTANTE: Seja AUTÔNOMO e AJA IMEDIATAMENTE**
- NUNCA peça confirmação tipo "Confirma essa ação?" — se o usuário pediu, execute direto
- Só pergunte quando houver ambiguidade REAL
- Seja educado e objetivo

## REGISTRO DE GASTOS (IMPORTANTE):
- Quando o usuário disser algo como "gastei 50 com transporte" ou "paguei 200 de luz", use **registrar_despesa** imediatamente
- Se o usuário enviar UMA LISTA com VÁRIOS gastos (ex: "gastei 1000 aluguel\n paguei 200 luz"), chame **registrar_despesa** para CADA ITEM da lista individualmente
- Você DEVE auto-classificar o tipo baseado na descrição:
  - "aluguel" → aluguel do ponto/comércio
  - "energia", "luz", "conta de luz" → energia
  - "agua", "conta de água" → agua
  - "internet", "net", "wi-fi", "wifi" → internet
  - "salário", "funcionário", "empregado" → salario
  - "manutenção", "conserto", "reparo", "troca" → manutencao
  - "imposto", "taxa", "iss", "icms", "simples" → imposto
  - "perda", "quebrou", "venceu", "estragou" → perda
  - "transporte", "uber", "combustível", "gasolina", "diesel", "passagem", "pedagio", "ônibus" → outros
  - "embalagem", "sacola", "copo", "guardanapo", "papel", "luvas" → outros
  - "material de limpeza", "detergente", "cloro", "sabão", "desinfetante" → outros
  - "gás", "botijão", "gas de cozinha" → outros
  - "compra", "mercado", "supermercado", "comida", "alimentação", "lanche" → outros
  - QUALQUER OUTRA COISA que não encaixe em aluguel/energia/agua/internet/salario/manutencao/imposto/perda → outros (com descrição clara!)
- **REGRA DE OURO**: Se tiver dúvida entre duas categorias, escolha a MAIS ESPECÍFICA. Só use "outros" se realmente não encaixar em nenhuma.
- Depois de registrar, mostre o resumo formatado: "✅ Registrado: ⚡ Conta de Luz — R$ 200,00 (15/05)"
- Responda em português brasileiro
- NUNCA invente dados - use apenas as funções`
}

function buildTools(todos: ItemEstoque[]): ToolDefinition[] {
  const itensStr = todos.map(i => `${i.id}: ${i.nome} (${i.unidade})`).join('\n')

  return [
    // ─── ESTOQUE ───
    { type: 'function', function: { name: 'listar_estoque', description: 'Retorna a lista completa do estoque com quantidades atuais, mínimos, críticos e status de cada item', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'listar_criticos', description: 'Lista apenas itens em estado CRÍTICO (precisam ser repostos urgentemente)', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'listar_baixos', description: 'Lista apenas itens com estoque BAIXO (precisam de reposição em breve)', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'buscar_item', description: 'Busca um item pelo nome', parameters: { type: 'object', properties: { termo: { type: 'string', description: 'Nome ou parte do nome' } }, required: ['termo'] } } },
    { type: 'function', function: { name: 'adicionar_estoque', description: 'ADICIONA quantidade a um item (quando chega mercadoria nova)', parameters: { type: 'object', properties: { item_id: { type: 'string', description: `ID do item. IDs:\n${itensStr}` }, quantidade: { type: 'number', description: 'Quantidade a ADICIONAR (soma)' } }, required: ['item_id', 'quantidade'] } } },
    { type: 'function', function: { name: 'definir_estoque', description: 'DEFINE a quantidade exata de um item (venda, perda, ajuste). Substitui o valor.', parameters: { type: 'object', properties: { item_id: { type: 'string', description: `ID do item. IDs:\n${itensStr}` }, quantidade: { type: 'number', description: 'Nova quantidade EXATA' } }, required: ['item_id', 'quantidade'] } } },
    { type: 'function', function: { name: 'criar_item', description: 'CRIA um novo produto com nome, categoria, unidade, tipo, qtd inicial e mínima', parameters: { type: 'object', properties: { nome: { type: 'string' }, categoria: { type: 'string', description: 'Ex: acai, sorvetes, materias_primas, frutas...' }, tipo: { type: 'string', enum: ['venda', 'producao', 'ambos'] }, unidade: { type: 'string', enum: ['L', 'mL', 'g', 'kg', 'un', 'cx', 'pct', 'fardo'] }, quantidade_inicial: { type: 'number' }, quantidade_minima: { type: 'number' } }, required: ['nome', 'categoria', 'unidade', 'quantidade_inicial', 'quantidade_minima'] } } },
    { type: 'function', function: { name: 'editar_item', description: 'EDITA nome, categoria, tipo, unidade ou qtd mínima de um item', parameters: { type: 'object', properties: { item_id: { type: 'string' }, nome: { type: 'string' }, categoria: { type: 'string' }, tipo: { type: 'string', enum: ['venda', 'producao', 'ambos'] }, unidade: { type: 'string', enum: ['L', 'mL', 'g', 'kg', 'un', 'cx', 'pct', 'fardo'] }, quantidade_minima: { type: 'number' } }, required: ['item_id'] } } },
    { type: 'function', function: { name: 'remover_item', description: 'REMOVE um produto permanentemente. SEMPRE confirme antes.', parameters: { type: 'object', properties: { item_id: { type: 'string' } }, required: ['item_id'] } } },
    { type: 'function', function: { name: 'resumo_para_compras', description: 'Gera lista de tudo que precisa ser comprado, separado por categoria', parameters: { type: 'object', properties: {} } } },

    // ─── FINANÇAS ───
    { type: 'function', function: { name: 'resumo_financeiro', description: 'Resumo financeiro completo: receita, custo, lucro bruto/líquido, despesas. Período opcional (YYYY-MM-DD).', parameters: { type: 'object', properties: { inicio: { type: 'string', description: 'Data início YYYY-MM-DD (opcional)' }, fim: { type: 'string', description: 'Data fim YYYY-MM-DD (opcional)' } } } } },
    { type: 'function', function: { name: 'listar_despesas', description: 'Lista todas as despesas registradas (aluguel, luz, água, perdas...). Filtráveis por mês.', parameters: { type: 'object', properties: { mes: { type: 'string', description: 'Mês YYYY-MM (opcional, padrão: atual)' } } } } },
    { type: 'function', function: { name: 'despesas_por_tipo', description: 'Mostra total de despesas agrupado por tipo (aluguel, energia, etc) em um período.', parameters: { type: 'object', properties: { inicio: { type: 'string', description: 'YYYY-MM-DD (opcional)' }, fim: { type: 'string', description: 'YYYY-MM-DD (opcional)' } } } } },
    { type: 'function', function: { name: 'registrar_despesa', description: 'REGISTRA uma despesa. Você DEVE auto-classificar o tipo baseado na descrição. Ex: "aluguel" para aluguel, "energia" para conta de luz, "agua" para água, "internet" para internet, "salario" para salário/funcionários, "manutencao" para consertos/reparos/manutenção, "imposto" para impostos/taxas, "perda" para produtos perdidos/vencidos, "outros" para gastos diversos.', parameters: { type: 'object', properties: { valor: { type: 'number', description: 'Valor da despesa (R$)' }, descricao: { type: 'string', description: 'Descrição CLARA do que foi pago/com prado. Ex: "Compra de caixa eletrônico", "Conta de água mensal", "Material de limpeza". NUNCA use "Outros" ou "Gasto" genérico. Seja específico.' }, data: { type: 'string', description: 'Data no formato YYYY-MM-DD (padrão: hoje)' }, tipo: { type: 'string', enum: ['aluguel', 'energia', 'agua', 'internet', 'salario', 'manutencao', 'imposto', 'perda', 'outros'], description: 'Categoria. Se não tiver certeza, use outros' }, observacao: { type: 'string', description: 'Observação opcional' } }, required: ['valor', 'descricao'] } } },
    { type: 'function', function: { name: 'resumo_despesas_mensal', description: 'Resumo COMPLETO do mês com total, % de cada tipo de despesa, e comparativo com receita. Perfeito para relatórios mensais.', parameters: { type: 'object', properties: { mes: { type: 'string', description: 'Mês YYYY-MM (padrão: atual)' } } } } },

    // ─── VALIDADES ───
    { type: 'function', function: { name: 'lotes_vencidos', description: 'Lista todos os lotes vencidos no estoque', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'lotes_a_vencer', description: 'Lista lotes que vão vencer em breve', parameters: { type: 'object', properties: { dias: { type: 'number', description: 'Quantidade de dias (padrão: 15)' } } } } },
    { type: 'function', function: { name: 'lotes_por_item', description: 'Mostra todos os lotes de um item específico', parameters: { type: 'object', properties: { item_id: { type: 'string', description: 'ID do item' } }, required: ['item_id'] } } },

    // ─── LOGS / MOVIMENTAÇÕES ───
    { type: 'function', function: { name: 'ultimas_movimentacoes', description: 'Retorna as últimas movimentações do estoque (vendas, entradas, perdas, produções)', parameters: { type: 'object', properties: { limite: { type: 'number', description: 'Quantidade máxima (padrão: 20)' }, tipo: { type: 'string', description: 'Filtrar por tipo: venda, entrada, perda, producao (opcional)' } } } } },
    { type: 'function', function: { name: 'resumo_movimentacoes', description: 'Resumo completo de todas as movimentações: total de vendas, perdas, entradas, produções', parameters: { type: 'object', properties: {} } } },

    // ─── ESTATÍSTICAS ───
    { type: 'function', function: { name: 'estatisticas_gerais', description: 'Retorna estatísticas completas do negócio: receita do mês, despesas, lucro, total vendas, lotes vencidos', parameters: { type: 'object', properties: {} } } },
  ]
}

function executarTool(
  toolCall: ToolCall,
  adicionarQuantidade: (id: string, qtd: number) => void,
  definirQuantidade: (id: string, qtd: number) => void,
  getLimites: (id: string, d: { minimo: number }) => LimitesItem,
  buscarItemPorNome: (nome: string) => ItemEstoque | null,
  todosItens: ItemEstoque[],
  addLog?: (tipo: TipoMovimentacao, itemId: string, itemNome: string, quantidade: number, origem?: string, motivo?: string) => void,
  adicionarItemPersonalizado?: (item: CustomItemInput) => void,
  editarItemPersonalizado?: (itemId: string, updates: Partial<CustomItemInput>) => void,
  removerItemPersonalizado?: (itemId: string) => void,
  logs?: { tipo: string; quantidade: number; data: string; itemId: string }[],
  precos?: { itemId: string; precoCusto: number; precoVenda: number }[],
  adicionarDespesa?: (tipo: DespesaTipo, valor: number, descricao: string, data: string, observacao?: string) => void,
  despesas?: Despesa[],
): string {
  const args = JSON.parse(toolCall.function.arguments)

  function calcularFinanceiro(inicio: string, fim: string) {
    const vendas = (logs || []).filter(l => l.tipo === 'venda' && (l.data || '').slice(0, 10) >= inicio && (l.data || '').slice(0, 10) <= fim)
    const receita = vendas.reduce((s, v) => {
      const p = (precos || []).find(p => p.itemId === v.itemId)
      return s + (p?.precoVenda || 0) * v.quantidade
    }, 0)
    const custo = vendas.reduce((s, v) => {
      const p = (precos || []).find(p => p.itemId === v.itemId)
      return s + (p?.precoCusto || 0) * v.quantidade
    }, 0)
    return { receita, custo, lucroBruto: receita - custo }
  }

  switch (toolCall.function.name) {
    case 'listar_estoque': {
      return JSON.stringify(todosItens.map(i => {
        const lim = getLimites(i.id, { minimo: i.quantidadeMinima })
        return {
          id: i.id, nome: i.nome, categoria: i.categoria,
          atual: i.quantidadeAtual, minimo: lim.minimo, critico: lim.critico,
          unidade: i.unidade, alerta: i.quantidadeAtual <= lim.critico ? 'critico' : i.quantidadeAtual <= lim.minimo ? 'baixo' : 'ok'
        }
      }))
    }

    case 'listar_criticos': {
      const criticos = todosItens.filter(i => {
        const lim = getLimites(i.id, { minimo: i.quantidadeMinima })
        return i.quantidadeAtual <= lim.critico
      })
      return JSON.stringify(criticos.length > 0 ? criticos : { mensagem: 'Nenhum item em estado crítico no momento.' })
    }

    case 'listar_baixos': {
      const baixos = todosItens.filter(i => {
        const lim = getLimites(i.id, { minimo: i.quantidadeMinima })
        return i.quantidadeAtual > lim.critico && i.quantidadeAtual <= lim.minimo
      })
      return JSON.stringify(baixos.length > 0 ? baixos : { mensagem: 'Nenhum item com estoque baixo no momento.' })
    }

    case 'buscar_item': {
      const itens = todosItens.filter(i =>
        i.nome.toLowerCase().includes(args.termo.toLowerCase())
      )
      return itens.length > 0
        ? JSON.stringify(itens)
        : JSON.stringify({ erro: `Nenhum item encontrado com "${args.termo}". Use listar_estoque para ver todos.` })
    }

    case 'adicionar_estoque': {
      const id = args.item_id
      const qtd = Number(args.quantidade)
      if (!id || isNaN(qtd) || qtd <= 0) return JSON.stringify({ erro: 'ID do item e quantidade positiva são obrigatórios' })

      const item = todosItens.find(i => i.id === id)
      if (!item) return JSON.stringify({ erro: `Item com ID "${id}" não encontrado` })

      const atualAntes = item.quantidadeAtual
      adicionarQuantidade(id, qtd)
      addLog?.('entrada', id, item.nome, qtd, 'Chat IA')

      return JSON.stringify({
        sucesso: true,
        mensagem: `✅ Adicionado ${qtd} ${item.unidade} de "${item.nome}". Antes: ${atualAntes} ${item.unidade}, Agora: ${atualAntes + qtd} ${item.unidade}`,
        item: item.nome, quantidade_adicionada: qtd, novo_total: atualAntes + qtd, unidade: item.unidade
      })
    }

    case 'definir_estoque': {
      const id = args.item_id
      const qtd = Number(args.quantidade)
      if (!id || isNaN(qtd) || qtd < 0) return JSON.stringify({ erro: 'ID do item e quantidade válida são obrigatórios' })

      const item = todosItens.find(i => i.id === id)
      if (!item) return JSON.stringify({ erro: `Item com ID "${id}" não encontrado` })

      const atualAntes = item.quantidadeAtual
      definirQuantidade(id, qtd)
      const tipo = qtd < atualAntes ? 'saida' : 'ajuste'
      addLog?.(tipo, id, item.nome, qtd - atualAntes, 'Chat IA')

      return JSON.stringify({
        sucesso: true,
        mensagem: `✅ "${item.nome}" atualizado. Antes: ${atualAntes} ${item.unidade}, Agora: ${qtd} ${item.unidade}`,
        item: item.nome, quantidade_anterior: atualAntes, quantidade_nova: qtd, unidade: item.unidade
      })
    }

    case 'criar_item': {
      const nome = args.nome?.trim()
      const categoria = args.categoria?.trim().toLowerCase().replace(/\s+/g, '_')
      const unidade = args.unidade
      const tipoItem = args.tipo || 'ambos'
      const qtdInicial = Number(args.quantidade_inicial) || 0
      const qtdMinima = Number(args.quantidade_minima) || 10
      const unidadesValidas = ['L', 'mL', 'g', 'kg', 'un', 'cx', 'pct', 'fardo']
      const tiposValidos = ['venda', 'producao', 'ambos']

      if (!nome) return JSON.stringify({ erro: 'Nome do produto é obrigatório' })
      if (!unidadesValidas.includes(unidade)) return JSON.stringify({ erro: `Unidade inválida. Use: ${unidadesValidas.join(', ')}` })
      if (!tiposValidos.includes(tipoItem)) return JSON.stringify({ erro: `Tipo inválido. Use: venda, producao, ambos` })

      const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
      const novoItem: CustomItemInput = {
        id, nome, categoria, tipo: tipoItem as 'venda' | 'producao' | 'ambos',
        quantidadeAtual: qtdInicial, quantidadeMinima: qtdMinima, unidade,
      }
      adicionarItemPersonalizado?.(novoItem)
      addLog?.('entrada', id, nome, qtdInicial, 'Chat IA', 'Criação de novo item')

      return JSON.stringify({
        sucesso: true,
        mensagem: `✅ Novo item criado!\nNome: ${nome}\nCategoria: ${categoria}\nTipo: ${tipoItem}\nUnidade: ${unidade}\nQuantidade inicial: ${qtdInicial}\nQuantidade mínima: ${qtdMinima}`,
        item: { id, nome, categoria, tipo: tipoItem, unidade, quantidade_inicial: qtdInicial, quantidade_minima: qtdMinima },
      })
    }

    case 'editar_item': {
      const itemId = args.item_id
      const item = todosItens.find(i => i.id === itemId)
      if (!item) return JSON.stringify({ erro: `Item com ID "${itemId}" não encontrado` })

      const updates: Partial<CustomItemInput> = {}
      if (args.nome) updates.nome = args.nome.trim()
      if (args.categoria) updates.categoria = args.categoria.trim().toLowerCase().replace(/\s+/g, '_')
      if (args.tipo) updates.tipo = args.tipo
      if (args.unidade) updates.unidade = args.unidade
      if (args.quantidade_minima !== undefined) updates.quantidadeMinima = Number(args.quantidade_minima)

      editarItemPersonalizado?.(itemId, updates)

      return JSON.stringify({
        sucesso: true,
        mensagem: `✅ Item "${item.nome}" atualizado com sucesso!`,
      })
    }

    case 'remover_item': {
      const itemId = args.item_id
      const item = todosItens.find(i => i.id === itemId)
      if (!item) return JSON.stringify({ erro: `Item com ID "${itemId}" não encontrado` })

      removerItemPersonalizado?.(itemId)
      addLog?.('ajuste', itemId, item.nome, 0, 'Chat IA', 'Item removido do estoque')

      return JSON.stringify({
        sucesso: true,
        mensagem: `✅ Item "${item.nome}" removido do estoque.`,
      })
    }

    case 'resumo_para_compras': {
      const categorias: Record<string, ItemEstoque[]> = { acai: [], sorvetes: [], materias_primas: [] }
      for (const item of todosItens) {
        const lim = getLimites(item.id, { minimo: item.quantidadeMinima })
        if (item.quantidadeAtual <= lim.minimo) {
          categorias[item.categoria]?.push(item)
        }
      }
      return JSON.stringify(categorias)
    }

    case 'resumo_financeiro': {
      const hoje = new Date()
      const inicio = args.inicio || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
      const fim = args.fim || hoje.toISOString().slice(0, 10)
      const stats = db.estatisticas()
      const despTotal = db.despesas.totalPeriodo(inicio, fim)
      const fin = calcularFinanceiro(inicio, fim)
      return JSON.stringify({
        periodo: `${inicio} a ${fim}`,
        receita_total: fin.receita,
        custo_vendas: fin.custo,
        lucro_bruto: fin.lucroBruto,
        despesas_total: despTotal,
        lucro_liquido: fin.lucroBruto - despTotal,
        margem_bruta: fin.receita > 0 ? `${((fin.lucroBruto / fin.receita) * 100).toFixed(0)}%` : '0%',
        margem_liquida: fin.receita > 0 ? `${(((fin.lucroBruto - despTotal) / fin.receita) * 100).toFixed(0)}%` : '0%',
      })
    }

    case 'listar_despesas': {
      const despesas = db.despesas.listar()
      let filtradas = despesas
      if (args.mes) filtradas = despesas.filter((d: any) => d.data.startsWith(args.mes))
      return JSON.stringify(filtradas.length > 0 ? filtradas : { mensagem: 'Nenhuma despesa encontrada neste período.' })
    }

    case 'despesas_por_tipo': {
      const hoje = new Date()
      const inicio = args.inicio || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
      const fim = args.fim || hoje.toISOString().slice(0, 10)
      return JSON.stringify(db.despesas.porTipo(inicio, fim))
    }

    case 'lotes_vencidos': {
      const vencidos = db.lotes.vencidos()
      return JSON.stringify(vencidos.length > 0 ? vencidos : { mensagem: 'Nenhum lote vencido no momento.' })
    }

    case 'lotes_a_vencer': {
      const dias = args.dias || 15
      return JSON.stringify(db.lotes.aVencer(dias))
    }

    case 'lotes_por_item': {
      return JSON.stringify(db.lotes.porItem(args.item_id))
    }

    case 'ultimas_movimentacoes': {
      const limite = args.limite || 20
      let logs2 = db.logs.listar()
      if (args.tipo) logs2 = logs2.filter((l: any) => l.tipo === args.tipo)
      return JSON.stringify(logs2.slice(0, limite))
    }

    case 'resumo_movimentacoes': {
      return JSON.stringify(db.logs.resumo())
    }

    case 'estatisticas_gerais': {
      const vendas = (logs || []).filter((l: any) => l.tipo === 'venda')
      const receitaTotal = vendas.reduce((s: number, v: any) => {
        const p = (precos || []).find((p: any) => p.itemId === v.itemId)
        return s + (p?.precoVenda || 0) * v.quantidade
      }, 0)
      const custoTotal = vendas.reduce((s: number, v: any) => {
        const p = (precos || []).find((p: any) => p.itemId === v.itemId)
        return s + (p?.precoCusto || 0) * v.quantidade
      }, 0)
      const despesasTotal = db.despesas.listar().reduce((s: number, d: any) => s + d.valor, 0)
      return JSON.stringify({
        ...db.estatisticas(),
        receita_total_geral: receitaTotal,
        custo_total_geral: custoTotal,
        despesas_total_geral: despesasTotal,
        lucro_liquido_geral: receitaTotal - custoTotal - despesasTotal,
      })
    }

    case 'registrar_despesa': {
      const valor = Number(args.valor)
      if (!args.descricao || isNaN(valor) || valor <= 0) return JSON.stringify({ erro: 'Descrição e valor positivo são obrigatórios' })
      const tipo: DespesaTipo = args.tipo || 'outros'
      const data = args.data || new Date().toISOString().slice(0, 10)
      let descricao = args.descricao.trim()
      descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1)
      adicionarDespesa?.(tipo, valor, descricao, data, args.observacao)
      return JSON.stringify({ sucesso: true, mensagem: `✅ Gasto registrado: ${DESPESA_TIPOS.find(t => t.value === tipo)?.icone} ${descricao} — R$ ${valor.toFixed(2)} em ${data}` })
    }

    case 'resumo_despesas_mensal': {
      const mes = args.mes || new Date().toISOString().slice(0, 7)
      const desps = (despesas || []).filter((d: any) => d.data.startsWith(mes))
      const total = desps.reduce((s: number, d: any) => s + d.valor, 0)
      const porTipo = new Map<string, number>()
      for (const d of desps) porTipo.set(d.tipo, (porTipo.get(d.tipo) || 0) + d.valor)
      const detalhes = Array.from(porTipo.entries()).map(([tipo, val]) => ({
        tipo, total: val, percentual: total > 0 ? `${((val / total) * 100).toFixed(0)}%` : '0%',
        icone: DESPESA_TIPOS.find(t => t.value === tipo)?.icone || '',
      }))
      const vendas = (logs || []).filter((l: any) => l.tipo === 'venda' && l.data.startsWith(mes))
      const receita = vendas.reduce((s: number, v: any) => {
        const p = (precos || []).find((p: any) => p.itemId === v.itemId)
        return s + (p?.precoVenda || 0) * v.quantidade
      }, 0)
      return JSON.stringify({ mes, total_despesas: total, quantidade: desps.length, por_tipo: detalhes, receita_mes: receita, despesas_vs_receita: receita > 0 ? `${((total / receita) * 100).toFixed(0)}%` : 'N/A' })
    }

    default:
      return JSON.stringify({ erro: `Função "${toolCall.function.name}" desconhecida` })
  }
}

type MdxProps = { children?: React.ReactNode; className?: string; href?: string }

const markdownComponents = {
  table: ({ children }: MdxProps) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: MdxProps) => (
    <th className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-left font-semibold text-gray-600 dark:text-gray-300">{children}</th>
  ),
  td: ({ children }: MdxProps) => (
    <td className="border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-gray-700 dark:text-gray-300">{children}</td>
  ),
  code: ({ className, children, ...props }: MdxProps) => {
    const isInline = !className
    if (isInline) {
      return <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-pink-600 dark:text-pink-400">{children}</code>
    }
    return (
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs">
        <code className={className} {...props}>{children}</code>
      </pre>
    )
  },
  hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
  ul: ({ children }: MdxProps) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
  ol: ({ children }: MdxProps) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
  h1: ({ children }: MdxProps) => <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-3 mb-1">{children}</h1>,
  h2: ({ children }: MdxProps) => <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mt-3 mb-1">{children}</h2>,
  h3: ({ children }: MdxProps) => <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-2 mb-1">{children}</h3>,
  p: ({ children }: MdxProps) => <p className="text-sm mb-1 last:mb-0 leading-relaxed text-gray-800 dark:text-gray-200">{children}</p>,
  strong: ({ children }: MdxProps) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }: MdxProps) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">{children}</a>
  ),
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[95%] md:max-w-[80%] rounded-2xl px-3 md:px-4 py-3 ${
        isUser
          ? 'bg-indigo-600 text-white rounded-br-md'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md shadow-sm dark:shadow-black/20'
      }`}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:mt-0 [&_table]:w-full">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
        <p className={`text-[10px] mt-2 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { data, adicionarQuantidade, definirQuantidade, getLimites, buscarItemPorNome, todosItens, adicionarItemPersonalizado, editarItemPersonalizado, removerItemPersonalizado } = useStock()
  const { addLog, logs } = useLog()
  const { precos } = usePreco()
  const { despesas, adicionarDespesa } = useGastos()
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '')
  const [keyInput, setKeyInput] = useState(apiKey)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversation, setConversation] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const proativoFeito = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // IA proativa - saudação automática ao abrir o chat
  useEffect(() => {
    if (proativoFeito.current || !apiKey || messages.length > 0) return
    proativoFeito.current = true

    const timeout = setTimeout(async () => {
      const systemContent = gerarSistema(data, getLimites, logs, precos, despesas)
      const tools = buildTools(todosItens)
      const history: Message[] = [
        { role: 'system', content: systemContent + '\n\nFaça uma saudação proativa! Analise o estoque e as finanças e sugira ações com base no estado atual. Seja educado e direto. Lembre ao usuário que ele pode perguntar "como fazer" qualquer coisa que você explica o passo a passo.' },
      ]

      try {
        const result = await chatCompletionWithRetry({ messages: history, tools, apiKey })
        if (result.message.content) {
          const aiMsg: ChatMessage = { id: Date.now().toString(), role: 'assistant', content: result.message.content, timestamp: new Date() }
          setMessages([aiMsg])
          setConversation([{ role: 'assistant', content: result.message.content }])
        }
      } catch {
        // Silently fail - user can still type
      }
    }, 600)

    return () => clearTimeout(timeout)
  }, [apiKey])

  function salvarKey() {
    const trimmed = keyInput.trim()
    setApiKey(trimmed)
    localStorage.setItem(API_KEY_STORAGE, trimmed)
  }

  async function enviar() {
    const text = input.trim()
    if (!text || loading || !apiKey) return
    setInput('')

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])

    const systemContent = gerarSistema(data, getLimites, logs, precos, despesas)
    const tools = buildTools(todosItens)

    const history: Message[] = [
      { role: 'system', content: systemContent },
      ...conversation,
      { role: 'user', content: text },
    ]

    setLoading(true)

    try {
      let result = await chatCompletionWithRetry({ messages: history, tools, apiKey })

      while (result.toolCalls.length > 0) {
        history.push(result.message)

        for (const tc of result.toolCalls) {
          const toolResult = executarTool(tc, adicionarQuantidade, definirQuantidade, getLimites, buscarItemPorNome, todosItens, addLog, adicionarItemPersonalizado, editarItemPersonalizado, removerItemPersonalizado, logs, precos, adicionarDespesa, despesas)
          history.push({ role: 'tool', content: toolResult, tool_call_id: tc.id })
        }

        result = await chatCompletionWithRetry({ messages: history, tools, apiKey })
      }

      const aiContent = result.message.content || 'Pronto!'
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: aiContent, timestamp: new Date() }
      setMessages(prev => [...prev, aiMsg])
      setConversation([
        ...conversation,
        { role: 'user', content: text },
        { role: 'assistant', content: aiContent },
      ])
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `❌ Erro ao conectar com a IA: ${errorMsg}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } finally {
      setLoading(false)
    }
  }

  function limparChat() {
    setMessages([])
    setConversation([])
  }

  const sugestoes = [
    'O que está em falta no estoque?',
    'Mostre tudo que preciso comprar',
    'Quais itens estão críticos?',
  ]

  if (!apiKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🤖 Assistente IA</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Converse com a IA para consultar o estoque, registrar movimentações, criar produtos e tirar dúvidas sobre o sistema. Pergunte "como fazer X" que ela explica o passo a passo!</p>
        </div>
        <div className="max-w-lg bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm dark:shadow-black/20">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">🔑 Conecte sua IA</h2>
          <p className="text-xs text-gray-400 mb-4">Para conversar com o assistente, você precisa de uma chave de API da OpenRouter (serviço que dá acesso a vários modelos de IA, como GPT, Claude, etc.).</p>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chave da API OpenRouter
          </label>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            🔒 Sua chave fica salva apenas no seu navegador (não sai daqui).
            Obtenha uma grátis em <a href="https://openrouter.ai/keys" target="_blank" className="text-indigo-500 underline" rel="noreferrer">openrouter.ai/keys</a>
          </p>
          <button onClick={salvarKey} disabled={!keyInput.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            Salvar e Começar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🤖 Assistente IA</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Pergunte sobre o estoque, registre entradas e saídas</p>
        </div>
        <button onClick={limparChat} className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Limpar Chat
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-black/20 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-4xl mb-3">🤖</p>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Pergunte sobre o estoque!</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 max-w-sm">
                Você pode perguntar sobre quantidades, pedir para adicionar mercadoria, criar novos produtos, ou gerar lista de compras.
              </p>
              <p className="text-gray-300 dark:text-gray-600 text-[10px] mt-1">Ex: "O que está faltando?", "Adicione 50L de leite", "Crie Morango na categoria frutas"</p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {sugestoes.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s) }}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm dark:shadow-black/20">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviar())}
              placeholder="Digite sua mensagem..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 dark:disabled:bg-gray-800"
            />
            <button
              onClick={enviar}
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
