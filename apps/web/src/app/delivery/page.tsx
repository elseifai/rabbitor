import { redirect } from 'next/navigation'
import { getSession, resolveSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roleCanAccessPortal } from '@/lib/auth-routing'

export default async function DeliveryIndexPage() {
  const session = await getSession()
  if (!session) {
    redirect('/delivery/login')
  }

  const user = await resolveSessionUser(session)
  if (!user || !roleCanAccessPortal(user.role, 'RABBITOR')) {
    redirect('/delivery/login')
  }

  const profile = await prisma.rabbitorProfile.findUnique({
    where: { userId: user.id },
    select: { isOnboarded: true },
  })

  if (!profile?.isOnboarded) {
    redirect('/delivery/login?setup=1')
  }

  redirect('/delivery/dashboard')
}
