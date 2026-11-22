ALTER TABLE "TribunalComplaint" ALTER COLUMN "ruleNumber" DROP NOT NULL;

CREATE TABLE "TribunalComplaintAttachment" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TribunalComplaintAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TribunalComplaintAttachment_complaintId_idx" ON "TribunalComplaintAttachment"("complaintId");

ALTER TABLE "TribunalComplaintAttachment" ADD CONSTRAINT "TribunalComplaintAttachment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "TribunalComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TribunalComplaintAttachment" ADD CONSTRAINT "TribunalComplaintAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TribunalComplaint" ADD COLUMN "assigneeId" TEXT;

CREATE INDEX "TribunalComplaint_assigneeId_idx" ON "TribunalComplaint"("assigneeId");

ALTER TABLE "TribunalComplaint" ADD CONSTRAINT "TribunalComplaint_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
