import type { Context } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

import { buildHandlers, parseCreateRequest } from "../src/handler";
import type { AppConfig } from "../src/config";
import type { UrlStore } from "../src/url-store";

const config: AppConfig = {
  baseUrl: "https://sho.rt",
  bucket: "bucket-name",
  defaultRedirectUrl: "https://example.com/fallback",
  maxGenerationAttempts: 3,
  shortCodeLength: 6,
};

const context = {} as Context;

function createStore(overrides: Partial<UrlStore> = {}): UrlStore {
  return {
    getUrl: vi.fn().mockResolvedValue(null),
    hasCode: vi.fn().mockResolvedValue(false),
    saveUrl: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("parseCreateRequest", () => {
  it("rejects malformed JSON", () => {
    expect(parseCreateRequest("{")).toEqual({
      ok: false,
      statusCode: 400,
      message: "request body must be valid JSON",
    });
  });

  it("rejects missing urls", () => {
    expect(parseCreateRequest(JSON.stringify({}))).toEqual({
      ok: false,
      statusCode: 422,
      message: "url is required",
    });
  });

  it("rejects invalid urls", () => {
    expect(
      parseCreateRequest(JSON.stringify({ url: "ftp://example.com" })),
    ).toEqual({
      ok: false,
      statusCode: 422,
      message: "url must be a valid http or https URL",
    });
  });
});

describe("buildHandlers", () => {
  it("creates short urls for valid requests", async () => {
    const urlStore = createStore();
    const handlers = buildHandlers({ config, urlStore });

    const response = await handlers.create(
      {
        body: JSON.stringify({ url: "https://example.com/articles/1" }),
      },
      context,
    );

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({
      longUrl: "https://example.com/articles/1",
    });
    expect(JSON.parse(response.body).shortUrl).toMatch(
      /^https:\/\/sho\.rt\/.+/u,
    );
    expect(urlStore.saveUrl).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when the request body is missing", async () => {
    const handlers = buildHandlers({ config, urlStore: createStore() });

    const response = await handlers.create({ body: null }, context);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: "request body is required",
    });
  });

  it("returns 422 for invalid urls", async () => {
    const handlers = buildHandlers({ config, urlStore: createStore() });

    const response = await handlers.create(
      {
        body: JSON.stringify({ url: "not-a-url" }),
      },
      context,
    );

    expect(response.statusCode).toBe(422);
    expect(JSON.parse(response.body)).toEqual({
      message: "url must be a valid http or https URL",
    });
  });

  it("redirects known codes", async () => {
    const handlers = buildHandlers({
      config,
      urlStore: createStore({
        getUrl: vi.fn().mockResolvedValue("https://example.com/landing"),
      }),
    });

    const response = await handlers.index(
      {
        pathParameters: { short_code: "abc123" },
      } as never,
      context,
    );

    expect(response).toEqual({
      statusCode: 301,
      headers: {
        Location: "https://example.com/landing",
      },
      body: "",
    });
  });

  it("falls back to the default redirect for unknown codes", async () => {
    const handlers = buildHandlers({ config, urlStore: createStore() });

    const response = await handlers.index(
      {
        pathParameters: { short_code: "missing" },
      } as never,
      context,
    );

    expect(response).toEqual({
      statusCode: 301,
      headers: {
        Location: "https://example.com/fallback",
      },
      body: "",
    });
  });
});
