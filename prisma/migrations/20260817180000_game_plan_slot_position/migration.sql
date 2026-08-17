ALTER TABLE "GamePlanSlot" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "gamePlanId"
      ORDER BY "slotNumber" ASC, "createdAt" ASC, id ASC
    ) - 1 AS pos
  FROM "GamePlanSlot"
)
UPDATE "GamePlanSlot" AS slot
SET "position" = numbered.pos
FROM numbered
WHERE slot.id = numbered.id;
