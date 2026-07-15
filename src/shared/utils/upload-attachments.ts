import { Multer } from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { ASP_BUCKET } from 'src/infrastructure/minio/minio.lib';

export type UploadedAttachmentInput = {
  fileId: string;
  originalName: string;
  mimeType: string | null;
};

export const uploadAttachmentFiles = async (
  minioService: MinioService,
  files: Multer.File[] = [],
): Promise<UploadedAttachmentInput[]> => {
  if (!files.length) {
    return [];
  }

  return Promise.all(
    files.map(async (file) => {
      const uploaded = await minioService.uploadFile(ASP_BUCKET.ATTACHMENTS, file);
      const detectedMime = (await fileTypeFromBuffer(file.buffer))?.mime;
      const mimeType = file.mimetype || detectedMime || null;

      return {
        fileId: uploaded.id,
        originalName: file.originalname,
        mimeType,
      };
    }),
  );
};

export const attachmentInclude = {
  attachments: {
    include: {
      file: {
        select: {
          id: true,
          url: true,
          filename: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
};
