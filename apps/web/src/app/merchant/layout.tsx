import { MerchantLayoutShell } from '@/components/merchant/MerchantLayoutShell'

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MerchantLayoutShell>{children}</MerchantLayoutShell>
}
