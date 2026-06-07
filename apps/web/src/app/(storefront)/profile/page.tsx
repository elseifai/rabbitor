import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileClient } from '@/components/profile/ProfileClient'

export default async function ProfilePage() {
  const session = await getSession()
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, phone: true, displayName: true },
      })
    : null

  return <ProfileClient user={user} />
}
