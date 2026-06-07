-- CreateEnum
CREATE TYPE "State" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Mission"
ADD COLUMN "state" "State" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Mission"
ALTER COLUMN "description" DROP NOT NULL;

ALTER TABLE "Mission"
ALTER COLUMN "description" TYPE JSONB
USING CASE
  WHEN "description" IS NULL THEN NULL
  WHEN "description" = '' THEN NULL
  ELSE jsonb_build_object(
    'root', jsonb_build_object(
      'children', jsonb_build_array(
        jsonb_build_object(
          'children', jsonb_build_array(
            jsonb_build_object(
              'detail', 0,
              'format', 0,
              'mode', 'normal',
              'style', '',
              'text', "description",
              'type', 'text',
              'version', 1
            )
          ),
          'direction', NULL,
          'format', '',
          'indent', 0,
          'type', 'paragraph',
          'version', 1,
          'textFormat', 0,
          'textStyle', ''
        )
      ),
      'direction', NULL,
      'format', '',
      'indent', 0,
      'type', 'root',
      'version', 1
    )
  )
END;

-- AlterTable
ALTER TABLE "MissionVersion"
ADD COLUMN "changelog" JSONB,
ADD COLUMN "inGameTime" TIMESTAMP(3),
ADD COLUMN "weather" TEXT;
