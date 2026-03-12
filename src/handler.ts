import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

import { loadConfig, type AppConfig } from "./config";
import { jsonResponse, redirectResponse } from "./http";
import { createUniqueShortCode, ShortCodeGenerationError } from "./short-code";
import { S3UrlStore } from "./s3-url-store";
import type { UrlStore } from "./url-store";

export interface HandlerDependencies {
  config: AppConfig;
  urlStore: UrlStore;
}

interface CreateShortUrlRequest {
  url: string;
}

export function buildHandlers({ config, urlStore }: HandlerDependencies) {
  return {
    index: async (
      event: APIGatewayProxyEvent,
      _context: Context,
    ): Promise<APIGatewayProxyResult> => {
      const shortCode = event.pathParameters?.short_code?.trim();

      if (!shortCode) {
        return redirectResponse(config.defaultRedirectUrl);
      }

      const destination = await urlStore.getUrl(shortCode);

      return redirectResponse(destination ?? config.defaultRedirectUrl);
    },
    create: async (
      event: Pick<APIGatewayProxyEvent, "body">,
      _context: Context,
    ): Promise<APIGatewayProxyResult> => {
      const parsedRequest = parseCreateRequest(event.body);

      if (!parsedRequest.ok) {
        return jsonResponse(parsedRequest.statusCode, {
          message: parsedRequest.message,
        });
      }

      try {
        const shortCode = await createUniqueShortCode({
          exists: (code) => urlStore.hasCode(code),
          length: config.shortCodeLength,
          maxAttempts: config.maxGenerationAttempts,
        });

        await urlStore.saveUrl(shortCode, parsedRequest.url);

        return jsonResponse(201, {
          longUrl: parsedRequest.url,
          shortUrl: `${config.baseUrl}/${shortCode}`,
        });
      } catch (error) {
        if (error instanceof ShortCodeGenerationError) {
          return jsonResponse(503, {
            message: "failed to create unique short url",
          });
        }

        return jsonResponse(500, {
          message: "failed to create short url",
        });
      }
    },
  };
}

type ParsedCreateRequest =
  | { ok: true; url: string }
  | { message: string; ok: false; statusCode: number };

export function parseCreateRequest(body: string | null): ParsedCreateRequest {
  if (!body) {
    return {
      ok: false,
      statusCode: 400,
      message: "request body is required",
    };
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(body) as unknown;
  } catch {
    return {
      ok: false,
      statusCode: 400,
      message: "request body must be valid JSON",
    };
  }

  const url = (parsedBody as CreateShortUrlRequest | undefined)?.url?.trim();

  if (!url) {
    return {
      ok: false,
      statusCode: 422,
      message: "url is required",
    };
  }

  if (!isValidHttpUrl(url)) {
    return {
      ok: false,
      statusCode: 422,
      message: "url must be a valid http or https URL",
    };
  }

  return {
    ok: true,
    url,
  };
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createDefaultHandlers() {
  const config = loadConfig();

  return buildHandlers({
    config,
    urlStore: new S3UrlStore(config.bucket),
  });
}

export async function index(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  return createDefaultHandlers().index(event, context);
}

export async function create(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  return createDefaultHandlers().create(event, context);
}
