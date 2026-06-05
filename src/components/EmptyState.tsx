import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  const sizes = {
    sm: { wrap: 'py-6', icon: 'text-3xl', title: 'text-sm', desc: 'text-xs' },
    md: { wrap: 'py-12', icon: 'text-5xl', title: 'text-base', desc: 'text-sm' },
    lg: { wrap: 'py-20', icon: 'text-7xl', title: 'text-xl', desc: 'text-base' },
  } as const
  const s = sizes[size]

  return (
    <div className={`flex flex-col items-center justify-center text-center ${s.wrap} px-4 gap-2`}>
      <span className={s.icon} aria-hidden="true">
        {icon}
      </span>
      <h3 className={`${s.title} font-semibold text-gray-700 dark:text-gray-200`}>{title}</h3>
      {description && (
        <p className={`${s.desc} text-gray-500 dark:text-gray-400 max-w-md`}>{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
