import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExplorer } from '@/state/explorerContext'

/** Radix Select cannot use an empty string as a value, so "nothing chosen" needs a stand-in. */
const NONE = '__none__'

interface Props {
  /** Read by screen readers; the visible label sits next to the control. */
  label: string
  value: string | null
  onChange: (key: string | null) => void
  /** Text for the "nothing chosen" option. Leave out to require a choice. */
  noneLabel?: string
}

/** A dropdown of every variable, outputs first. */
export function VariableSelect({ label, value, onChange, noneLabel }: Props) {
  const { dataset } = useExplorer()

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) => onChange(next === NONE ? null : next)}
    >
      <SelectTrigger size="sm" aria-label={label} className="max-w-56 bg-card font-medium">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {noneLabel !== undefined && (
          <>
            <SelectItem value={NONE}>{noneLabel}</SelectItem>
            <SelectSeparator />
          </>
        )}
        <SelectGroup>
          <SelectLabel>Measured outputs</SelectLabel>
          {dataset.outputs.map((variable) => (
            <SelectItem key={variable.key} value={variable.key}>
              {variable.key}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Inputs</SelectLabel>
          {dataset.inputs.map((variable) => (
            <SelectItem key={variable.key} value={variable.key}>
              {variable.key}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
