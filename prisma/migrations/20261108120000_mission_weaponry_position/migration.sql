-- AlterTable
ALTER TABLE "MissionWeaponry" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill: keep the current display order. Rows from one nested create can
-- share "createdAt", so physical order (ctid) breaks the tie.
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "missionVersionId"
      ORDER BY "createdAt" ASC, ctid ASC
    ) - 1 AS pos
  FROM "MissionWeaponry"
)
UPDATE "MissionWeaponry" AS weaponry
SET "position" = numbered.pos
FROM numbered
WHERE weaponry.id = numbered.id;
