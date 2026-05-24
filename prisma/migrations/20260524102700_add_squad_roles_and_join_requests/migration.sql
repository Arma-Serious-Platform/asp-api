-- CreateEnum
CREATE TYPE "SquadRole" AS ENUM ('MEMBER', 'HQ', 'SUBLEADER', 'RECRUIT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "squadRole" "SquadRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "SquadInvitation" ADD COLUMN "squadRole" "SquadRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "SquadJoinRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "status" "SquadInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadJoinRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SquadJoinRequest" ADD CONSTRAINT "SquadJoinRequest_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadJoinRequest" ADD CONSTRAINT "SquadJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
