/** DEV ONLY BYPASS — static test credentials for local / test-server sandbox login. */
export const DEV_OTP_CODE = '123456' as const

export type DevRoleId = 'customer' | 'merchant' | 'rabbitor' | 'admin'

export type DevLoginAccount = {
  id: DevRoleId
  role: 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'
  title: string
  subtitle: string
  emoji: string
  phone: string
  otp: typeof DEV_OTP_CODE
  redirect: string
}

/** Seeded test accounts — phones from `packages/database/prisma/seed.ts`. */
export const DEV_LOGIN_ACCOUNTS: readonly DevLoginAccount[] = [
  {
    id: 'customer',
    role: 'CUSTOMER',
    title: 'Customer',
    subtitle: 'Browse shops, cart & checkout',
    emoji: '🛒',
    phone: '9666666666',
    otp: DEV_OTP_CODE,
    redirect: '/dashboard',
  },
  {
    id: 'merchant',
    role: 'VENDOR',
    title: 'Merchant',
    subtitle: 'Manage store, orders & catalog',
    emoji: '🏪',
    phone: '9222222222',
    otp: DEV_OTP_CODE,
    redirect: '/merchant/dashboard',
  },
  {
    id: 'rabbitor',
    role: 'RABBITOR',
    title: 'Rabbitor (Delivery)',
    subtitle: 'Accept deliveries & navigate',
    emoji: '🛵',
    phone: '9444444444',
    otp: DEV_OTP_CODE,
    redirect: '/rabbitor/dashboard',
  },
  {
    id: 'admin',
    role: 'ADMIN',
    title: 'Admin',
    subtitle: 'Platform ops & analytics',
    emoji: '🛡️',
    phone: '9000000000',
    otp: DEV_OTP_CODE,
    redirect: '/admin/dashboard',
  },
] as const

/** DEV ONLY BYPASS — server-side static OTP bypass (local or explicit test-server flag). */
export function isDevOtpBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_DEV_OTP_BYPASS === 'true'
  )
}

/** DEV ONLY BYPASS — show sandbox UI in the browser (dev build or NEXT_PUBLIC_DEV_SANDBOX). */
export function isDevSandboxClient(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEV_SANDBOX === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

export function getDevAccount(id: DevRoleId): DevLoginAccount | undefined {
  return DEV_LOGIN_ACCOUNTS.find((a) => a.id === id)
}
