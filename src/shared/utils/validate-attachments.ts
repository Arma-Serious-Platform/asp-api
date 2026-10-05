import { BadRequestException } from '@nestjs/common';
import { Multer } from 'multer';
import { isAllowedAttachmentFile } from './file-signature';

export const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 10;

export const validateAttachmentFiles = async (files: Multer.File[] = []) => {
  if (files.length > ATTACHMENT_MAX_COUNT) {
    throw new BadRequestException(
      `Maximum ${ATTACHMENT_MAX_COUNT} attachments allowed`,
    );
  }

  const exceeded = files.find((file) => file.size > ATTACHMENT_MAX_SIZE);
  if (exceeded) {
    throw new BadRequestException(
      `File ${exceeded.originalname ?? 'unknown'} exceeds 10MB size limit`,
    );
  }

  for (const file of files) {
    if (!(await isAllowedAttachmentFile(file))) {
      throw new BadRequestException(
        `File type not allowed: ${file.originalname ?? 'unknown'}`,
      );
    }
  }
};
