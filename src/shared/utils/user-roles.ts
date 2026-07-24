import { UserRole } from '@prisma/client';

export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.MISSION_REVIEWER]: 0,
  [UserRole.MINI_ADMIN]: 1,
  [UserRole.GAME_ADMIN]: 2,
  [UserRole.TECH_ADMIN]: 3,
  [UserRole.UVK]: 4,
  [UserRole.SERVER_ADMIN]: 5,
  [UserRole.OWNER]: 6,
};

export function hasAnyRole(
  userRoles: UserRole[] | null | undefined,
  allowed: UserRole[],
): boolean {
  if (!userRoles?.length || !allowed.length) {
    return false;
  }

  return userRoles.some((role) => allowed.includes(role));
}

export function highestRole(
  userRoles: UserRole[] | null | undefined,
): UserRole {
  if (!userRoles?.length) {
    return UserRole.USER;
  }

  return userRoles.reduce((best, role) =>
    ROLE_RANK[role] > ROLE_RANK[best] ? role : best,
  );
}

export function normalizeRoles(roles: UserRole[]): UserRole[] {
  return [...new Set(roles)];
}
