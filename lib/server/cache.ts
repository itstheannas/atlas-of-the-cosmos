export interface CachePolicy {
  readonly cacheControl: string;
  readonly etag: boolean;
}

export const NO_STORE_CACHE: CachePolicy = {
  cacheControl: "no-store",
  etag: false,
};

export const PUBLIC_METADATA_CACHE: CachePolicy = {
  cacheControl:
    "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
  etag: true,
};

export function stableHash(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let hash = 0x811c9dc5;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export async function createEtag(serializedBody: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serializedBody),
  );
  const hexadecimalDigest = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `"sha256-${hexadecimalDigest}"`;
}

function normalizeEntityTag(value: string): string {
  return value.trim().replace(/^W\//i, "");
}

export function requestAcceptsEtag(
  ifNoneMatch: string | null,
  etag: string,
): boolean {
  if (!ifNoneMatch) return false;
  const expected = normalizeEntityTag(etag);

  return ifNoneMatch
    .split(",")
    .map((candidate) => candidate.trim())
    .some(
      (candidate) =>
        candidate === "*" || normalizeEntityTag(candidate) === expected,
    );
}
