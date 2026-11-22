ALTER TABLE "TribunalComplaint" ADD COLUMN "warningWeight" INTEGER;
ALTER TABLE "TribunalComplaint" ADD COLUMN "resolvedById" TEXT;

CREATE INDEX "TribunalComplaint_resolvedById_idx" ON "TribunalComplaint"("resolvedById");

ALTER TABLE "TribunalComplaint" ADD CONSTRAINT "TribunalComplaint_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
