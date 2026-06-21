'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Rabbit } from 'lucide-react'
import { cn } from '@/lib/utils'

type AdRecord = {
  id: string
  title: string
  imageUrl: string
  linkUrl: string | null
}

export function BottomNavBrandAd({ className }: { className?: string }) {
  const router = useRouter()
  const [ad, setAd] = useState<AdRecord | null>(null)

  useEffect(() => {
    fetch('/api/ads?placement=HOME_STRIP')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.[0]) setAd(json.data[0] as AdRecord)
      })
      .catch(() => {})
  }, [])

  if (ad) {
    const handleClick = () => {
      void fetch(`/api/ads/${ad.id}/click`, { method: 'POST' })
      if (ad.linkUrl) {
        if (ad.linkUrl.startsWith('http')) {
          window.open(ad.linkUrl, '_blank', 'noopener')
        } else {
          router.push(ad.linkUrl)
        }
      }
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn('h-10 min-w-0 flex-1 overflow-hidden rounded-xl', className)}
        aria-label={ad.title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-cover" />
      </button>
    )
  }

  return (
    <Link
      href="/"
      className={cn(
        'flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FFF5F2] to-[#FFEAE2] px-3',
        className,
      )}
      aria-label="Rabbitor home"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF6B35] text-white">
        <Rabbit className="h-3.5 w-3.5" />
      </span>
      <span className="truncate text-[11px] font-black uppercase tracking-widest text-[#FF6B35]">
        rabbitor
      </span>
    </Link>
  )
}
