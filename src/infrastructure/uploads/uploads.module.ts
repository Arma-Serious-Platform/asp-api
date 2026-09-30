import { Global, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

export const UPLOAD_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Multer enforces this while a file streams in, before it is buffered in
// memory; endpoint validators apply tighter limits (e.g. 5MB avatars) after.
// Global so every FileInterceptor/FilesInterceptor picks the options up.
@Global()
@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: UPLOAD_MAX_FILE_SIZE },
    }),
  ],
  exports: [MulterModule],
})
export class UploadsModule {}
