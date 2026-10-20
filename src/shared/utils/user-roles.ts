import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

function sortedUniqueRoles(roles: UserRole[]): UserRole[] {
  return [...normalizeRoles(roles)].sort();
}

function rolesEqual(a: UserRole[], b: UserRole[]): boolean {
  const left = sortedUniqueRoles(a);
  const right = sortedUniqueRoles(b);
  return (
    left.length === right.length &&
    left.every((role, index) => role === right[index])
  );
}

type RoleChangePrivilege = 'OWNER' | 'SERVER_ADMIN' | 'UVK';

function resolveRoleChangePrivilege(
  actorRoles: UserRole[],
): RoleChangePrivilege | null {
  if (hasAnyRole(actorRoles, [UserRole.OWNER])) {
    return 'OWNER';
  }
  if (hasAnyRole(actorRoles, [UserRole.SERVER_ADMIN])) {
    return 'SERVER_ADMIN';
  }
  if (hasAnyRole(actorRoles, [UserRole.UVK])) {
    return 'UVK';
  }
  return null;
}

function targetHasProtectedStaffRoles(targetRoles: UserRole[]): boolean {
  return hasAnyRole(targetRoles, [UserRole.OWNER, UserRole.SERVER_ADMIN]);
}

/**
 * Enforces Owner → Server Admin → UVK hierarchy for PUT /users/change-role.
 */
export function assertCanChangeUserRoles(
  actorRoles: UserRole[],
  targetRoles: UserRole[],
  nextRoles: UserRole[],
  ids: { actorId: string; targetId: string },
): void {
  if (ids.actorId === ids.targetId) {
    throw new ForbiddenException('You cannot change your own roles');
  }

  const privilege = resolveRoleChangePrivilege(actorRoles);
  if (!privilege) {
    throw new ForbiddenException('You are not allowed to change user roles');
  }

  const normalizedNext = normalizeRoles(nextRoles);

  if (privilege === 'OWNER') {
    return;
  }

  if (targetHasProtectedStaffRoles(targetRoles)) {
    throw new ForbiddenException(
      'You cannot change roles of OWNER or SERVER_ADMIN users',
    );
  }

  if (
    hasAnyRole(normalizedNext, [UserRole.OWNER, UserRole.SERVER_ADMIN])
  ) {
    throw new BadRequestException(
      'You cannot assign OWNER or SERVER_ADMIN roles',
    );
  }

  if (privilege === 'SERVER_ADMIN') {
    return;
  }

  // UVK: only MISSION_REVIEWER may be added or removed
  const previousWithoutReviewer = sortedUniqueRoles(targetRoles).filter(
    (role) => role !== UserRole.MISSION_REVIEWER,
  );
  const nextWithoutReviewer = sortedUniqueRoles(normalizedNext).filter(
    (role) => role !== UserRole.MISSION_REVIEWER,
  );

  if (!rolesEqual(previousWithoutReviewer, nextWithoutReviewer)) {
    throw new ForbiddenException(
      'UVK can only give or revoke the MISSION_REVIEWER role',
    );
  }
}
