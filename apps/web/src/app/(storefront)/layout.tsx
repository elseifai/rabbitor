import { BottomNav } from '@/components/layout/BottomNav'

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <main className="pb-[100px]">{children}</main>
      <BottomNav />
    </div>
  )
}
