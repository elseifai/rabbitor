'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  TrendingUp,
  Eye,
  MapPin,
  Shield,
} from 'lucide-react'
import { getMerchantShopAction } from '@/actions/merchant'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'

type PlanId = 'WEEKLY' | 'MONTHLY' | 'YEARLY'
type PlanVariant = 'silver' | 'popular' | 'gold'

type AdPlan = {
  id: PlanId
  name: string
  subtitle: string
  amount: number
  tierLevel: number
  variant: PlanVariant
  searchRank: string
  impressions: string
  ctrEstimate: string
  chartData: { day: string; impressions: number; clicks: number }[]
  perks: string[]
}

const PLANS: AdPlan[] = [
  {
    id: 'WEEKLY',
    name: 'Weekly Sprint',
    subtitle: 'New Launch Testing',
    amount: 999,
    tierLevel: 1,
    variant: 'silver',
    searchRank: 'Guaranteed Top 15 ranking within 5 km delivery zone',
    impressions: '12,000 – 18,000 estimated impressions / week',
    ctrEstimate: '1.8% – 2.4% projected CTR',
    chartData: [
      { day: 'Mon', impressions: 1200, clicks: 22 },
      { day: 'Tue', impressions: 1800, clicks: 34 },
      { day: 'Wed', impressions: 2100, clicks: 41 },
      { day: 'Thu', impressions: 1900, clicks: 36 },
      { day: 'Fri', impressions: 2400, clicks: 48 },
      { day: 'Sat', impressions: 2800, clicks: 56 },
      { day: 'Sun', impressions: 2200, clicks: 44 },
    ],
    perks: [
      '+50 search weight boost while active',
      'HOME_STRIP + SHOP_PAGE placement priority',
      'Real-time impression & click telemetry',
    ],
  },
  {
    id: 'MONTHLY',
    name: 'Monthly Growth',
    subtitle: 'Scale with confidence',
    amount: 3499,
    tierLevel: 2,
    variant: 'popular',
    searchRank: 'Guaranteed Top 8 ranking across your delivery radius',
    impressions: '55,000 – 72,000 estimated impressions / month',
    ctrEstimate: '2.2% – 3.1% projected CTR',
    chartData: [
      { day: 'W1', impressions: 12000, clicks: 280 },
      { day: 'W2', impressions: 14500, clicks: 340 },
      { day: 'W3', impressions: 16800, clicks: 410 },
      { day: 'W4', impressions: 19200, clicks: 480 },
    ],
    perks: [
      '+50 search boost + featured strip rotation',
      'Hyperlocal geofence targeting included',
      'Priority support & campaign health alerts',
    ],
  },
  {
    id: 'YEARLY',
    name: 'Yearly Dominance',
    subtitle: 'Marquee market leadership',
    amount: 29999,
    tierLevel: 3,
    variant: 'gold',
    searchRank: 'Guaranteed Top 3 marquee placement city-wide',
    impressions: '680,000 – 900,000 estimated impressions / year',
    ctrEstimate: '2.8% – 4.2% projected CTR',
    chartData: [
      { day: 'Q1', impressions: 180000, clicks: 5200 },
      { day: 'Q2', impressions: 210000, clicks: 6400 },
      { day: 'Q3', impressions: 225000, clicks: 7100 },
      { day: 'Q4', impressions: 240000, clicks: 7800 },
    ],
    perks: [
      'Maximum +50 search weight + premium banner slots',
      'Dedicated account strategist review (quarterly)',
      'Year-round impression delivery SLA monitoring',
    ],
  },
]

const SWIPE_THRESHOLD = 60

