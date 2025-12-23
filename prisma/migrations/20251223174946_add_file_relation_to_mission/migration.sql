-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
