import { GestaoItem } from '../types'

interface Props {
  gestao: GestaoItem | undefined
  compacto?: boolean
}

interface Flag {
  key: keyof Omit<GestaoItem, 'receitaId'>
  label: string
  emoji: string
  cor: string
  bg: string
}

const FLAGS: Flag[] = [
  { key: 'permiteEntrada', label: 'Entrada', emoji: '📥', cor: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900' },
  { key: 'permiteSaida', label: 'Saída', emoji: '📤', cor: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900' },
  { key: 'permiteVenda', label: 'Venda', emoji: '💰', cor: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900' },
  { key: 'permiteProducao', label: 'Produção', emoji: '🏭', cor: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900' },
]

export default function GestaoChips({ gestao, compacto = false }: Props) {
  if (!gestao) return null
  const ativas = FLAGS.filter(f => gestao[f.key])
  if (ativas.length === 0) return <span className="text-[10px] text-gray-400 italic">sem operações</span>

  return (
    <div className="flex flex-wrap gap-1">
      {ativas.map(f => (
        <span
          key={f.key}
          title={f.label}
          className={`inline-flex items-center gap-0.5 ${compacto ? 'text-[9px] px-1 py-0' : 'text-[10px] px-1.5 py-0.5'} font-medium rounded-full border ${f.bg} ${f.cor}`}
        >
          <span className={compacto ? 'text-[10px]' : ''}>{f.emoji}</span>
          {!compacto && <span>{f.label}</span>}
        </span>
      ))}
    </div>
  )
}

export const FLAGS_LIST = FLAGS
