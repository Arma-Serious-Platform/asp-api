import {
  Prisma,
  PrismaClient,
  SoldierAbility,
  SquadRole,
  UserHistoryEventType,
  UserPunishmentType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'test-password';
const NEWS_PREFIX = 'Локально:';
const SQUAD_TAGS = ['YAST', 'KRUK'] as const;

type TestUser = {
  email: string;
  nickname: string;
  roles?: UserRole[];
  status?: UserStatus;
  bannedUntil?: Date | null;
  isMuted?: boolean;
  abilities?: SoldierAbility[];
  specializations?: string[];
  telegramUrl?: string;
  discordUrl?: string;
};

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const textDoc = (text: string): Prisma.InputJsonValue => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          {
            type: 'text',
            version: 1,
            text,
            format: 0,
            mode: 'normal',
            style: '',
            detail: 0,
          },
        ],
      },
    ],
  },
});

const TEST_USERS: TestUser[] = [
  {
    email: 'hawk@local.test',
    nickname: 'hawk',
    roles: [UserRole.GAME_ADMIN],
    abilities: [SoldierAbility.COMMANDER],
    specializations: ['КС'],
    telegramUrl: 'https://t.me/hawk_local',
    discordUrl: 'https://discord.com/users/hawk',
  },
  {
    email: 'raven@local.test',
    nickname: 'raven',
    abilities: [SoldierAbility.COMMANDER],
    specializations: ['КВ'],
    telegramUrl: 'https://t.me/raven_local',
  },
  {
    email: 'clean@local.test',
    nickname: 'clean',
    abilities: [SoldierAbility.MEDIC],
    specializations: ['Сапер'],
    discordUrl: 'https://discord.com/users/clean',
  },
  {
    email: 'pilot@local.test',
    nickname: 'pilot',
    abilities: [SoldierAbility.HELI_PILOT],
    specializations: ['Пілот гелікоптера'],
  },
  {
    email: 'warned@local.test',
    nickname: 'warned',
    specializations: ['Гранатометник'],
    telegramUrl: 'https://t.me/warned_local',
  },
  {
    email: 'almost@local.test',
    nickname: 'almost',
    specializations: ['Мінометник'],
  },
  {
    email: 'expired@local.test',
    nickname: 'expired',
  },
  {
    email: 'cleared@local.test',
    nickname: 'cleared',
    abilities: [SoldierAbility.ANTI_TANK],
  },
  {
    email: 'novachok@local.test',
    nickname: 'novachok',
  },
  {
    email: 'guest@local.test',
    nickname: 'guest',
  },
  {
    email: 'muted@local.test',
    nickname: 'muted',
    status: UserStatus.BANNED,
    bannedUntil: daysFromNow(3),
    isMuted: true,
  },
  {
    email: 'ghost@local.test',
    nickname: 'ghost',
    status: UserStatus.BANNED,
    bannedUntil: null,
  },
];

