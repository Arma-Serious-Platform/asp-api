-- CreateEnum
CREATE TYPE "SquadInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "SquadInvitation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "status" "SquadInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadInvitation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SquadInvitation" ADD CONSTRAINT "SquadInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadInvitation" ADD CONSTRAINT "SquadInvitation_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
