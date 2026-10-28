import { Logger } from '@nestjs/common';
import {
  AccessRevocationEvent,
  AccessRevocationService,
} from './access-revocation.service';

describe('AccessRevocationService', () => {
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delivers the event to every listener in order', async () => {
    const service = new AccessRevocationService();
    const calls: string[] = [];
    service.subscribe(() => {
      calls.push('first');
      return Promise.resolve();
    });
    service.subscribe(() => {
      calls.push('second');
      return Promise.resolve();
    });

    await service.publish({ type: 'session', sessionId: 's1' });

    expect(calls).toEqual(['first', 'second']);
  });

  it('keeps notifying the rest and resolves when a listener throws', async () => {
    const service = new AccessRevocationService();
    const received: AccessRevocationEvent[] = [];
    service.subscribe(() =>
      Promise.reject(new Error('connected app unreachable')),
    );
    service.subscribe((event) => {
      received.push(event);
      return Promise.resolve();
    });

    const event: AccessRevocationEvent = { type: 'user', userId: 'u1' };
    await expect(service.publish(event)).resolves.toBeUndefined();

    expect(received).toEqual([event]);
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
