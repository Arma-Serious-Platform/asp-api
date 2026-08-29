import { UserStatus } from '@prisma/client';
import {
  buildWarningAutobanReason,
  DEFAULT_AUTOBAN_HOURS,
  DEFAULT_WARNING_COUNT_UNTIL_BAN,
  DEFAULT_WARNING_WINDOW_DAYS,
  getWarningWindowStart,
  isPermanentBan,
  isWarningAutobanEnabled,
  parseWarningAutobanConfig,
  resolveAutobanBannedUntil,
  shouldTriggerWarningAutoban,
} from './users-warning-autoban';

describe('users-warning-autoban', () => {
  describe('parseWarningAutobanConfig', () => {
    it('uses defaults when env is missing', () => {
      expect(parseWarningAutobanConfig({})).toEqual({
        enabled: true,
        warningCountUntilBan: DEFAULT_WARNING_COUNT_UNTIL_BAN,
        warningWindowDays: DEFAULT_WARNING_WINDOW_DAYS,
        autobanHours: DEFAULT_AUTOBAN_HOURS,
      });
    });

    it('parses custom env values', () => {
      expect(
        parseWarningAutobanConfig({
          WARNING_AUTOBAN_ENABLED: 'true',
          WARNING_AUTOBAN_COUNT: '5',
          WARNING_AUTOBAN_WINDOW_DAYS: '14',
          WARNING_AUTOBAN_HOURS: '72',
        }),
      ).toEqual({
        enabled: true,
        warningCountUntilBan: 5,
        warningWindowDays: 14,
        autobanHours: 72,
      });
    });

    it('disables autoban when WARNING_AUTOBAN_ENABLED is false', () => {
      const config = parseWarningAutobanConfig({
        WARNING_AUTOBAN_ENABLED: 'false',
      });
      expect(config.enabled).toBe(false);
      expect(isWarningAutobanEnabled(config)).toBe(false);
    });

    it('disables autoban when WARNING_AUTOBAN_COUNT is zero', () => {
      const config = parseWarningAutobanConfig({ WARNING_AUTOBAN_COUNT: '0' });
      expect(config.warningCountUntilBan).toBe(0);
      expect(isWarningAutobanEnabled(config)).toBe(false);
    });
  });

  describe('shouldTriggerWarningAutoban', () => {
    const config = parseWarningAutobanConfig({});

    it('does not trigger below threshold', () => {
      expect(shouldTriggerWarningAutoban(2, config)).toBe(false);
    });

    it('triggers at threshold', () => {
      expect(shouldTriggerWarningAutoban(3, config)).toBe(true);
    });

    it('triggers above threshold', () => {
      expect(shouldTriggerWarningAutoban(4, config)).toBe(true);
    });
  });

  describe('getWarningWindowStart', () => {
    it('returns a date 30 days before now by default window', () => {
      const now = new Date('2026-08-29T12:00:00.000Z');
      const start = getWarningWindowStart(30, now);
      expect(start.toISOString()).toBe('2026-07-30T12:00:00.000Z');
    });
  });

  describe('resolveAutobanBannedUntil', () => {
    const now = new Date('2026-08-29T12:00:00.000Z');

    it('adds WARNING_AUTOBAN_HOURS when user is not banned', () => {
      const bannedUntil = resolveAutobanBannedUntil(null, 168, now);
      expect(bannedUntil.toISOString()).toBe('2026-09-05T12:00:00.000Z');
    });

    it('extends ban when current ban ends later than proposed', () => {
      const current = new Date('2026-09-10T12:00:00.000Z');
      const bannedUntil = resolveAutobanBannedUntil(current, 168, now);
      expect(bannedUntil).toEqual(current);
    });

    it('extends ban when proposed end is later than current temp ban', () => {
      const current = new Date('2026-08-30T12:00:00.000Z');
      const bannedUntil = resolveAutobanBannedUntil(current, 168, now);
      expect(bannedUntil.toISOString()).toBe('2026-09-05T12:00:00.000Z');
    });
  });

  describe('isPermanentBan', () => {
    it('detects permanent bans', () => {
      expect(
        isPermanentBan(UserStatus.BANNED, null),
      ).toBe(true);
    });

    it('does not treat temp bans as permanent', () => {
      expect(
        isPermanentBan(UserStatus.BANNED, new Date(Date.now() + 60_000)),
      ).toBe(false);
    });
  });

  describe('buildWarningAutobanReason', () => {
    it('includes threshold and window in Ukrainian message', () => {
      expect(buildWarningAutobanReason(parseWarningAutobanConfig({}))).toBe(
        'Автоматичний бан: отримано 3 попереджень за 30 днів',
      );
    });
  });
});
