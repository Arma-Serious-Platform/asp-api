import { UploadedFile, ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';

export const FILE_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  required?: boolean;
}

export function FileValidation(options: FileValidationOptions = {}): ParameterDecorator {
  const { maxSize = FILE_MAX_SIZE, required = true } = options;

  return UploadedFile(
    new ParseFilePipe({
      fileIsRequired: required,
      validators: [new MaxFileSizeValidator({ maxSize })],
    }),
  );
}


