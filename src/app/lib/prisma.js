import { PrismaClient } from '@prisma/client';
import { getSession } from './session';

const prismaClientSingleton = () => {
  const prisma = new PrismaClient();

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Modelos que requieren aislamiento por TenantId
          const tenantModels = [
            'Tournament', 
            'TournamentPhase', 
            'TournamentGroup', 
            'TournamentMatch'
          ];

          if (tenantModels.includes(model)) {
            const session = await getSession();
            const tenantId = session?.clubId;

            if (tenantId) {
              // 1. Aislamiento en Lecturas, Updates y Deletes
              if (['findMany', 'findFirst', 'findUnique', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate'].includes(operation)) {
                args.where = { ...args.where, tenantId };
              }

              // 2. Inyección automática en Creaciones
              if (operation === 'create') {
                args.data = { ...args.data, tenantId };
              }

              if (operation === 'createMany') {
                if (Array.isArray(args.data)) {
                  args.data = args.data.map(item => ({ ...item, tenantId }));
                } else if (args.data.data && Array.isArray(args.data.data)) {
                    args.data.data = args.data.data.map(item => ({ ...item, tenantId }));
                }
              }
              
              // 3. Upsert (combinación de find/create/update)
              if (operation === 'upsert') {
                  args.where = { ...args.where, tenantId };
                  args.create = { ...args.create, tenantId };
                  args.update = { ...args.update, tenantId };
              }
            }
          }

          return query(args);
        },
      },
    },
  });
};

const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
