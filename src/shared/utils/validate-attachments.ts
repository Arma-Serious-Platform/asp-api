import { BadRequestException } from '@nestjs/common';
import { Multer } from 'multer';
import { isAllowedAttachmentFile } from './attachment-file-types';

export const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 10;

export const validateAttachmentFiles = (files: Multer.File[] = []) => {
  if (files.length > ATTACHMENT_MAX_COUNT) {
    throw new BadRequestException(`Maximum ${ATTACHMENT_MAX_COUNT} attachments allowed`);
  }

  const invalidType = files.find(
    (file) => !isAllowedAttachmentFile(file.originalname, file.mimetype),
  );
  if (invalidType) {
    throw new BadRequestException(
      `File type not allowed: ${invalidType.originalname ?? 'unknown'}`,
    );
  }

  const exceeded = files.find((file) => file.size > ATTACHMENT_MAX_SIZE);
  if (exceeded) {
    throw new BadRequestException(
      `File ${exceeded.originalname ?? 'unknown'} exceeds 10MB size limit`,
    );
  }
};
