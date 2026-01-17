-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "islandId" TEXT;

-- CreateTable
CREATE TABLE "Island" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Island_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Island_code_key" ON "Island"("code");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_islandId_fkey" FOREIGN KEY ("islandId") REFERENCES "Island"("id") ON DELETE SET NULL ON UPDATE CASCADE;
