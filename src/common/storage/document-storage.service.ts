import { Injectable, Logger } from '@nestjs/common';

export interface UploadResult {
  key: string;
  url: string;
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

export interface DocumentStorageProvider {
  upload(file: Buffer, key: string, contentType?: string): Promise<UploadResult>;
  getPresignedUploadUrl(key: string, expiresInSeconds?: number): Promise<PresignedUrlResult>;
  getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<PresignedUrlResult>;
  delete(key: string): Promise<void>;
}

@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly isMock = !process.env.S3_BUCKET_NAME;

  async upload(file: Buffer, key: string, contentType?: string): Promise<UploadResult> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Uploading document: ${key} (${contentType || 'unknown'})`);
      return {
        key,
        url: `s3://${process.env.S3_BUCKET_NAME || 'mock-bucket'}/${key}`,
      };
    }

    // Production: AWS S3 SDK integration
    // const s3 = new S3Client({ region: process.env.AWS_REGION || 'me-central-1' });
    // const command = new PutObjectCommand({
    //   Bucket: process.env.S3_BUCKET_NAME,
    //   Key: key,
    //   Body: file,
    //   ContentType: contentType,
    //   ServerSideEncryption: 'aws:kms',
    // });
    // await s3.send(command);
    // return { key, url: `s3://${process.env.S3_BUCKET_NAME}/${key}` };

    throw new Error('S3 not configured. Set S3_BUCKET_NAME and AWS credentials.');
  }

  async getPresignedUploadUrl(key: string, expiresInSeconds = 3600): Promise<PresignedUrlResult> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Presigned upload URL: ${key} (expires in ${expiresInSeconds}s)`);
      return {
        url: `https://mock-presigned-url.example.com/upload/${key}?token=mock`,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      };
    }

    // Production: AWS S3 SDK presigned URL
    // const s3 = new S3Client({ region: process.env.AWS_REGION || 'me-central-1' });
    // const command = new PutObjectCommand({
    //   Bucket: process.env.S3_BUCKET_NAME,
    //   Key: key,
    // });
    // const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    // return { url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) };

    throw new Error('S3 not configured. Set S3_BUCKET_NAME and AWS credentials.');
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<PresignedUrlResult> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Presigned download URL: ${key} (expires in ${expiresInSeconds}s)`);
      return {
        url: `https://mock-presigned-url.example.com/download/${key}?token=mock`,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      };
    }

    // Production: AWS S3 SDK presigned URL
    // const s3 = new S3Client({ region: process.env.AWS_REGION || 'me-central-1' });
    // const command = new GetObjectCommand({
    //   Bucket: process.env.S3_BUCKET_NAME,
    //   Key: key,
    // });
    // const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    // return { url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000) };

    throw new Error('S3 not configured. Set S3_BUCKET_NAME and AWS credentials.');
  }

  async delete(key: string): Promise<void> {
    if (this.isMock) {
      this.logger.log(`[MOCK] Deleting document: ${key}`);
      return;
    }

    // Production: AWS S3 SDK DeleteObjectCommand
    throw new Error('S3 not configured. Set S3_BUCKET_NAME and AWS credentials.');
  }
}
