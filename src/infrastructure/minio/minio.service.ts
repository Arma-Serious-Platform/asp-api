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
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  }

  private async convertImageToWebp(file: Multer.File) {
    const buffer = await sharp(file.buffer).webp().toBuffer();

    return buffer;
  }

  private async ensureBucket(bucket: ASP_BUCKET) {
    try {
      const exists = await this.minioClient
        .bucketExists(bucket)
        .catch(() => false);
      if (!exists) {
        this.logger.log(`Bucket "${bucket}" not found. Creating...`);
        await this.minioClient.makeBucket(bucket, 'us-east-1');

        // Apply public-read policy
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

        await this.minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
      }
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
      
      const fileExtension = detectedExtension || getExtensionFromFilename(file.originalname);
      const isWebpConversion = ['png', 'jpg', 'jpeg'].includes(
        fileExtension || '',
      );
      const extension = isWebpConversion ? 'webp' : fileExtension;

      if (isWebpConversion) {
        buffer = await this.convertImageToWebp(file);
      }
      const objectName = `${id}.${extension}`;
      const url = `https://${process.env.MINIO_ENDPOINT}/${bucket}/${objectName}`;

      if (!extension) throw new Error('Unsupported file type');

      await this.minioClient.putObject(bucket, objectName, buffer);

      const dbFile = await this.prisma.file.create({
        select: {
          id: true,
          url: true,
          filename: true,
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

  async deleteFile(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({ where: { id: fileId } });

      if (!file) {
        return true;
      }

      const exists = await this.minioClient.statObject(
        file.bucket,
        file.filename,
      );

      if (exists) {
        await this.minioClient.removeObject(file.bucket, file.filename);
      }

      await this.prisma.file.delete({ where: { id: fileId } });

      return true;
    } catch (error) {
      this.logger.error('Failed to delete file', error);
      throw new Error('Failed to delete file');
    }
  }
}