function CampaignTermsAccordion({ variant }: { variant: PlanVariant }) {
  const textClass =
    variant === 'gold'
      ? 'text-amber-100/70'
      : variant === 'popular'
        ? 'text-slate-600'
        : 'text-slate-500'

  return (
    <Accordion type="single" collapsible className="mt-4 rounded-xl bg-black/[0.03] px-3">
      <AccordionItem value="terms" className="border-none">
        <AccordionTrigger className={cn('text-[10px]', textClass)}>
          View Campaign Terms & Disclosures
        </AccordionTrigger>
        <AccordionContent className={textClass}>
          <ul className="space-y-2.5">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              <span>
                <strong className="font-bold">Geofenced targeting:</strong> Campaign delivery is
                matched to customers within your store&apos;s configured delivery radius and
                eligible hyperlocal zones only.
              </span>
            </li>
            <li className="flex gap-2">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              <span>
                <strong className="font-bold">Kill Switch auto-pause:</strong> When your store
                status is set to Closed via the merchant kill switch, ad visibility and search
                boost are automatically paused and restored on reopen.
              </span>
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              <span>
                <strong className="font-bold">Non-refundable allocation:</strong> Ad budget is
                allocated at activation and is non-refundable once the campaign window begins.
                Unused impressions do not roll over unless explicitly approved by platform ops.
              </span>
            </li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function PerformancePreview({
  data,
  variant,
}: {
  data: AdPlan['chartData']
  variant: PlanVariant
}) {
  const stroke =
    variant === 'gold' ? '#fbbf24' : variant === 'popular' ? '#f97316' : '#94a3b8'
  const fill =
    variant === 'gold'
      ? 'url(#goldGrad)'
      : variant === 'popular'
        ? 'url(#orangeGrad)'
        : 'url(#silverGrad)'

  return (
    <div className="mt-4 rounded-xl bg-black/[0.02] p-3 ring-1 ring-black/5">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
        <TrendingUp className="h-3 w-3" />
        Performance simulation preview
      </p>
      <div className="h-[88px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="silverGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ fontSize: 10, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Area type="monotone" dataKey="impressions" stroke={stroke} fill={fill} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PlanCardSkin({
  plan,
  isActive,
  onSelect,
  merchantReady,
}: {
  plan: AdPlan
  isActive: boolean
  onSelect: () => void
  merchantReady: boolean
}) {
  const isSilver = plan.variant === 'silver'
  const isPopular = plan.variant === 'popular'
  const isGold = plan.variant === 'gold'

  return (
    <Card
      className={cn(
        'relative h-full overflow-hidden transition-shadow duration-300',
        isActive && 'ring-2 ring-offset-2',
        isSilver && isActive && 'border-slate-300 ring-slate-400 shadow-[0_20px_60px_rgba(148,163,184,0.25)]',
        isPopular &&
          isActive &&
          'border-orange-300 ring-orange-400 shadow-[0_20px_60px_rgba(249,115,22,0.3)]',
        isGold &&
          isActive &&
          'border-amber-500/60 ring-amber-400 shadow-[0_24px_70px_rgba(251,191,36,0.35)]',
        isPopular && 'animate-shimmer bg-gradient-to-br from-white via-orange-50/30 to-white bg-[length:200%_100%]',
        isGold && 'border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white',
        isSilver && 'border-slate-200 bg-gradient-to-b from-white to-slate-50/80',
      )}
    >
      {isPopular && (
        <span className="absolute -right-8 top-5 z-10 rotate-45 bg-gradient-to-r from-orange-500 to-red-500 px-10 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-lg">
          🔥 MOST POPULAR
        </span>
      )}

      <CardHeader className={cn(isGold && 'text-white')}>
        <p
          className={cn(
            'text-[10px] font-black uppercase tracking-[0.2em]',
            isGold ? 'text-amber-400' : isPopular ? 'text-orange-500' : 'text-slate-400',
          )}
        >
          {plan.subtitle}
        </p>
        <CardTitle className={cn('text-2xl', isGold && 'text-white')}>{plan.name}</CardTitle>
        <CardDescription className={cn(isGold && 'text-amber-100/60')}>
          <span className="text-3xl font-black tracking-tight text-inherit antialiased">
            {formatCurrency(plan.amount)}
          </span>
          <span className="ml-1 text-xs font-semibold opacity-60">
            / {plan.id === 'WEEKLY' ? 'week' : plan.id === 'MONTHLY' ? 'month' : 'year'}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ul className="space-y-2.5">
          <li className="flex gap-2 text-xs font-semibold tracking-tight antialiased">
            <TrendingUp
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                isGold ? 'text-amber-400' : isPopular ? 'text-orange-500' : 'text-slate-400',
              )}
            />
            <span className={cn(isGold ? 'text-amber-50/90' : 'text-slate-700')}>{plan.searchRank}</span>
          </li>
          <li className="flex gap-2 text-xs font-semibold tracking-tight antialiased">
            <Eye
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                isGold ? 'text-amber-400' : isPopular ? 'text-orange-500' : 'text-slate-400',
              )}
            />
            <span className={cn(isGold ? 'text-amber-50/90' : 'text-slate-700')}>{plan.impressions}</span>
          </li>
          <li
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-[10px] font-bold',
              isGold ? 'bg-amber-500/10 text-amber-200' : 'bg-slate-100 text-slate-600',
            )}
          >
            {plan.ctrEstimate}
          </li>
        </ul>

        <ul className="mt-3 space-y-1.5">
          {plan.perks.map((perk) => (
            <li
              key={perk}
              className={cn(
                'flex items-start gap-1.5 text-[11px] font-medium tracking-tight',
                isGold ? 'text-amber-100/75' : 'text-slate-500',
              )}
            >
              <span className={cn('mt-1 h-1 w-1 shrink-0 rounded-full', isGold ? 'bg-amber-400' : 'bg-orange-400')} />
              {perk}
            </li>
          ))}
        </ul>

        <PerformancePreview data={plan.chartData} variant={plan.variant} />
        <CampaignTermsAccordion variant={plan.variant} />
      </CardContent>

      <CardFooter className="pb-6">
        <button
          type="button"
          disabled={!merchantReady}
          onClick={onSelect}
          className={cn(
            'w-full rounded-2xl py-3.5 text-sm font-black uppercase tracking-wider shadow-lg transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100',
            isGold &&
              'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-amber-500/30',
            isPopular &&
              'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/30',
            isSilver && 'bg-slate-900 text-white shadow-slate-900/20',
          )}
        >
          Select & Activate Plan
        </button>
      </CardFooter>
    </Card>
  )
}

