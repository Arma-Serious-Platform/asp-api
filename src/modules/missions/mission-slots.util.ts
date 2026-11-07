import { MissionGameSide, Prisma } from '@prisma/client';

/** In-game names may override the PBO group with `@A1-1` or `@[РЕЗЕРВ]А3-4`. */
const IN_GAME_CALLSIGN_OVERRIDE =
  /@(?:\[РЕЗЕРВ\])?\s*[AАaа]\s*(\d+)\s*-\s*(\d+)/u;

export type ParsedMissionUnit = {
  name?: string;
};

export type ParsedMissionSlot = {
  callsign?: string;
  count?: number;
  units?: ParsedMissionUnit[];
};

export type PublicMissionSlot = {
  callsign: string;
  name: string | null;
  count: number | null;
};

export type PublicMissionSlots = {
  attack: PublicMissionSlot[];
  defense: PublicMissionSlot[];
  friendly: PublicMissionSlot[];
};

export function resolveSlotCallsign(
  pboCallsign: string | undefined,
  firstUnitName?: string,
): string {
  if (firstUnitName) {
    const match = firstUnitName.match(IN_GAME_CALLSIGN_OVERRIDE);
    if (match?.[1] && match[2]) {
      return `Alpha ${match[1]}-${match[2]}`;
    }
  }

  return pboCallsign ?? 'Unknown';
}

/** Slot trees are stored as `{ [MissionGameSide]: ParsedMissionSlot[] }`. */
export function extractSlotsArrayBySide(
  slotsJson: Prisma.JsonValue | null | undefined,
): ParsedMissionSlot[] {
  if (!slotsJson || typeof slotsJson !== 'object' || Array.isArray(slotsJson)) {
    return [];
  }

  for (const side of [
    MissionGameSide.BLUE,
    MissionGameSide.RED,
    MissionGameSide.GREEN,
  ]) {
    const slots = (slotsJson as Record<string, unknown>)[side];
    if (!Array.isArray(slots)) {
      continue;
    }

    return slots.filter(
      (slot): slot is ParsedMissionSlot =>
        typeof slot === 'object' && slot !== null,
    );
  }

  return [];
}

export function toPublicMissionSlots(
  slotsJson: Prisma.JsonValue | null | undefined,
): PublicMissionSlot[] {
  return extractSlotsArrayBySide(slotsJson).map((slot) => {
    const rawUnitName = slot.units?.[0]?.name;
    return {
      callsign: resolveSlotCallsign(slot.callsign, rawUnitName),
      name: rawUnitName ?? null,
      count: typeof slot.count === 'number' ? slot.count : null,
    };
  });
}

/** Replaces raw mission slot trees on a mission version with a compact public slot list. */
export function withPublicMissionSlots<
  T extends {
    missionAttackSlots?: Prisma.JsonValue | null;
    missionDefenceSlots?: Prisma.JsonValue | null;
    missionFriendlySlots?: Prisma.JsonValue | null;
  },
>(
  version: T,
): Omit<
  T,
  'missionAttackSlots' | 'missionDefenceSlots' | 'missionFriendlySlots'
> & { slots: PublicMissionSlots } {
  const {
    missionAttackSlots,
    missionDefenceSlots,
    missionFriendlySlots,
    ...rest
  } = version;

  return {
    ...rest,
    slots: {
      attack: toPublicMissionSlots(missionAttackSlots),
      defense: toPublicMissionSlots(missionDefenceSlots),
      friendly: toPublicMissionSlots(missionFriendlySlots),
    },
  };
}
