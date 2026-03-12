export interface AppConfig {
  baseUrl: string;
  bucket: string;
  defaultRedirectUrl: string;
  maxGenerationAttempts: number;
  shortCodeLength: number;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }

  return parsed;
}

export function loadConfig(): AppConfig {
  return {
    baseUrl: getRequiredEnv("BASE_URL").replace(/\/+$/, ""),
    bucket: getRequiredEnv("BUCKET"),
    defaultRedirectUrl: getRequiredEnv("DEFAULT_REDIRECT_URL"),
    maxGenerationAttempts: getNumberEnv("MAX_GENERATION_ATTEMPTS", 10),
    shortCodeLength: getNumberEnv("SHORT_CODE_LENGTH", 6),
  };
}
