import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  /** Position in the page's 1-2-3 reading order, shown as a numbered badge. */
  step?: number
  title: string
  /** One or two sentences that tell a first-time user what the panel is for. */
  description?: ReactNode
  /** Controls shown at the top right, e.g. a toggle. */
  actions?: ReactNode
  /** Lets a link elsewhere on the page scroll to this panel. */
  id?: string
  className?: string
  children: ReactNode
}

/** The white card every view sits in. */
export function Panel({ step, title, description, actions, id, className, children }: Props) {
  return (
    <section
      id={id}
      // min-w-0 lets a panel shrink inside a grid instead of being held open by its content.
      className={cn(
        'flex min-w-0 scroll-mt-4 flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6',
        className,
      )}
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          {step !== undefined && (
            <span
              aria-hidden
              className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white"
            >
              {step}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base leading-6 font-semibold tracking-tight">{title}</h2>
            {description && (
              <p className="mt-1 max-w-prose text-sm text-pretty text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  )
}
