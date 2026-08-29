import { UserStatus } from '@prisma/client';

export const DEFAULT_WARNING_COUNT_UNTIL_BAN = 3;
export const DEFAULT_WARNING_WINDOW_DAYS = 30;
export const DEFAULT_AUTOBAN_HOURS = 168;

export type WarningAutobanConfig = {
  enabled: boolean;
  warningCountUntilBan: number;
  warningWindowDays: number;
  autobanHours: number;
};

export type WarningAutobanEnv = {
  WARNING_AUTOBAN_ENABLED?: string | number | boolean;
  WARNING_AUTOBAN_COUNT?: string | number;
  WARNING_AUTOBAN_WINDOW_DAYS?: string | number;
  WARNING_AUTOBAN_HOURS?: string | number;
};

function parsePositiveInt(
  value: string | number | undefined,
  defaultValue: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function parseEnvBoolean(
  value: string | number | boolean | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  return defaultValue;
}

export function parseWarningAutobanConfig(
  env: WarningAutobanEnv,
): WarningAutobanConfig {
  const rawCount = Number(env.WARNING_AUTOBAN_COUNT);
  const warningCountUntilBan =
    Number.isFinite(rawCount) && rawCount > 0
      ? rawCount
      : Number.isFinite(rawCount) && rawCount <= 0
        ? 0
        : DEFAULT_WARNING_COUNT_UNTIL_BAN;

  return {
    enabled: parseEnvBoolean(env.WARNING_AUTOBAN_ENABLED, true),
    warningCountUntilBan,
    warningWindowDays: parsePositiveInt(
      env.WARNING_AUTOBAN_WINDOW_DAYS,
      DEFAULT_WARNING_WINDOW_DAYS,
    ),
    autobanHours: parsePositiveInt(
      env.WARNING_AUTOBAN_HOURS,
      DEFAULT_AUTOBAN_HOURS,
    ),
  };
}

export function isWarningAutobanEnabled(config: WarningAutobanConfig): boolean {
  return config.enabled && config.warningCountUntilBan > 0;
}

export function shouldTriggerWarningAutoban(
  warningCount: number,
  config: WarningAutobanConfig,
): boolean {
  return (
    isWarningAutobanEnabled(config) &&
    warningCount >= config.warningCountUntilBan
  );
}

export function getWarningWindowStart(
  windowDays: number,
  now = new Date(),
): Date {
  return new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
}

export function buildWarningAutobanReason(config: WarningAutobanConfig): string {
  return `Автоматичний бан: отримано ${config.warningCountUntilBan} попереджень за ${config.warningWindowDays} днів`;
}

export function resolveAutobanBannedUntil(
  currentBannedUntil: Date | null,
  autobanHours: number,
  now = new Date(),
): Date {
  const proposed = new Date(now.getTime() + autobanHours * 60 * 60 * 1000);

  if (currentBannedUntil && currentBannedUntil > proposed) {
    return currentBannedUntil;
  }

  return proposed;
}

export function isPermanentBan(
  status: UserStatus,
  bannedUntil: Date | null,
): boolean {
  return status === UserStatus.BANNED && bannedUntil === null;
}
