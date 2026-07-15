import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'minio';
import { PrismaService } from '../prisma/prisma.service';

import { Multer } from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import * as sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import { ASP_BUCKET } from './minio.lib';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);

  private readonly minioClient: Client;

  constructor(private readonly prisma: PrismaService) {
    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_PORT === '443',
      region: 'us-east-1',
      accessKey: process.env.MINIO_ROOT_USER,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  }

  private async convertImageToWebp(file: Multer.File) {
    const buffer = await sharp(file.buffer).webp().toBuffer();

    return buffer;
  }

  private buildPublicUrl(bucket: ASP_BUCKET, objectName: string): string {
    const isLocal = process.env.MINIO_ENDPOINT === 'localhost';
    const host = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    const proto = isLocal ? 'http' : 'https';
    const portPart = isLocal ? `:${port}` : '';
    return `${proto}://${host}${portPart}/${bucket}/${objectName}`;
  }

  private buildObjectName(file: Multer.File, id: string, extension: string, isWebpConversion: boolean): string {
    if (isWebpConversion) {
      return `${id}.${extension}`;
    }

    const safeOriginalName = (file.originalname as string)
      .replace(/[/\\]/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    return safeOriginalName;
  }

  private isBucketAlreadyOwnedError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'BucketAlreadyOwnedByYou'
    );
  }

  private async ensureBucket(bucket: ASP_BUCKET) {
    try {
      const exists = await this.minioClient
        .bucketExists(bucket)
        .catch(() => false);

      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };

      if (!exists) {
        this.logger.log(`Bucket "${bucket}" not found. Creating...`);
        try {
          await this.minioClient.makeBucket(bucket, 'us-east-1');
        } catch (error) {
          if (!this.isBucketAlreadyOwnedError(error)) {
            throw error;
          }
        }
      }

      await this.minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
    } catch (error) {
      this.logger.error('Failed to ensure bucket', error);
      throw new Error('Failed to ensure bucket');
    }
  }

  async uploadFile(bucket: ASP_BUCKET, file: Multer.File) {
    try {
      await this.ensureBucket(bucket);

      let buffer: Buffer = file.buffer as Buffer;

      const id = uuid();
      const detectedExtension = (await fileTypeFromBuffer(file.buffer))?.ext;
      
      // Fallback to original filename extension if file-type can't detect it
      const getExtensionFromFilename = (filename: string): string | undefined => {
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : undefined;
      };
      
      const fileExtension = detectedExtension || getExtensionFromFilename(file.originalname as string);
      const isWebpConversion = ['png', 'jpg', 'jpeg'].includes(
        fileExtension || '',
      );
      const extension = isWebpConversion ? 'webp' : fileExtension;

      if (isWebpConversion) {
        buffer = await this.convertImageToWebp(file);
      }

      if (!extension) throw new Error('Unsupported file type');

      const objectName = this.buildObjectName(file, id, extension, isWebpConversion);
      const url = this.buildPublicUrl(bucket, objectName);

      await this.minioClient.putObject(bucket, objectName, buffer);

      const dbFile = await this.prisma.file.create({
        select: {
          id: true,
          url: true,
          filename: true,
          bucket: true,
        },
        data: {
          id,
          bucket,
          filename: objectName,
          url,
        },
      });

      return dbFile;
    } catch (error) {
      this.logger.error('Failed to create file record', error);
      throw new Error('Failed to create file record');
    }
  }

  /**
   * Copies the object to another bucket (same object key), removes the old object,
   * and updates the File row (including `url`, which changes when the bucket changes).
   */
  async moveFileToBucket(fileId: string, targetBucket: ASP_BUCKET) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.bucket === targetBucket) {
      return file;
    }

    await this.ensureBucket(targetBucket);

    const sourceObject = `/${file.bucket}/${file.filename}`;
    const objectExists = await this.minioClient
      .statObject(file.bucket, file.filename)
      .then(() => true)
      .catch(() => false);

    if (objectExists) {
      await this.minioClient.copyObject(
        targetBucket,
        file.filename,
        sourceObject,
      );
      await this.minioClient.removeObject(file.bucket, file.filename);
    }

    return this.prisma.file.update({
      where: { id: fileId },
      data: {
        bucket: targetBucket,
        url: this.buildPublicUrl(targetBucket, file.filename),
      },
      select: {
        id: true,
        url: true,
        filename: true,
        bucket: true,
      },
    });
  }

  async deleteFile(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({ where: { id: fileId } });

      if (!file) {
        return true;
      }

      const exists = await this.minioClient
        .statObject(file.bucket, file.filename)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        await this.minioClient.removeObject(file.bucket, file.filename);
      } else {
        this.logger.warn(`File object missing in MinIO, deleting DB row only: ${file.bucket}/${file.filename}`);
      }

      await this.prisma.file.delete({ where: { id: fileId } });

      return true;
    } catch (error) {
      this.logger.error('Failed to delete file', error);
      throw new Error('Failed to delete file');
    }
  }

  async deleteFileRecord(fileId: string) {
    await this.prisma.file.delete({ where: { id: fileId } }).catch(() => null);
    return true;
  }
}
