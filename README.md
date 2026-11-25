# Formulation Explorer

An interactive view of the Uncountable front-end dataset: 25 rubber-formulation
experiments, each with 19 inputs (18 ingredients plus oven temperature) and 5
measured outputs.

![The explorer with a filter on Compression Set](docs/screenshot.jpg)

## Run it

Requires Node 20.19+ or 22.12+ (developed on Node 23.11, npm 10.9).

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript, strict mode
npm run lint       # oxlint
npm run build      # production build into dist/
```

## What it does

The page is one set of linked views. Anything you do in one updates the rest.

- **Correlation heatmap.** How strongly each input goes with each output. It is
  the map of the dataset: click a cell to open that pair in the scatterplot.
  Cells too weak to trust at the current sample size are faded.
- **Scatterplot.** Any variable against any other, with a trend line and an
  optional third variable as colour. Hover a point for its values, click to
  select it, drag to select several.
- **Measurement filters.** A range slider and histogram for each output.
  Narrowing one shows, in blue, where the remaining experiments fall on all
  the others.
- **What sets these experiments apart?** For the filtered or selected
  experiments, the inputs whose average differs most from the whole dataset.
  This answers "which inputs produced results in this range?".
- **Experiment table.** Every experiment with its outputs and shaded recipe.
  Sortable by any column; hover and selection are shared with the scatterplot.
- **Command bar** (`⌘K`). Type a request instead of clicking:
  `plot elongation vs polymer 4`, `compression set < 55`,
  `with plasticizer 2`, `colour by oven temperature`, `sort by viscosity`,
  `clear filters`. Clauses can be joined with `and`. It shows what it
  understood before applying anything, and offers choices when a name such as
  `polymer` is ambiguous.

The current view is stored in the URL, so a reload keeps it and a link shares it.

## How it is built

React 19, TypeScript and Vite. Tailwind and a few shadcn/ui components provide
the controls. The charts are hand-written SVG and HTML; `d3-scale` is used only
to map values to pixels and colours.

```
src/
  data/        Parse and validate the JSON into a typed model
  lib/         Statistics, formatting, colour helpers
  lib/query/   The command bar's parser
  state/       View state, reducer, derived data, URL sync
  hooks/       Element size, drag-to-select
  components/  The views; charts/ holds the SVG ones; ui/ is shadcn/ui
```

Data flows one way:

1. `parseDataset` turns the raw JSON into experiments and variables. Variables
   and their families are derived from the data, so another dataset with the
   same shape loads without code changes.
2. A single `ViewState` object holds everything the user can change: axes,
   colour, filters, selection, sort and correlation method. It changes only
   through a reducer.
3. Pure functions in `state/selectors.ts` derive what each view shows.
4. Views read the state and dispatch actions. None of them talks to another
   view directly.

### Decisions worth knowing about

- **One state object, many ways to change it.** The sliders, the heatmap, the
  table and the command bar all dispatch the same actions. That is why the
  command bar needed no changes to any view, and why saving the view to the
  URL was a pair of small functions.
- **The command bar uses a parser, not a language model.** The vocabulary is
  small and closed (24 variable names and a handful of verbs), so a few
  patterns cover it. The result is instant, predictable, works offline and is
  unit tested. A model could later be added behind the same `parseQuery`
  interface for free-form questions.
- **Honest statistics for a small sample.** With 25 experiments a correlation
  below about 0.4 could easily be chance, so those cells are faded, and the
  threshold rises as filters shrink the sample. Pearson and Spearman are both
  offered because most ingredients are zero in most experiments, which makes
  Pearson sensitive to a few extreme recipes.
- **Axes stay fixed while you filter.** The scatterplot always spans the whole
  dataset and keeps filtered-out experiments as faint grey dots, so you can
  see where the remaining ones sit instead of watching the axes jump.
- **Hover is separate from the main state.** It changes on every pointer move,
  so it has its own context and the table rows are memoised. Moving the mouse
  re-renders the scatterplot and the two rows whose highlight changed, not the
  whole page.
- **Edge cases are handled where the data enters.** Missing or non-numeric
  values become `null` and every calculation skips them; a correlation over a
  constant column or fewer than three points is `null`, never `NaN`; a
  malformed file shows an error screen; a stale or hand-edited URL falls back
  to defaults.
- **Accessibility.** The heatmap is one Tab stop navigated with arrow keys,
  the table's checkboxes give a keyboard route to selecting experiments, and
  every coloured cell also shows its number.

## What I would do next

- Component tests for the interactions (the logic is covered; the wiring is
  verified by hand).
- A side-by-side comparison of two or three selected experiments.
- Dark theme. The colours already live in one file (`lib/palette.ts`).
- Free-form questions in the command bar through a language model, falling
  back to it only when the parser cannot read the request.