const seedTestData = async () => {
  const ownerEmail = process.env.OWNER_EMAIL;

  if (!ownerEmail) {
    throw new Error('OWNER_EMAIL is not set');
  }

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });

  if (!owner) {
    throw new Error(
      'Owner user was not found. Start the API once so the base seed can create it.',
    );
  }

  const [blue, red] = await Promise.all([
    prisma.side.findFirst({ where: { type: 'BLUE' } }),
    prisma.side.findFirst({ where: { type: 'RED' } }),
  ]);

  if (!blue || !red) {
    throw new Error('Sides were not found. Start the API once so the base seed can create them.');
  }

  const password = await hash(TEST_PASSWORD, 10);

  for (const spec of TEST_USERS) {
    const data = {
      nickname: spec.nickname,
      password,
      isEmailVerified: true,
      status: spec.status ?? UserStatus.ACTIVE,
      bannedUntil: spec.bannedUntil ?? null,
      isMuted: spec.isMuted ?? false,
      roles: spec.roles ?? [UserRole.USER],
      abilities: spec.abilities ?? [],
      squadId: null,
      squadRole: SquadRole.MEMBER,
      telegramUrl: spec.telegramUrl ?? null,
      discordUrl: spec.discordUrl ?? null,
    };

    await prisma.user.upsert({
      where: { email: spec.email },
      update: data,
      create: { email: spec.email, ...data },
    });
  }

  const users = await prisma.user.findMany({
    where: { email: { in: TEST_USERS.map((user) => user.email) } },
  });
  const userId = (email: string) => {
    const user = users.find((item) => item.email === email);

    if (!user) {
      throw new Error(`Test user ${email} was not created`);
    }

    return user.id;
  };
  const ids = users.map((user) => user.id);

  await prisma.userPunishment.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userHistoryEvent.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userWarning.deleteMany({ where: { userId: { in: ids } } });
  await prisma.squadInvitation.deleteMany({
    where: { OR: [{ userId: { in: ids } }, { squad: { tag: { in: [...SQUAD_TAGS] } } }] },
  });
  await prisma.squadJoinRequest.deleteMany({
    where: { OR: [{ userId: { in: ids } }, { squad: { tag: { in: [...SQUAD_TAGS] } } }] },
  });

  const existingSquads = await prisma.squad.findMany({
    where: { tag: { in: [...SQUAD_TAGS] } },
    select: { id: true },
  });
  const squadIds = existingSquads.map((squad) => squad.id);

  if (squadIds.length) {
    await prisma.user.updateMany({
      where: { squadId: { in: squadIds } },
      data: { squadId: null, squadRole: SquadRole.MEMBER },
    });
    await prisma.squad.deleteMany({ where: { id: { in: squadIds } } });
  }

  const specs = await prisma.specialization.findMany({
    where: {
      name: {
        in: TEST_USERS.flatMap((user) => user.specializations ?? []),
      },
    },
    select: { id: true, name: true },
  });

  for (const spec of TEST_USERS) {
    const connected = specs.filter((item) => spec.specializations?.includes(item.name));

    await prisma.user.update({
      where: { id: userId(spec.email) },
      data: {
        specializations: { set: connected.map((item) => ({ id: item.id })) },
      },
    });
  }

  const yast = await prisma.squad.create({
    data: {
      name: 'Яструби',
      tag: 'YAST',
      leaderId: userId('hawk@local.test'),
      sideId: blue.id,
      recruiting: true,
      activeCount: 12,
      telegramUrl: 'https://t.me/yast_local',
      discordUrl: 'https://discord.gg/yast',
      description: textDoc(
        'Піхотний загін синьої сторони. Беремо стрільців, саперів і екіпаж. Тренування щосереди.',
      ),
    },
  });

  const kruk = await prisma.squad.create({
    data: {
      name: 'Крук',
      tag: 'KRUK',
      leaderId: userId('raven@local.test'),
      sideId: red.id,
      recruiting: false,
      activeCount: 8,
      telegramUrl: 'https://t.me/kruk_local',
      description: textDoc('Закритий загін червоної сторони. Набір призупинено до наступного сезону.'),
    },
  });

  const members: { email: string; squadId: string; role: SquadRole; joinedDaysAgo: number }[] = [
    { email: 'hawk@local.test', squadId: yast.id, role: SquadRole.HQ, joinedDaysAgo: 50 },
    { email: 'clean@local.test', squadId: yast.id, role: SquadRole.SUBLEADER, joinedDaysAgo: 40 },
    { email: 'pilot@local.test', squadId: yast.id, role: SquadRole.MEMBER, joinedDaysAgo: 20 },
    { email: 'raven@local.test', squadId: kruk.id, role: SquadRole.HQ, joinedDaysAgo: 48 },
    { email: 'warned@local.test', squadId: kruk.id, role: SquadRole.MEMBER, joinedDaysAgo: 30 },
    { email: 'expired@local.test', squadId: kruk.id, role: SquadRole.RECRUIT, joinedDaysAgo: 10 },
  ];

  for (const member of members) {
    await prisma.user.update({
      where: { id: userId(member.email) },
      data: { squadId: member.squadId, squadRole: member.role },
    });
  }

  await prisma.squadJoinRequest.create({
    data: {
      userId: userId('novachok@local.test'),
      squadId: yast.id,
      status: 'PENDING',
      createdAt: daysAgo(1),
    },
  });

  await prisma.squadInvitation.create({
    data: {
      userId: userId('guest@local.test'),
      squadId: kruk.id,
      status: 'PENDING',
      squadRole: SquadRole.RECRUIT,
      createdAt: daysAgo(2),
    },
  });

  const addHistory = async (
    email: string,
    type: UserHistoryEventType,
    createdAt: Date,
    payload: Prisma.InputJsonValue = {},
    actorId?: string,
  ) => {
    await prisma.userHistoryEvent.create({
      data: {
        userId: userId(email),
        actorId,
        type,
        payload,
        createdAt,
      },
    });
  };

  for (const spec of TEST_USERS) {
    await addHistory(spec.email, UserHistoryEventType.SIGN_UP, daysAgo(70));
  }

  for (const member of members) {
    const squad = member.squadId === yast.id ? yast : kruk;

    await addHistory(
      member.email,
      UserHistoryEventType.SQUAD_JOIN,
      daysAgo(member.joinedDaysAgo),
      { squadTag: squad.tag, squadName: squad.name },
      userId(member.squadId === yast.id ? 'hawk@local.test' : 'raven@local.test'),
    );
  }

  await addHistory(
    'clean@local.test',
    UserHistoryEventType.NICKNAME_CHANGE,
    daysAgo(35),
    { oldNickname: 'clean_old', newNickname: 'clean' },
    owner.id,
  );
  await addHistory(
    'hawk@local.test',
    UserHistoryEventType.ROLE_CHANGE,
    daysAgo(25),
    { oldRoles: [UserRole.USER], newRoles: [UserRole.GAME_ADMIN] },
    owner.id,
  );

  const mutedUntil = daysFromNow(3);

  await prisma.userPunishment.create({
    data: {
      userId: userId('muted@local.test'),
      adminId: owner.id,
      type: UserPunishmentType.TEMP_BAN,
      reason: 'Токсичність у загальному чаті',
      bannedUntil: mutedUntil,
      isMuted: true,
      createdAt: daysAgo(1),
    },
  });
  await addHistory(
    'muted@local.test',
    UserHistoryEventType.TEMP_BAN,
    daysAgo(1),
    {
      reason: 'Токсичність у загальному чаті',
      bannedUntil: mutedUntil.toISOString(),
      isMuted: true,
    },
    owner.id,
  );

  await prisma.userPunishment.create({
    data: {
      userId: userId('ghost@local.test'),
      adminId: owner.id,
      type: UserPunishmentType.PERMANENT_BAN,
      reason: 'Повторні порушення після тимчасового бану',
      createdAt: daysAgo(15),
    },
  });
  await addHistory(
    'ghost@local.test',
    UserHistoryEventType.PERMANENT_BAN,
    daysAgo(15),
    { reason: 'Повторні порушення після тимчасового бану' },
    owner.id,
  );

  const addWarning = async (
    email: string,
    reason: string,
    createdAt: Date,
    removed?: { at: Date; reason: string },
  ) => {
    const targetId = userId(email);
    const warning = await prisma.userWarning.create({
      data: {
        userId: targetId,
        adminId: owner.id,
        reason,
        createdAt,
        removedAt: removed?.at,
        removedById: removed ? owner.id : undefined,
        removeReason: removed?.reason,
      },
    });

    await prisma.userPunishment.create({
      data: {
        userId: targetId,
        adminId: owner.id,
        warningId: warning.id,
        type: UserPunishmentType.WARNING,
        reason,
        createdAt,
      },
    });
    await addHistory(
      email,
      UserHistoryEventType.WARNING,
      createdAt,
      { reason, warningId: warning.id },
      owner.id,
    );

    if (!removed) {
      return;
    }

    await prisma.userPunishment.create({
      data: {
        userId: targetId,
        adminId: owner.id,
        warningId: warning.id,
        type: UserPunishmentType.WARNING_REMOVED,
        reason: removed.reason,
        createdAt: removed.at,
      },
    });
    await addHistory(
      email,
      UserHistoryEventType.WARNING_REMOVED,
      removed.at,
      { reason: removed.reason, warningId: warning.id },
      owner.id,
    );
  };

  await addWarning('warned@local.test', 'Не вийшов на звʼязок перед грою', daysAgo(2));
  await addWarning('warned@local.test', 'Покинув слот без попередження', daysAgo(12));
  await addWarning('almost@local.test', 'Запізнився на розподіл слотів', daysAgo(29));
  await addWarning('expired@local.test', 'Попередження поза вікном автобану', daysAgo(45));
  await addWarning('cleared@local.test', 'Спірне попередження', daysAgo(4), {
    at: daysAgo(1),
    reason: 'Ситуацію уточнено',
  });

  const achievements = [
    {
      title: 'Перша гра',
      description: 'Відіграв першу недільну гру на сервері',
      emails: ['hawk@local.test', 'clean@local.test', 'pilot@local.test', 'raven@local.test'],
    },
    {
      title: 'Екіпаж тижня',
      description: 'Найкращий екіпаж техніки за підсумками вихідних',
      emails: ['pilot@local.test', 'warned@local.test'],
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { title: achievement.title },
      update: {
        description: achievement.description,
        users: { set: achievement.emails.map((email) => ({ id: userId(email) })) },
      },
      create: {
        title: achievement.title,
        description: achievement.description,
        users: { connect: achievement.emails.map((email) => ({ id: userId(email) })) },
      },
    });
  }

  await prisma.news.deleteMany({ where: { title: { startsWith: NEWS_PREFIX } } });

  const news = [
    {
      title: `${NEWS_PREFIX} Набір у Яструби`,
      type: 'INFO' as const,
      days: 1,
      short: 'Синя сторона відкрила набір стрільців і саперів.',
      body: 'Загін Яструби бере нових бійців. Заявку можна залишити на сторінці загону, відповідь зазвичай протягом доби.',
    },
    {
      title: `${NEWS_PREFIX} Оновлення слотів`,
      type: 'TECH_UPDATE' as const,
      days: 4,
      short: 'У місіях вихідних змінили склад техніки.',
      body: 'На червоній стороні прибрали зайвий БТР і додали мінометну пару. Слоти вже оновлені в картках місій.',
    },
    {
      title: `${NEWS_PREFIX} Правила голосового чату`,
      type: 'WEBSITE_UPDATE' as const,
      days: 9,
      short: 'Коротко нагадуємо, за що видають попередження.',
      body: 'Попередження діє 30 днів. Третє актуальне попередження за цей строк призводить до тимчасового бану.',
    },
  ];

  for (const item of news) {
    await prisma.news.create({
      data: {
        title: item.title,
        type: item.type,
        published: true,
        date: daysAgo(item.days),
        shortDescription: textDoc(item.short),
        content: textDoc(item.body),
        authorId: owner.id,
        lastEditedById: owner.id,
      },
    });
  }

  console.log(`Test data ready. Password for every test user: ${TEST_PASSWORD}`);
  console.log('hawk     GAME_ADMIN, лідер [YAST] Яструби, набір відкритий');
  console.log('raven    лідер [KRUK] Крук, набір закритий');
  console.log('clean    заступник Яструбів, без попереджень');
  console.log('pilot    пілот Яструбів');
  console.log('warned   2 активні попередження');
  console.log('almost   попередження, яке спливає завтра');
  console.log('expired  попередження старше 30 днів');
  console.log('cleared  зняте попередження');
  console.log('novachok заявка в Яструби');
  console.log('guest    запрошення в Крук');
  console.log('muted    тимчасовий бан і мут на 3 дні');
  console.log('ghost    перманентний бан');
  console.log('Profiles: http://localhost:4000/profile/<nickname>');
};

seedTestData()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
