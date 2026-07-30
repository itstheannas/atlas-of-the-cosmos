import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function sha256File(path) {
  return sha256Bytes(await readFile(path));
}

export async function verifySha256(path, expected) {
  const actual = await sha256File(path);
  if (actual !== expected) {
    throw new Error(
      `Integrity check failed for ${path}: expected ${expected}, received ${actual}`,
    );
  }
  return actual;
}
