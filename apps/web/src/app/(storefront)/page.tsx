import { Suspense } from 'react'
import { HomeFeed } from '@/components/home/HomeFeed'

function HomeFeedFallback() {
  return (
    <div className="mx-auto min-h-screen max-w-[480px] animate-pulse bg-[#F0F0F0]" />
  )
}

export default function SwiggyStyleRabbitHome() {
  return (
    <Suspense fallback={<HomeFeedFallback />}>
      <HomeFeed />
    </Suspense>
  )
}
