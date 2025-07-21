import { Injectable } from '@nestjs/common';
import { MinioClient } from 'nestjs-minio-client';
import { Readable } from 'node:stream';

@Injectable()
export class MinioService {
  constructor(private readonly minioClient: MinioClient) {}

  async uploadFile(file: File, name: string, bucketName: string) {
    const fileBuffer = await file.arrayBuffer();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${name}.${fileExtension}`;

    const stream = new Readable();
    stream.push(Buffer.from(fileBuffer));
    stream.push(null);

    await this.minioClient.putObject(bucketName, fileName, stream);
  }
}
