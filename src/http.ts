export interface JsonResponseOptions {
  headers?: Record<string, string>;
}

export function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
  options: JsonResponseOptions = {},
) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...options.headers,
    },
    body: JSON.stringify(body),
  };
}

export function redirectResponse(location: string) {
  return {
    statusCode: 301,
    headers: {
      Location: location,
    },
    body: "",
  };
}
