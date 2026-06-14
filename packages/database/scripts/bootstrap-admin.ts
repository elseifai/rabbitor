import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'dreamsight11@gmail.com' },
    update: { role: 'ADMIN', name: 'Platform Administrator' },
    create: {
      email: 'dreamsight11@gmail.com',
      name: 'Platform Administrator',
      role: 'ADMIN',
    },
  })
  console.log('Admin bootstrap OK:', user.id, user.email, user.role)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
