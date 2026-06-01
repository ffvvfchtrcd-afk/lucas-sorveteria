import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStock } from '../context/StockContext'
import { useLog } from '../context/LogContext'
import { usePreco } from '../context/PrecoContext'
import { useValidade } from '../context/ValidadeContext'
import { chatCompletionWithRetry, Message, ToolCall, ToolDefinition } from '../services/openrouter'
import { ItemEstoque, LimitesItem, EstoqueData, CustomItemInput, UnidadeMedida, UNIDADES } from '../types'

const API_KEY_STORAGE = 'openrouter_key';

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function gerarSistema(data: EstoqueData, getLimites: (id: string, d: { minimo: number }) => LimitesItem): string {
  const todos = [...data.acai, ...data.sorvetes, ...data.materias_primas]
  const agora = new Date().toISOString().slice(0, 10)

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

  return `Você é um assistente especializado em gestão de estoque de uma sorveteria/açaíteria.

Data de hoje: ${agora}

## INVENTÁRIO ATUAL:
${inventario}

## RESUMO RÁPIDO
- ${criticos.length} itens em estado CRÍTICO 🔴
- ${baixos.length} itens com estoque BAIXO 🟡
- ${todos.length - criticos.length - baixos.length} itens OK 🟢

## SEJA PROATIVO
- Se o usuário abrir o chat sem mensagem, faça uma saudação e já sugira ações com base no estado do estoque
- Ex: "Olá! Hoje temos X itens críticos e Y itens baixos. Quer que eu monte uma lista de compras?"
- Se notar itens críticos, já sugira providências
- Se o usuário perguntar de forma vaga, faça perguntas direcionadas

## COMANDOS DISPONÍVEIS
Você TEM acesso a funções para consultar e MODIFICAR o estoque real. Use-as quando o usuário:

1. **Perguntar sobre estoque** → use listar_estoque ou buscar_item
2. **Reportar entrada de mercadoria** → use adicionar_estoque (EX: "chegou 50L de leite")
3. **Reportar uso/venda/perda** → use definir_estoque para definir valor exato
4. **Quiser resumo do que falta** → use listar_criticos e listar_baixos
5. **CRIAR novo produto** → use criar_item! Você PODE criar produtos com qualquer nome e qualquer categoria (inclusive categorias novas)
   - Ex: "crie Morango Unidade na categoria frutas" → use criar_item com nome="Morango Unidade", categoria="frutas", tipo="venda", unidade="un"
6. **EDITAR produto** → use editar_item quando o usuário quiser alterar nome, categoria, tipo ou unidade de um item
7. **REMOVER produto** → use remover_item quando o usuário pedir para excluir um produto (SEMPRE confirme antes)

## REGRAS DE FORMATAÇÃO (IMPORTANTE):
- Use **Markdown** para formatar suas respostas de forma organizada e visual
- SEMPRE use títulos, listas, tabelas e emojis para estruturar resumos
- Exemplo de formato (use isso como modelo):
  ## Título com emoji
  ### Categoria
  | Coluna1 | Coluna2 | Coluna3 |
  |---------|---------|---------|
  | valor1 | valor2 | valor3 |
- Emojis de status: 🟢 OK | 🟡 Baixo | 🔴 Crítico
- Depois de alterar o estoque, confirme com: + Adicionado X de Y
- Use --- como separador entre seções
- Para listas de compras, use bullet points com quantidades
- Seja organizado: informações importantes primeiro, depois detalhes

## REGRAS GERAIS:
- SEMPRE confirme em português o que você fez APÓS executar a ação
- Se o usuário falar o nome de um item mas não o ID, use buscar_item primeiro
- Se o usuário não especificar a quantidade, PERGUNTE antes
- **IMPORTANTE: Seja AUTÔNOMO e AJA IMEDIATAMENTE.**
  - Ex: usuário diz "add 50L de leite"
    - Use buscar_item para achar itens com "leite" no nome
    - Se achar UM item → execute adicionar_estoque na hora, SEM perguntar confirmação
    - Se achar MÚLTIPLOS itens (ex: "Leite Integral 1L" e "Leite em Pó") → mostre as opções numeradas e peça o usuário escolher, DEPOIS execute
  - Ex: "leite está baixo" → use listar_baixos ou listar_criticos, DEPOIS pergunte se quer adicionar
  - NUNCA peça confirmação tipo "Confirma essa ação?" — se o usuário pediu, execute direto
  - Só pergunte quando houver ambiguidade REAL (múltiplos itens, ou não ficou claro se é adicionar/remover)
- Seja educado e objetivo
- Responda em português brasileiro
- NUNCA invente dados - use apenas as funções`
}

