import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESTAURACIÓN DE ADMINISTRADOR ---');
  
  const name = 'Rodrigo Zúñiga';
  const email = 'rzuniga@ejemplo.com'; // Puedes cambiarlo después
  const password = 'TaCaEmMi0929';
  const role = 'superadmin';

  try {
    // 1. Verificar si existe algún club asignable
    let club = await prisma.club.findFirst();
    if (!club) {
        console.log('No hay clubes. Creando club por defecto...');
        club = await prisma.club.create({
            data: { name: 'Club por Defecto', slug: 'club-por-defecto' }
        });
    }

    // 2. Generar Hash
    console.log(`Generando hash para el usuario: ${name}...`);
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Upsert User
    const user = await prisma.user.upsert({
      where: { email: email },
      update: {
        name: name,
        passwordHash: hashedPassword,
        role: role,
        clubId: club.id
      },
      create: {
        name: name,
        email: email,
        passwordHash: hashedPassword,
        role: role,
        clubId: club.id
      }
    });

    console.log('--- ÉXITO: Usuario Restaurado ---');
    console.log(`ID: ${user.id}`);
    console.log(`Nombre: ${user.name}`);
    console.log(`Rol: ${user.role}`);
    console.log('Ya puedes intentar loguearte de nuevo.');

  } catch (error) {
    console.error('ERROR DURANTE LA RESTAURACIÓN:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
