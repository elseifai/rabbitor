import { MerchantShellProvider } from '@/components/merchant/MerchantShellProvider'

// MERCHANT SIDEBAR & CATALOG REFACTOR — persistent admin-style shell for all merchant routes
export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MerchantShellProvider>{children}</MerchantShellProvider>
}
