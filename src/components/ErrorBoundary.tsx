import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches an unexpected error anywhere below it and shows a way out instead
 * of a blank page. React only supports this through a class component.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Formulation Explorer crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error === null) return this.props.children

    return (
      <main className="mx-auto max-w-lg p-10">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page hit an unexpected error. Starting again from the default view usually fixes it.
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{this.state.error.message}</p>
        {/* The view lives in the URL, so clearing the query string is a full reset. */}
        <Button className="mt-5" onClick={() => window.location.assign(window.location.pathname)}>
          Reload with the default view
        </Button>
      </main>
    )
  }
}
