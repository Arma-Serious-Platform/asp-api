import { BadRequestException } from '@nestjs/common';
import { Multer } from 'multer';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { normalizeJsonValue } from 'src/utils/normalize-json-value';
import { uploadAttachmentFiles, UploadedAttachmentInput } from './upload-attachments';
import { ATTACHMENT_MAX_COUNT } from './validate-attachments';

export type ExistingAttachment = {
  id: string;
  fileId: string;
};

export const parseRemovedAttachmentIds = (value: unknown): string[] => {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  const normalized = normalizeJsonValue({ value });
  if (Array.isArray(normalized)) {
    return normalized.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value];
  }

  return [];
};

export const validateAttachmentUpdateCount = (
  existing: ExistingAttachment[],
  removedAttachmentIds: string[],
  newFilesCount: number,
) => {
  const removedSet = new Set(removedAttachmentIds);
  const invalidRemoved = removedAttachmentIds.filter(
    (id) => !existing.some((attachment) => attachment.id === id),
  );

  if (invalidRemoved.length > 0) {
    throw new BadRequestException('One or more attachments to remove were not found');
  }

  const remainingCount = existing.filter((attachment) => !removedSet.has(attachment.id)).length;
  if (remainingCount + newFilesCount > ATTACHMENT_MAX_COUNT) {
    throw new BadRequestException(`Maximum ${ATTACHMENT_MAX_COUNT} attachments allowed`);
  }
};

export const syncAttachmentUpdates = async (options: {
  minioService: MinioService;
  existing: ExistingAttachment[];
  removedAttachmentIds: string[];
  newFiles: Multer.File[];
  deleteAttachment: (attachmentId: string) => Promise<unknown>;
}): Promise<UploadedAttachmentInput[]> => {
  const { minioService, existing, removedAttachmentIds, newFiles, deleteAttachment } = options;
  const removedSet = new Set(removedAttachmentIds);

  validateAttachmentUpdateCount(existing, removedAttachmentIds, newFiles.length);

  for (const attachment of existing) {
    if (!removedSet.has(attachment.id)) {
      continue;
    }

    await deleteAttachment(attachment.id);
    await minioService.deleteFile(attachment.fileId);
  }

  return uploadAttachmentFiles(minioService, newFiles);
};
