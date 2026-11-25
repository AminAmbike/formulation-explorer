import { CommandBar } from '@/components/CommandBar'
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap'
import { ScatterPlot } from '@/components/charts/ScatterPlot'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ExperimentList } from '@/components/ExperimentList'
import { FilterBar } from '@/components/FilterBar'
import { ResetButton } from '@/components/ResetButton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { loadDataset, type Dataset } from '@/data'
import { ExplorerProvider } from '@/state/ExplorerProvider'
import { HoverProvider } from '@/state/HoverProvider'

type LoadResult = { dataset: Dataset } | { error: string }

function tryLoadDataset(): LoadResult {
  try {
    return { dataset: loadDataset() }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** The dataset ships with the app, so it is parsed once when the module loads. */
const result = tryLoadDataset()

export default function App() {
  if ('error' in result) {
    return (
      <main className="mx-auto max-w-lg p-10">
        <h1 className="text-lg font-semibold">The dataset could not be loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
      </main>
    )
  }

  const { dataset } = result

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <ExplorerProvider dataset={dataset}>
          <HoverProvider>
            <div className="mx-auto max-w-[1360px] px-4 pb-16 sm:px-6">
              <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 pt-8 pb-5">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Formulation Explorer</h1>
                  <p className="mt-1 max-w-xl text-sm text-pretty text-muted-foreground">
                    Which ingredients drive which properties? {dataset.experiments.length}{' '}
                    experiments, {dataset.inputs.length} recipe inputs and {dataset.outputs.length}{' '}
                    measured results. Start with step 1.
                  </p>
                </div>
                {/* Wraps below the title, at full width, once there is no room for a usable text box. */}
                <div className="flex min-w-[min(100%,22rem)] flex-1 items-start justify-end gap-2">
                  <CommandBar />
                  <ResetButton />
                </div>
              </header>

              <main className="grid gap-4">
                {/* Filters sit above everything they affect. */}
                <FilterBar />
                <div className="grid gap-4 xl:grid-cols-[minmax(460px,5fr)_minmax(0,7fr)]">
                  <CorrelationHeatmap />
                  <ScatterPlot />
                </div>
                <ExperimentList />
              </main>

              <footer className="mt-6 max-w-3xl text-xs text-pretty text-muted-foreground">
                About the units: the source file does not state any. Ingredients are shown as
                percentages because every recipe adds up to 100. All other units are assumptions
                based on typical ranges for these properties.
              </footer>
            </div>
          </HoverProvider>
        </ExplorerProvider>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
