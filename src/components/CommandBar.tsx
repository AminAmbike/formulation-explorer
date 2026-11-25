import { Command } from 'cmdk'
import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EXAMPLE_QUERIES, parseQuery } from '@/lib/query/parseQuery'
import { useExplorer } from '@/state/explorerContext'

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-selected:bg-muted'

/**
 * A text box that drives the page: "plot viscosity vs carbon high",
 * "compression set < 55", "with plasticizer 2".
 *
 * It shows what it understood before anything changes, and Enter applies it.
 * The request becomes the same Actions the buttons and sliders dispatch, so
 * there is no second code path to keep in step.
 */
export function CommandBar() {
  const { dataset, dispatch } = useExplorer()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [lastApplied, setLastApplied] = useState('')

  const hasQuery = query.trim() !== ''
  const result = useMemo(
    () => (hasQuery ? parseQuery(query, dataset) : null),
    [hasQuery, query, dataset],
  )

  // Cmd/Ctrl+K from anywhere on the page jumps to the box.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /** Runs a request if it parses; otherwise leaves it in the box to be corrected. */
  const run = (text: string) => {
    const parsed = parseQuery(text, dataset)
    if (!parsed.ok) {
      setQuery(text)
      return
    }
    parsed.actions.forEach(dispatch)
    setLastApplied(parsed.summary)
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <Command
      // The list below is built from the parser's result, so cmdk's own text filtering is off.
      shouldFilter={false}
      label="Type a request"
      className="relative w-full max-w-xl"
      onKeyDown={(event) => event.key === 'Escape' && inputRef.current?.blur()}
    >
      <div className="flex h-9 items-center gap-2 rounded-lg border bg-card px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <Command.Input
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          placeholder="Ask for a view, e.g. plot viscosity vs carbon high"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded border bg-muted px-1.5 font-sans text-[11px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Says what the last request did, for sighted users and screen readers alike. */}
      <p role="status" className="mt-1 h-4 truncate text-xs text-muted-foreground">
        {lastApplied && `Applied: ${lastApplied}`}
      </p>

      {isOpen && (
        <Command.List
          // Keeps focus in the input while an item is clicked; otherwise the list would close first.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-10 z-20 rounded-lg border bg-popover p-1 shadow-lg"
        >
          {result?.ok && (
            <Command.Item value="apply" onSelect={() => run(query)} className={ITEM_CLASS}>
              <CornerDownLeft aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              {result.summary}
            </Command.Item>
          )}

          {result && !result.ok && (
            <>
              <p className="px-2 py-1.5 text-sm text-muted-foreground">{result.message}</p>
              {result.suggestions.map((suggestion) => (
                // Picking a suggestion fills the box; nothing is applied until Enter.
                <Command.Item
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => setQuery(suggestion)}
                  className={ITEM_CLASS}
                >
                  {suggestion}
                </Command.Item>
              ))}
            </>
          )}

          {!result && (
            <Command.Group
              heading="Try one of these"
              className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:text-muted-foreground"
            >
              {EXAMPLE_QUERIES.map((example) => (
                <Command.Item
                  key={example}
                  value={example}
                  onSelect={() => run(example)}
                  className={ITEM_CLASS}
                >
                  {example}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      )}
    </Command>
  )
}
