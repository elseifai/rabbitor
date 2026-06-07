'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type AdRecord = {
  id: string
  title: string
  imageUrl: string
  linkUrl: string | null
  placement: string
}

export function AdBanner({
  placement,
  className = '',
}: {
  placement: string
  className?: string
}) {
  const router = useRouter()
  const [ad, setAd] = useState<AdRecord | null>(null)

  useEffect(() => {
    fetch(`/api/ads?placement=${encodeURIComponent(placement)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.[0]) setAd(json.data[0] as AdRecord)
      })
      .catch(() => {})
  }, [placement])

  if (!ad) return null

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
      className={`block w-full overflow-hidden rounded-xl ${className}`}
      aria-label={ad.title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-cover" />
    </button>
  )
}
