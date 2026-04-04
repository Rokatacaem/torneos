const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- AUDITORÍA DE DATOS DE TORNEOS ---');
  
  const tenants = await prisma.tenant.count();
  const clubs = await prisma.club.findMany({
    include: {
      _count: {
        select: { tournaments: true, players: true }
      }
    }
  });

  console.log(`Total Tenants (infra): ${tenants}`);
  console.log(`Total Clubes (negocio): ${clubs.length}`);
  
  clubs.forEach(club => {
    console.log(`\nClub: ${club.name} (Slug: ${club.slug})`);
    console.log(`- Torneos: ${club._count.tournaments}`);
    console.log(`- Jugadores: ${club._count.players}`);
  });

  const tournaments = await prisma.tournament.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  console.log('\nÚltimos 5 torneos creados:');
  tournaments.forEach(t => {
    console.log(`- [${t.id}] ${t.name} (Status: ${t.status}) - Creado: ${t.createdAt}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