export function AdPlansDeck() {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(1)
  const [shopId, setShopId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const dragX = useMotionValue(0)
  const dragOpacity = useTransform(dragX, [-120, 0, 120], [0.85, 1, 0.85])

  useEffect(() => {
    void getMerchantShopAction().then((shop) => {
      if (shop) setShopId(shop.id)
      setLoading(false)
    })
  }, [])

  const goTo = useCallback((index: number) => {
    setActiveIndex(Math.max(0, Math.min(PLANS.length - 1, index)))
  }, [])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) goTo(activeIndex + 1)
    else if (info.offset.x > SWIPE_THRESHOLD) goTo(activeIndex - 1)
    dragX.set(0)
  }

  const handleSelectPlan = (plan: AdPlan) => {
    if (!shopId) return
    const params = new URLSearchParams({
      plan: plan.id,
      amount: String(plan.amount),
      shopId,
      tier: String(plan.tierLevel),
    })
    router.push(`/merchant/ads/checkout?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
            Promotional subscriptions
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-white antialiased">
            Boost your storefront visibility
          </h2>
          <p className="mt-1 max-w-lg text-sm font-medium text-slate-400">
            Swipe or use arrows to compare plans. Active subscriptions apply a +50 search weight
            boost across customer discovery feeds.
          </p>
        </div>
      </div>

      <div className="relative mx-auto max-w-lg">
        <div className="flex items-center justify-between px-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous plan"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="rounded-full border-slate-200 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            {PLANS.map((_, i) => (
              <button
                key={PLANS[i].id}
                type="button"
                aria-label={`Go to plan ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === activeIndex ? 'w-6 bg-[#FF6B35]' : 'w-2 bg-slate-300 hover:bg-slate-400',
                )}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next plan"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === PLANS.length - 1}
            className="rounded-full border-slate-200 shadow-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative mt-6 h-[620px] overflow-visible sm:h-[580px]">
          {PLANS.map((plan, index) => {
            const offset = index - activeIndex
            const isActive = offset === 0
            const isAdjacent = Math.abs(offset) === 1

            if (Math.abs(offset) > 1) return null

            return (
              <motion.div
                key={plan.id}
                drag={isActive ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={handleDragEnd}
                style={{ x: isActive ? dragX : 0, opacity: isActive ? dragOpacity : undefined }}
                animate={{
                  x: offset * (isAdjacent ? 72 : 0),
                  scale: isActive ? 1 : 0.92,
                  opacity: isActive ? 1 : 0.95,
                  filter: isActive ? 'blur(0px)' : 'blur(1.5px)',
                  zIndex: isActive ? 20 : 10 - Math.abs(offset),
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className={cn(
                  'absolute inset-x-4 top-0 cursor-grab active:cursor-grabbing',
                  !isActive && 'pointer-events-none',
                )}
              >
                <PlanCardSkin
                  plan={plan}
                  isActive={isActive}
                  merchantReady={!!shopId}
                  onSelect={() => handleSelectPlan(plan)}
                />
              </motion.div>
            )
          })}
        </div>

        {!shopId && (
          <p className="mt-4 text-center text-sm font-semibold text-amber-600">
            Complete store onboarding before activating a plan.
          </p>
        )}
      </div>
    </section>
  )
}