function buildTools(todos: ItemEstoque[]): ToolDefinition[] {
  const itensStr = todos.map(i => `${i.id}: ${i.nome} (${i.unidade})`).join('\n')

  return [
    {
      type: 'function',
      function: {
        name: 'listar_estoque',
        description: 'Retorna a lista completa do estoque com quantidades atuais, mínimos, críticos e status de cada item',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'listar_criticos',
        description: 'Lista apenas itens em estado CRÍTICO (precisam ser repostos urgentemente)',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'listar_baixos',
        description: 'Lista apenas itens com estoque BAIXO (precisam de reposição em breve)',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'buscar_item',
        description: 'Busca um item pelo nome. Use quando o usuário mencionar um item sem saber o ID.',
        parameters: {
          type: 'object',
          properties: {
            termo: { type: 'string', description: 'Nome ou parte do nome do item' },
          },
          required: ['termo'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'adicionar_estoque',
        description: 'ADICIONA quantidade a um item (quando chega mercadoria nova). Use item_id encontrado via buscar_item ou direto.',
        parameters: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: `ID do item. IDs disponíveis:\n${itensStr}` },
            quantidade: { type: 'number', description: 'Quantidade a ADICIONAR ao estoque atual (soma, não substitui)' },
          },
          required: ['item_id', 'quantidade'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'definir_estoque',
        description: 'DEFINE a quantidade exata de um item (quando houve uso, venda, perda, ou ajuste). Substitui o valor atual.',
        parameters: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: `ID do item. IDs disponíveis:\n${itensStr}` },
            quantidade: { type: 'number', description: 'Nova quantidade EXATA (não é soma, é substituição)' },
          },
          required: ['item_id', 'quantidade'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'criar_item',
        description: 'CRIA um novo produto no estoque com nome, categoria, unidade, tipo, quantidade inicial e mínima. Use quando o usuário pedir para cadastrar um novo produto ou uma nova categoria.',
        parameters: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome do novo produto' },
            categoria: { type: 'string', description: 'Categoria do produto (ex: acai, sorvetes, materias_primas, frutas, etc). Pode ser uma categoria NOVA que não existe ainda.' },
            tipo: { type: 'string', enum: ['venda', 'producao', 'ambos'], description: "'venda' para aparecer no PDV, 'producao' para insumo, 'ambos' para ambos" },
            unidade: { type: 'string', enum: ['L', 'mL', 'g', 'kg', 'un', 'cx', 'pct', 'fardo'], description: 'Unidade de medida' },
            quantidade_inicial: { type: 'number', description: 'Quantidade inicial em estoque' },
            quantidade_minima: { type: 'number', description: 'Quantidade mínima (gatilho de alerta)' },
          },
          required: ['nome', 'categoria', 'unidade', 'quantidade_inicial', 'quantidade_minima'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'editar_item',
        description: 'EDITA um item existente (nome, categoria, tipo, unidade, quantidade mínima). Use quando o usuário quiser alterar dados de um produto.',
        parameters: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'ID do item a editar' },
            nome: { type: 'string', description: 'Novo nome (opcional)' },
            categoria: { type: 'string', description: 'Nova categoria (opcional)' },
            tipo: { type: 'string', enum: ['venda', 'producao', 'ambos'], description: "Novo tipo (opcional): 'venda', 'producao', 'ambos'" },
            unidade: { type: 'string', enum: ['L', 'mL', 'g', 'kg', 'un', 'cx', 'pct', 'fardo'], description: 'Nova unidade (opcional)' },
            quantidade_minima: { type: 'number', description: 'Nova quantidade mínima (opcional)' },
          },
          required: ['item_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'remover_item',
        description: 'REMOVE um produto do estoque permanentemente. Use quando o usuário pedir para excluir um item. SEMPRE confirme com o usuário antes de remover.',
        parameters: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'ID do item a remover' },
          },
          required: ['item_id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'resumo_para_compras',
        description: 'Gera um resumo organizado de tudo que precisa ser comprado, separado por categoria',
        parameters: { type: 'object', properties: {} },
      },
    },
  ]
}

function executarTool(
  toolCall: ToolCall,
  adicionarQuantidade: (id: string, qtd: number) => void,
  definirQuantidade: (id: string, qtd: number) => void,
  getLimites: (id: string, d: { minimo: number }) => LimitesItem,
  buscarItemPorNome: (nome: string) => ItemEstoque | null,
  todosItens: ItemEstoque[],
  addLog?: (tipo: string, itemId: string, itemNome: string, quantidade: number, origem?: string) => void,
  adicionarItemPersonalizado?: (item: CustomItemInput) => void,
  editarItemPersonalizado?: (itemId: string, updates: Partial<CustomItemInput>) => void,
  removerItemPersonalizado?: (itemId: string) => void,
): string {
  const args = JSON.parse(toolCall.function.arguments)

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
  const { addLog } = useLog()
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
      const systemContent = gerarSistema(data, getLimites)
      const tools = buildTools(todosItens)
      const history: Message[] = [
        { role: 'system', content: systemContent + '\n\nFaça uma saudação proativa! Analise o estoque e sugira ações com base no estado atual. Seja educado e direto.' },
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

    const systemContent = gerarSistema(data, getLimites)
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
          const toolResult = executarTool(tc, adicionarQuantidade, definirQuantidade, getLimites, buscarItemPorNome, todosItens, addLog, adicionarItemPersonalizado, editarItemPersonalizado, removerItemPersonalizado)
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
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Configure sua chave da OpenRouter para começar</p>
        </div>
        <div className="max-w-lg bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm dark:shadow-black/20">
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
            Sua chave fica salva apenas no seu navegador (localStorage).
            Obtenha em <a href="https://openrouter.ai/keys" target="_blank" className="text-indigo-500 underline" rel="noreferrer">openrouter.ai/keys</a>
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
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-4xl mb-3">🤖</p>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Pergunte sobre o estoque!</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Ex: "O que está faltando?", "Adicione 50L de leite"</p>
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
