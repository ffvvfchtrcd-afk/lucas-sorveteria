interface StatusCardProps {
  titulo: string
  valor: string | number
  descricao: string
  cor: string
  children?: React.ReactNode
}

export default function StatusCard({ titulo, valor, descricao, cor, children }: StatusCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-black/20">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{titulo}</h3>
      <p className="text-2xl font-bold" style={{ color: cor }}>{valor}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{descricao}</p>
      {children}
    </div>
  )
}
