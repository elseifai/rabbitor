'use client'

import * as React from 'react'
import { DayPicker, type DateRange as DayPickerRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn('rounded-xl p-3', className)}
      {...props}
    />
  )
}

export type { DayPickerRange }
