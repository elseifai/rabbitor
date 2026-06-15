export type AuthRole = 'CUSTOMER' | 'VENDOR' | 'RABBITOR' | 'ADMIN'

export type AuthRoleId = 'customer' | 'merchant' | 'rabbitor' | 'admin'

export type AuthRoleOption = {
  id: AuthRoleId
  role: AuthRole
  title: string
  subtitle: string
  emoji: string
  redirect: string
}

export const AUTH_ROLE_OPTIONS: readonly AuthRoleOption[] = [
  {
    id: 'customer',
    role: 'CUSTOMER',
    title: 'Customer',
    subtitle: 'Order from local shops',
    emoji: '🛒',
    redirect: '/',
  },
  {
    id: 'merchant',
    role: 'VENDOR',
    title: 'Merchant',
    subtitle: 'Manage your store & orders',
    emoji: '🏪',
    redirect: '/merchant',
  },
  {
    id: 'rabbitor',
    role: 'RABBITOR',
    title: 'Rider',
    subtitle: 'Deliver orders in your area',
    emoji: '🛵',
    redirect: '/delivery/dashboard',
  },
  {
    id: 'admin',
    role: 'ADMIN',
    title: 'Admin',
    subtitle: 'Platform operations',
    emoji: '🛡️',
    redirect: '/admin',
  },
] as const

const ROLE_ALIASES: Record<string, AuthRoleId> = {
  customer: 'customer',
  CUSTOMER: 'customer',
  merchant: 'merchant',
  vendor: 'merchant',
  VENDOR: 'merchant',
  rider: 'rabbitor',
  rabbitor: 'rabbitor',
  delivery: 'rabbitor',
  RABBITOR: 'rabbitor',
  admin: 'admin',
  ADMIN: 'admin',
}

export function parseAuthRoleParam(value: string | null | undefined): AuthRoleId {
  if (!value) return 'customer'
  return ROLE_ALIASES[value] ?? 'customer'
}

export function getAuthRoleOption(id: AuthRoleId): AuthRoleOption {
  return AUTH_ROLE_OPTIONS.find((o) => o.id === id) ?? AUTH_ROLE_OPTIONS[0]
}

export function getAuthRoleOptionByRole(role: AuthRole): AuthRoleOption {
  return AUTH_ROLE_OPTIONS.find((o) => o.role === role) ?? AUTH_ROLE_OPTIONS[0]
}
