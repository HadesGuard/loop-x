/**
 * Convert a shelby:// URL to an HTTP(S) URL using a configured CDN or gateway base.
 *
 * Input formats:
 *   shelby://<account>/<blobPath>
 *
 * Env vars used (first non-empty is used):
 *   - SHELBY_CDN_BASE_URL        e.g. https://your-zone.b-cdn.net
 *   - SHELBY_GATEWAY_BASE_URL    e.g. https://api.shelbynet.shelby.xyz/shelby
 *
 * For CDN, path is:        /v1/blobs/<account>/<blobPath>
 * For gateway, path is:    /v1/blobs/<account>/<blobPath>
 * (Note: Bunny CDN example requires dropping "/shelby" segment in origin URL; this
 * is handled by providing the CDN base URL without "/shelby".)
 */
export function shelbyToHttpUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  if (!input.startsWith('shelby://')) return input;

  const match = input.match(/^shelby:\/\/([^\/]+)\/(.+)$/);
  if (!match) return input;

  const account = match[1];
  const blobPath = match[2];

  const cdnBase = (process.env.SHELBY_CDN_BASE_URL || '').trim().replace(/\/$/, '');
  const gatewayBase = (process.env.SHELBY_GATEWAY_BASE_URL || '').trim().replace(/\/$/, '');

  const base = cdnBase || gatewayBase;
  if (!base) return input; // No mapping configured

  return `${base}/v1/blobs/${account}/${blobPath}`;
}

/**
 * Idempotent helper: apply HTTP mapping to a possibly-null value.
 */
export function toPublicMediaUrl(url: string | null | undefined): string | null {
  const mapped = shelbyToHttpUrl(url);
  return mapped ?? null;
}

