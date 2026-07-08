import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { S3Config } from '../config/configuration';

export interface PresignedPutParams {
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
}

export interface PresignedGetParams {
  key: string;
  expiresInSeconds?: number;
  downloadFileName?: string;
}

export interface ObjectMetadata {
  contentLength: number;
  contentType?: string;
  etag?: string;
  versionId?: string;
  lastModified?: Date;
}

/**
 * S3 storage for document originals (Cloud.ru S3-compatible).
 *
 * POLICY: this service intentionally has NO deleteObject method. Physical
 * deletion of objects is forbidden — deletions are soft deletes in PostgreSQL.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly cfg: S3Config;
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {
    this.cfg = this.config.getOrThrow<S3Config>('s3');
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.endpoint && this.cfg.bucket && this.cfg.accessKeyId && this.cfg.secretAccessKey);
  }

  get bucket(): string {
    if (!this.cfg.bucket) {
      throw new ServiceUnavailableException('S3 bucket is not configured');
    }
    return this.cfg.bucket;
  }

  private getClient(): S3Client {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('S3 storage is not configured (setup_required)');
    }
    if (!this.client) {
      this.client = new S3Client({
        endpoint: this.cfg.endpoint,
        region: this.cfg.region,
        forcePathStyle: this.cfg.forcePathStyle,
        credentials: {
          accessKeyId: this.cfg.accessKeyId as string,
          secretAccessKey: this.cfg.secretAccessKey as string,
        },
      });
    }
    return this.client;
  }

  createPresignedPutUrl(params: PresignedPutParams): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
    });
    return getSignedUrl(this.getClient(), command, {
      expiresIn: params.expiresInSeconds ?? this.cfg.presignedUrlTtlSeconds,
    });
  }

  createPresignedGetUrl(params: PresignedGetParams): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ResponseContentDisposition: params.downloadFileName
        ? `attachment; filename="${params.downloadFileName}"`
        : undefined,
    });
    return getSignedUrl(this.getClient(), command, {
      expiresIn: params.expiresInSeconds ?? this.cfg.presignedUrlTtlSeconds,
    });
  }

  async headObject(key: string): Promise<ObjectMetadata> {
    const out = await this.getClient().send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      contentLength: out.ContentLength ?? 0,
      contentType: out.ContentType,
      etag: out.ETag,
      versionId: out.VersionId,
      lastModified: out.LastModified,
    };
  }

  async getObjectMetadata(key: string): Promise<ObjectMetadata> {
    return this.headObject(key);
  }

  /** Download an object's bytes (used to forward file content to Dify). */
  async getObjectBytes(key: string): Promise<Uint8Array> {
    const out = await this.getClient().send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!out.Body) {
      throw new Error(`Object ${key} has no body`);
    }
    return out.Body.transformToByteArray();
  }

  async copyObject(sourceKey: string, destKey: string): Promise<void> {
    await this.getClient().send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destKey,
      }),
    );
  }
}
