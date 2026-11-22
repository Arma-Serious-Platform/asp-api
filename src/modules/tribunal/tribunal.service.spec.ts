import { BadRequestException } from '@nestjs/common';
import { TribunalComplaintStatus, UserRole } from '@prisma/client';
import {
  TribunalPunishmentRequestType,
} from './dto/create-tribunal-complaint.dto';
import { TribunalResolveOutcome } from './dto/resolve-tribunal-complaint.dto';

jest.mock('src/shared/utils/upload-attachments', () => ({
  uploadAttachmentFiles: jest.fn(),
}));

jest.mock('src/infrastructure/minio/minio.service', () => ({
  MinioService: class MinioService {},
}));

jest.mock('../users/users.service', () => ({
  UsersService: class UsersService {},
}));

import { TribunalService } from './tribunal.service';

const openComplaint = {
  id: 'complaint-1',
  status: TribunalComplaintStatus.OPEN,
  targetUserId: 'target-1',
  authorId: 'author-1',
  description: 'Опис порушення достатньої довжини',
};

describe('TribunalService', () => {
  const tx = {
    tribunalComplaint: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    tribunalMessage: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    tribunalComplaint: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    game: {
      findUnique: jest.fn(),
    },
  };
  const usersService = {
    createWarningInTransaction: jest.fn(),
    banUserInTransaction: jest.fn(),
    permanentlyBanUserInTransaction: jest.fn(),
    disconnectBannedUser: jest.fn(),
  };

  const service = new TribunalService(prisma as never, usersService as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
  });

  it('creates an open complaint and does not punish', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'target-1' });
    prisma.tribunalComplaint.create.mockResolvedValue({ id: 'complaint-1' });

    await service.create(
      {
        targetUserId: 'target-1',
        violatedAt: '2026-01-01T00:00:00.000Z',
        description: 'Опис порушення достатньої довжини',
      },
      'author-1',
      [UserRole.OWNER],
    );

    expect(usersService.createWarningInTransaction).not.toHaveBeenCalled();
    expect(prisma.tribunalComplaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TribunalComplaintStatus.OPEN,
          punishmentKind: 'NONE',
        }),
      }),
    );
  });

  it('does not punish when a concurrent resolve already closed the complaint', async () => {
    prisma.tribunalComplaint.findUnique.mockResolvedValue(openComplaint);
    tx.tribunalComplaint.findUnique.mockResolvedValue(openComplaint);
    tx.tribunalComplaint.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.resolve(
        'complaint-1',
        {
          outcome: TribunalResolveOutcome.PUNISHED,
          ruleNumber: '1.3',
          ruleText: 'Заборонено вбивати своїх',
          punishment: { type: TribunalPunishmentRequestType.WARNING, warningCount: 2 },
        },
        'admin-1',
        [UserRole.OWNER],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(usersService.createWarningInTransaction).not.toHaveBeenCalled();
  });

  it('links the complaint to the warning punishment, not the autoban', async () => {
    prisma.tribunalComplaint.findUnique.mockResolvedValue(openComplaint);
    tx.tribunalComplaint.findUnique.mockResolvedValue(openComplaint);
    tx.tribunalComplaint.updateMany.mockResolvedValue({ count: 1 });
    tx.tribunalComplaint.update.mockResolvedValue({});
    usersService.createWarningInTransaction.mockResolvedValue({
      punishmentId: 'warning-punishment',
      autobanApplied: true,
      bannedUntil: '2026-09-05T12:00:00.000Z',
    });

    await service.resolve(
      'complaint-1',
      {
        outcome: TribunalResolveOutcome.PUNISHED,
        ruleNumber: '1',
        ruleText: 'Заборонено вбивати своїх',
        punishment: { type: TribunalPunishmentRequestType.WARNING, warningCount: 2 },
      },
      'admin-1',
      [UserRole.OWNER],
    );

    expect(tx.tribunalComplaint.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolvedById: 'admin-1',
          ruleNumber: '1',
          ruleText: 'Заборонено вбивати своїх',
        }),
      }),
    );
    expect(tx.tribunalComplaint.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          punishmentId: 'warning-punishment',
          warningWeight: 2,
          punishmentKind: 'WARNING',
          bannedUntil: null,
        }),
      }),
    );
    expect(usersService.disconnectBannedUser).not.toHaveBeenCalled();
  });

  it('rejects a message on a closed complaint', async () => {
    prisma.tribunalComplaint.findUnique.mockResolvedValue({
      ...openComplaint,
      status: TribunalComplaintStatus.PUNISHED,
    });

    await expect(
      service.createMessage('complaint-1', { body: 'Ще одне повідомлення' }, 'author-1', []),
    ).rejects.toThrow('У закритій скарзі писати не можна');
  });
});
