 
 
 
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs';
import { createHash } from 'crypto';
import 'dotenv/config';
import { ISLANDS } from './data/islands';

const prisma = new PrismaClient();

const DEFAULT_SPECIALIZATIONS = [
  'КС',
  'КВ',
  'Гранатометник',
  'Екіпаж',
  'Екіпаж (мехвод)',
  'Пілот літака',
  'Пілот гелікоптера',
  'Мінометник',
  'Сапер',
];

const generateGuidFromSteamId64 = (steamId64: string) => {
  let steamId = BigInt(steamId64);
  const bytes = Buffer.alloc(8);

  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(steamId & 0xffn);
    steamId >>= 8n;
  }

  return createHash('md5')
    .update(Buffer.concat([Buffer.from('BE'), bytes]))
    .digest('hex');
};

export const seed = async () => {
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;
  const ownerNickname = process.env.OWNER_NICKNAME;

  if (!ownerEmail || !ownerNickname || !ownerPassword) {
    throw new Error('Check .env file');
  }

  const hashedPassword = await hash(ownerPassword, 15);

  const seedIslands = async () => {
    const islands = await prisma.island.findMany();

    if (islands.length > 0) return;

    await Promise.all(ISLANDS.map(async (island) => {
      return prisma.island.create({
        data: {
          name: island.name,
          code: island.id,
        },
      });
    }));
  }

  const seedUser = async () => {
    await prisma.user.upsert({
      where: {
        email: ownerEmail,
      },
      update: {},
      create: {
        email: ownerEmail,
        nickname: ownerNickname,
        password: hashedPassword,
        isEmailVerified: true,
        role: 'OWNER',
        status: 'ACTIVE'
      }
    });

    console.log(`User ${ownerNickname} created`);
  }

  const seedSides = async () => {
    const serverExists = await prisma.server.findFirst();

    if (serverExists) return;

    const server = await prisma.server.upsert({
      where: {
        name: 'Server #1',
      },
      update: {},
      create: {
        name: 'Server #1',
        status: 'ACTIVE',
      },
    });

    if (server?.id) {
      await Promise.all([
        prisma.side.upsert({
          where: {
            name: 'Blue Side',
            type: 'BLUE',
          },
          update: {},
          create: {
            name: 'Blue Side',
            type: 'BLUE',
            serverId: server.id,
          }
        }),

        prisma.side.upsert({
          where: {
            name: 'Red Side',
            type: 'RED',
          },
          update: {},
          create: {
            name: 'Red Side',
            type: 'RED',
            serverId: server.id,
          }
        }),
        prisma.side.upsert({
          where: {
            name: 'Unassigned',
            type: 'UNASSIGNED',
          },
          update: {},
          create: {
            name: 'Unassigned',
            type: 'UNASSIGNED',
            serverId: server.id,
          }
        })
      ])

      console.log(`Sides created`);
    }
  }

  const seedSpecializations = async () => {
    const count = await prisma.specialization.count();

    if (count > 0) return;

    await prisma.specialization.createMany({
      data: DEFAULT_SPECIALIZATIONS.map((name) => ({ name })),
    });

    console.log('Specializations created');
  }

  const cleanupPendingSquadRequestsForMembers = async () => {
    const usersInSquads = await prisma.user.findMany({
      where: {
        squadId: {
          not: null,
        },
      },
      select: {
        id: true,
      },
    });

    const userIds = usersInSquads.map((user) => user.id);

    if (userIds.length === 0) return;

    const [deletedInvites, deletedJoinRequests] = await prisma.$transaction([
      prisma.squadInvitation.deleteMany({
        where: {
          userId: { in: userIds },
          status: 'PENDING',
        },
      }),
      prisma.squadJoinRequest.deleteMany({
        where: {
          userId: { in: userIds },
          status: 'PENDING',
        },
      }),
    ]);

    if (deletedInvites.count > 0 || deletedJoinRequests.count > 0) {
      console.log(`Deleted ${deletedInvites.count} pending squad invites and ${deletedJoinRequests.count} pending join requests for users already in squads`);
    }
  }

  try {
    await Promise.all([
      seedUser(),
      seedSides(),
      seedIslands(),
      seedSpecializations(),
      cleanupPendingSquadRequestsForMembers(),
    ])
  } catch (error) {
    console.log('Error seeding database');
    console.error(error);
  }
}
