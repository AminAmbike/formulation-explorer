import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  /** One line under the title that tells the user what the panel is for. */
  description?: ReactNode
  /** Controls shown at the top right, e.g. a toggle. */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** The white card every view sits in. */
export function Panel({ title, description, actions, className, children }: Props) {
  return (
    <section className={cn('min-w-0 rounded-xl border bg-card p-5', className)}>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  )
}
