const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(tournaments, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
