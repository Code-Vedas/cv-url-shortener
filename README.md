# cv-url-shortener

Serverless AWS Lambda URL shortener backed by S3. It exposes:

- `POST /` to create a short URL. This route is protected with an API key.
- `GET /{short_code}` to issue a `301` redirect to the stored URL.
- A default fallback redirect when a short code is missing or unknown.

## Quick Start

1. Use Node.js 20.
2. Install dependencies with `yarn install`.
3. Copy `serverless.yml.example` to `serverless.yml`.
4. Replace the placeholder values in `serverless.yml`:
   - `bucket`
   - `baseUrl` (`BASE_URL`; this must be the deployed API Gateway URL unless you have already mapped a custom domain)
   - `defaultRedirectUrl`
   - `apiKeyName`
   - `profile`
   - `region`
   - `stage`
5. Deploy with `yarn serverless deploy` or `npx serverless deploy`.
6. Set `BASE_URL` to the deployed API Gateway invoke URL. Only change it after you have configured a custom domain that points to the same deployment.

## Local Quality Checks

- `yarn typecheck`
- `yarn lint`
- `yarn test`
- `yarn build`

## Configuration

The Lambda functions receive these environment variables through Serverless:

| Variable                  | Required | Description                                                           |
| ------------------------- | -------- | --------------------------------------------------------------------- |
| `BUCKET`                  | Yes      | S3 bucket used to store short-code objects.                           |
| `BASE_URL`                | Yes      | Public base URL returned in `shortUrl`, for example `https://sho.rt`. |
| `DEFAULT_REDIRECT_URL`    | Yes      | Redirect target used when a code is missing or unknown.               |
| `SHORT_CODE_LENGTH`       | No       | Length of generated codes. Default: `6`.                              |
| `MAX_GENERATION_ATTEMPTS` | No       | Max collision retries before returning a failure. Default: `10`.      |

`BASE_URL` is the public short-link domain returned in `shortUrl`. It must match the deployed API Gateway invoke URL until a custom domain is mapped to that deployment. For example, if `BASE_URL=https://sho.rt`, successful create requests return links such as `https://sho.rt/a1B2c3`.

## API Examples

### Create a short URL

Request:

```bash
curl --request POST \
  --url "https://your-api-id.execute-api.us-east-1.amazonaws.com/production/" \
  --header "Content-Type: application/json" \
  --header "x-api-key: YOUR_API_KEY" \
  --data '{"url":"https://www.example.com/articles/introducing-url-shortener"}'
```

Success response:

```json
{
  "longUrl": "https://www.example.com/articles/introducing-url-shortener",
  "shortUrl": "https://sho.rt/a1B2c3"
}
```

Validation failures:

- `400` when the request body is missing or not valid JSON.
- `422` when `url` is missing or is not a valid `http`/`https` URL.
- `500` when the service cannot store the new URL.
- `503` when unique code generation exhausts the configured retry budget.

Example invalid request response:

```json
{
  "message": "url must be a valid http or https URL"
}
```

### Redirect to the original URL

Request:

```bash
curl --include \
  --request GET \
  --url "https://sho.rt/a1B2c3"
```

`https://sho.rt` in this example is `BASE_URL`. If no custom domain is configured, `BASE_URL` should be the API Gateway invoke URL instead.

Response:

```http
HTTP/1.1 301 Moved Permanently
Location: https://www.example.com/articles/introducing-url-shortener
```

When the code is not found, the service still returns `301`, but the `Location` header points to `DEFAULT_REDIRECT_URL`.

## Deployment Notes

- `POST /` is configured as a private API Gateway route, so callers need a valid API key.
- Create the S3 bucket before deploying.
- A fresh `serverless deploy` gives you an API Gateway invoke URL, and `BASE_URL` should point to that URL until a custom domain is configured.
- After deployment, configure a custom domain in API Gateway and map the base path to `/` if you want a branded short domain.
- Keep `BASE_URL` aligned with the public domain you expose to clients; otherwise generated `shortUrl` values will be incorrect.
