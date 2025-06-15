/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {

  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;
  const ownerNickname = process.env.OWNER_NICKNAME;

  if (!ownerEmail || !ownerNickname || !ownerPassword) {
    throw new Error('Check .env file');
  }

  const hashedPassword = await hash(ownerPassword, 15);

  try {
    await prisma.user.upsert({
      where: {
        email: ownerEmail,
        nickname: ownerNickname
      },
      update: {},
      create: {
        email: ownerEmail,
        nickname: ownerNickname,
        password: hashedPassword,
        role: 'OWNER',
        status: 'ACTIVE'
      }
    });

    console.log(`User ${ownerNickname} created`);

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
      await prisma.side.upsert({
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
      });

      await prisma.side.upsert({
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
      });

      await prisma.side.upsert({
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
      });
    }

    console.log(`Sides created`);

  } catch (error) {
    console.log('Error seeding database');
    console.error(error);
    process.exit(1)
  }



}

main().then(() => {
  console.log('Database seeded');
  process.exit(0)
}).catch((error) => {
  console.log('Error seeding database');
  console.error(error);
  process.exit(1)
})
