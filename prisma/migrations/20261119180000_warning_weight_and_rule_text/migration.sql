ALTER TABLE "UserWarning" ADD COLUMN "ruleNumber" TEXT;
ALTER TABLE "UserWarning" ADD COLUMN "weight" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "TribunalComplaint" ADD COLUMN "ruleText" TEXT;
