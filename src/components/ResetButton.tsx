import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExplorer } from '@/state/explorerContext'
import { encodeViewState } from '@/state/urlSync'

/** Puts every control back to how the page first loaded. */
export function ResetButton() {
  const { state, dispatch, initialState } = useExplorer()
  // The URL encoding is empty exactly when nothing differs from the starting view.
  const isUnchanged = encodeViewState(state, initialState) === ''

  return (
    <Button
      variant="outline"
      disabled={isUnchanged}
      onClick={() => dispatch({ type: 'replace', state: initialState })}
    >
      <RotateCcw aria-hidden />
      Reset view
    </Button>
  )
}
