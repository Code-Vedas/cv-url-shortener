import { describe, expect, it, vi } from "vitest";

import {
  createUniqueShortCode,
  generateShortCode,
  ShortCodeGenerationError,
} from "../src/short-code";

describe("generateShortCode", () => {
  it("returns a code with the requested length", () => {
    expect(generateShortCode(8)).toHaveLength(8);
  });

  it("throws for invalid lengths", () => {
    expect(() => generateShortCode(0)).toThrow(
      "Short code length must be a positive integer",
    );
  });
});

describe("createUniqueShortCode", () => {
  it("retries when a generated code already exists", async () => {
    const exists = vi
      .fn<(_: string) => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const code = await createUniqueShortCode({
      exists,
      length: 6,
      maxAttempts: 3,
    });

    expect(code).toHaveLength(6);
    expect(exists).toHaveBeenCalledTimes(2);
  });

  it("fails after the configured number of attempts", async () => {
    await expect(
      createUniqueShortCode({
        exists: vi.fn().mockResolvedValue(true),
        length: 4,
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(ShortCodeGenerationError);
  });
});
