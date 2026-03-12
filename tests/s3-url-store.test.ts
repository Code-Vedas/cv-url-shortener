import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

import { S3UrlStore } from "../src/s3-url-store";

describe("S3UrlStore", () => {
  it("returns true when a code exists", async () => {
    const send = vi.fn().mockResolvedValue({});
    const store = new S3UrlStore("bucket-name", { send });

    await expect(store.hasCode("abc123")).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
  });

  it("returns false for not found head requests", async () => {
    const send = vi.fn().mockRejectedValue({
      name: "NotFound",
    });
    const store = new S3UrlStore("bucket-name", { send });

    await expect(store.hasCode("missing")).resolves.toBe(false);
  });

  it("writes urls as text/plain objects", async () => {
    const send = vi.fn().mockResolvedValue({});
    const store = new S3UrlStore("bucket-name", { send });

    await store.saveUrl("abc123", "https://example.com");

    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
  });

  it("reads stored urls from S3", async () => {
    const send = vi.fn().mockResolvedValue({
      Body: {
        transformToString: vi.fn().mockResolvedValue("https://example.com"),
      },
    });
    const store = new S3UrlStore("bucket-name", { send });

    await expect(store.getUrl("abc123")).resolves.toBe("https://example.com");
    expect(send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
  });

  it("returns null when a stored code is missing", async () => {
    const send = vi.fn().mockRejectedValue({
      $metadata: { httpStatusCode: 404 },
    });
    const store = new S3UrlStore("bucket-name", { send });

    await expect(store.getUrl("missing")).resolves.toBeNull();
  });
});
