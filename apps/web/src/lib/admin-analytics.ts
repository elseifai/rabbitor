import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  startOfYesterday,
  endOfYesterday,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
  isValid,
} from 'date-fns'

export type AnalyticsInterval = 'day' | 'week' | 'month'

export type DateRangePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom'

export type DateRange = {
  from: Date
  to: Date
  preset: DateRangePreset
  interval: AnalyticsInterval
}

export function resolveDateRange(params: {
  from?: string | null
  to?: string | null
  interval?: string | null
}): DateRange {
  const now = new Date()
  const interval: AnalyticsInterval =
    params.interval === 'week' || params.interval === 'month' ? params.interval : 'day'

  if (params.from && params.to) {
    const from = parseISO(params.from)
    const to = parseISO(params.to)
    if (isValid(from) && isValid(to)) {
      return { from: startOfDay(from), to: endOfDay(to), preset: 'custom', interval }
    }
  }

  return {
    from: startOfDay(subDays(now, 6)),
    to: endOfDay(now),
    preset: 'last7',
    interval: 'day',
  }
}

export function presetToRange(preset: DateRangePreset): Omit<DateRange, 'interval'> & { interval?: AnalyticsInterval } {
  const now = new Date()
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now), preset }
    case 'yesterday':
      return { from: startOfYesterday(), to: endOfYesterday(), preset }
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfDay(now), preset }
    case 'last7':
    default:
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now), preset: 'last7' }
  }
}

export function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const days = Math.max(1, differenceInCalendarDays(to, from) + 1)
  const prevTo = endOfDay(subDays(from, 1))
  const prevFrom = startOfDay(subDays(prevTo, days - 1))
  return { from: prevFrom, to: prevTo }
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export function bucketKeys(from: Date, to: Date, interval: AnalyticsInterval): string[] {
  if (interval === 'month') {
    return eachMonthOfInterval({ start: from, end: to }).map((d) => format(d, 'yyyy-MM'))
  }
  if (interval === 'week') {
    return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }).map((d) =>
      format(d, 'yyyy-MM-dd'),
    )
  }
  return eachDayOfInterval({ start: from, end: to }).map((d) => format(d, 'yyyy-MM-dd'))
}

export function bucketLabel(key: string, interval: AnalyticsInterval): string {
  if (interval === 'month') return key
  return key.slice(5)
}

export function orderBucketKey(date: Date, interval: AnalyticsInterval): string {
  if (interval === 'month') return format(date, 'yyyy-MM')
  if (interval === 'week') {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return format(d, 'yyyy-MM-dd')
  }
  return format(date, 'yyyy-MM-dd')
}
