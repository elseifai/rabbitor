'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar, type DayPickerRange } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { presetToRange, type DateRangePreset } from '@/lib/admin-analytics'
import { cn } from '@/lib/utils'

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'thisMonth', label: 'This Month' },
]

export function AdminDateRangePicker({
  from,
  to,
  preset,
  onChange,
}: {
  from: Date
  to: Date
  preset: DateRangePreset
  onChange: (next: { from: Date; to: Date; preset: DateRangePreset }) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DayPickerRange | undefined>({ from, to })

  const label =
    preset === 'custom'
      ? `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`
      : PRESETS.find((p) => p.id === preset)?.label ?? 'Custom Range'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 border-slate-200/90 bg-white px-4 font-semibold shadow-sm"
        >
          <CalendarIcon className="h-4 w-4 text-orange-500" />
          <span>{label}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex border-b border-slate-100 p-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                const r = presetToRange(p.id)
                onChange({ from: r.from, to: r.to, preset: p.id })
                setDraft({ from: r.from, to: r.to })
                setOpen(false)
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                preset === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="p-2">
          <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Custom range
          </p>
          <Calendar
            mode="range"
            selected={draft}
            onSelect={(r) => {
              setDraft(r)
              if (r?.from && r?.to) {
                onChange({ from: r.from, to: r.to, preset: 'custom' })
              }
            }}
            numberOfMonths={1}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
