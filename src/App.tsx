import { CommandBar } from '@/components/CommandBar'
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap'
import { ScatterPlot } from '@/components/charts/ScatterPlot'
import { ExperimentTable } from '@/components/ExperimentTable'
import { OutputFilters } from '@/components/OutputFilters'
import { SubsetProfile } from '@/components/SubsetProfile'
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
    <TooltipProvider delayDuration={150}>
      <ExplorerProvider dataset={dataset}>
        <HoverProvider>
          <div className="mx-auto max-w-[1440px] px-6 pb-16">
            <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 pt-6 pb-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Formulation Explorer</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {dataset.experiments.length} experiments · {dataset.inputs.length} inputs ·{' '}
                  {dataset.outputs.length} measured outputs
                </p>
              </div>
              <CommandBar />
            </header>

            <main className="grid gap-4">
              {/* Filters sit above everything they affect. */}
              <OutputFilters />
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(460px,5fr)_minmax(0,7fr)]">
                <CorrelationHeatmap />
                <div className="grid gap-4">
                  <ScatterPlot />
                  <SubsetProfile />
                </div>
              </div>
              <ExperimentTable />
            </main>
          </div>
        </HoverProvider>
      </ExplorerProvider>
    </TooltipProvider>
  )
}
