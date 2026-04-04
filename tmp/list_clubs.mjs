import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const clubs = await prisma.club.findMany()
  console.log('--- CLUBS / TENANTS ---')
  console.log(JSON.stringify(clubs, null, 2))
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
