import {
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { UrlStore } from "./url-store";

export class S3UrlStore implements UrlStore {
  constructor(
    private readonly bucket: string,
    private readonly client: Pick<S3Client, "send"> = new S3Client({}),
  ) {}

  async hasCode(code: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: code,
        }),
      );

      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  async saveUrl(code: string, url: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: code,
        Body: url,
        ContentType: "text/plain; charset=utf-8",
      }),
    );
  }

  async getUrl(code: string): Promise<string | null> {
    try {
      const response = (await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: code,
        }),
      )) as {
        Body?: {
          transformToString?: () => Promise<string>;
        };
      };

      if (!response.Body?.transformToString) {
        throw new Error("S3 response body is missing");
      }

      return await response.Body.transformToString();
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }
}

function isNotFoundError(error: unknown): boolean {
  if (error instanceof NoSuchKey) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    $metadata?: { httpStatusCode?: number };
    Code?: string;
    code?: string;
    name?: string;
  };

  return (
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchKey" ||
    candidate.code === "NotFound" ||
    candidate.code === "NoSuchKey" ||
    candidate.Code === "NotFound" ||
    candidate.Code === "NoSuchKey" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}
