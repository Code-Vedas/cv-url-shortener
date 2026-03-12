import { randomInt } from "node:crypto";

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface ShortCodeOptions {
  exists: (code: string) => Promise<boolean>;
  length: number;
  maxAttempts: number;
}

export class ShortCodeGenerationError extends Error {
  constructor(message = "Unable to generate a unique short code") {
    super(message);
    this.name = "ShortCodeGenerationError";
  }
}

export function generateShortCode(length: number): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("Short code length must be a positive integer");
  }

  let result = "";

  for (let index = 0; index < length; index += 1) {
    result += ALPHABET[randomInt(ALPHABET.length)];
  }

  return result;
}

export async function createUniqueShortCode({
  exists,
  length,
  maxAttempts,
}: ShortCodeOptions): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateShortCode(length);

    if (!(await exists(code))) {
      return code;
    }
  }

  throw new ShortCodeGenerationError();
}
