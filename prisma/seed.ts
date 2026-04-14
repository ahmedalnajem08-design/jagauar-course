import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default admin if not exists
  const existingAdmin = await prisma.trainer.findFirst({ where: { role: 'admin' } })
  if (!existingAdmin) {
    await prisma.trainer.create({
      data: {
        name: 'المدير',
        phone: '',
        password: 'admin123',
        role: 'admin',
      },
    })
    console.log('Admin account created')
  } else {
    console.log('Admin account already exists')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
