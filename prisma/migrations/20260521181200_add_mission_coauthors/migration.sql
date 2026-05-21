-- CreateTable
CREATE TABLE "_MissionCoauthors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MissionCoauthors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MissionCoauthors_B_index" ON "_MissionCoauthors"("B");

-- AddForeignKey
ALTER TABLE "_MissionCoauthors" ADD CONSTRAINT "_MissionCoauthors_A_fkey" FOREIGN KEY ("A") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MissionCoauthors" ADD CONSTRAINT "_MissionCoauthors_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
