import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { findSecretLabels } from "./security-scan.mjs";

export const HISTORY_SCAN_LIMITS = Object.freeze({
  maximumObjects: 100_000,
  maximumBlobBytes: 2 * 1024 * 1024,
  maximumTextBytes: 64 * 1024 * 1024,
});

const BINARY_PATH_PATTERN =
  /\.(?:7z|avif|bin|bz2|db|dll|dylib|eot|exe|gif|gz|ico|jpe?g|mov|mp3|mp4|ogg|otf|pdf|png|sqlite3?|so|tar|ttf|wasm|webm|webp|woff2?|wav|xz|zip)$/i;
const OBJECT_LINE_PATTERN = /^([0-9a-f]{40,64})(?: (.*))?$/;
const OBJECT_METADATA_PATTERN = /^([0-9a-f]{40,64}) ([a-z]+) ([1-9]\d*|0)$/;
const decoder = new TextDecoder("utf-8", { fatal: true });

function replaceNonPrintable(value, replacement, asciiOnly) {
  return Array.from(String(value ?? ""), (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    const printable = asciiOnly
      ? codePoint >= 0x20 && codePoint <= 0x7e
      : codePoint >= 0x20 && codePoint !== 0x7f;
    return printable ? character : replacement;
  }).join("");
}

function sanitizedGitError(stderr) {
  const printable = replaceNonPrintable(stderr, " ", false).trim();
  return findSecretLabels(printable).length > 0
    ? "<redacted Git diagnostic>"
    : printable.slice(0, 400);
}

function runGit(cwd, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: options.encoding,
    input: options.input,
    maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`Unable to run Git history scan: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = sanitizedGitError(result.stderr);
    throw new Error(
      `Git history scan command failed${detail ? `: ${detail}` : "."}`,
    );
  }
  return result.stdout;
}

export function sanitizeHistoryPath(value) {
  const printable = replaceNonPrintable(value || "<unknown-path>", "?", true);
  if (findSecretLabels(printable).length > 0) return "<redacted-path>";
  return printable.slice(0, 240) || "<unknown-path>";
}

export function isBinaryBlob(bytes) {
  const sampleLength = Math.min(bytes.length, 8_192);
  for (let index = 0; index < sampleLength; index += 1) {
    if (bytes[index] === 0) return true;
  }
  try {
    decoder.decode(bytes);
    return false;
  } catch {
    return true;
  }
}

function enumerateReachableObjects(cwd, maximumObjects) {
  const output = runGit(cwd, ["rev-list", "--objects", "--all"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const objects = new Map();
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    const match = OBJECT_LINE_PATTERN.exec(line);
    if (!match) {
      throw new Error("Git returned an unparseable object-list record.");
    }
    const objectId = match[1];
    if (!objects.has(objectId)) {
      objects.set(objectId, sanitizeHistoryPath(match[2]));
      if (objects.size > maximumObjects) {
        throw new Error(
          `Git history contains more than the bounded ${maximumObjects} object limit.`,
        );
      }
    }
  }
  return objects;
}

function readObjectMetadata(cwd, objects) {
  if (objects.size === 0) return [];
  const input = `${[...objects.keys()].join("\n")}\n`;
  const output = runGit(
    cwd,
    ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    {
      encoding: "utf8",
      input,
      maxBuffer: Math.max(16 * 1024 * 1024, objects.size * 128),
    },
  );
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = OBJECT_METADATA_PATTERN.exec(line);
      if (!match) {
        throw new Error("Git returned an unparseable object-metadata record.");
      }
      return {
        objectId: match[1],
        type: match[2],
        size: Number(match[3]),
        path: objects.get(match[1]) ?? "<unknown-path>",
      };
    });
}

function readObjectBatch(cwd, objects, maximumOutputBytes) {
  if (objects.length === 0) return [];
  const output = runGit(cwd, ["cat-file", "--batch"], {
    input: Buffer.from(
      `${objects.map((object) => object.objectId).join("\n")}\n`,
    ),
    maxBuffer: maximumOutputBytes,
  });
  const records = [];
  let offset = 0;

  for (const expected of objects) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) {
      throw new Error("Git returned a truncated blob-batch header.");
    }
    const header = output.subarray(offset, headerEnd).toString("ascii");
    const match = OBJECT_METADATA_PATTERN.exec(header);
    if (
      !match ||
      match[1] !== expected.objectId ||
      match[2] !== expected.type ||
      Number(match[3]) !== expected.size
    ) {
      throw new Error("Git returned unexpected object-batch metadata.");
    }
    const bodyStart = headerEnd + 1;
    const bodyEnd = bodyStart + expected.size;
    if (bodyEnd >= output.length || output[bodyEnd] !== 0x0a) {
      throw new Error("Git returned a truncated Git object body.");
    }
    records.push({
      ...expected,
      bytes: output.subarray(bodyStart, bodyEnd),
    });
    offset = bodyEnd + 1;
  }

  if (offset !== output.length) {
    throw new Error("Git returned unexpected trailing object-batch data.");
  }
  return records;
}

export function formatHistoryFinding(finding) {
  return `${finding.path} (${finding.objectId.slice(0, 12)}): ${finding.label}`;
}

export async function scanGitHistory({
  cwd = process.cwd(),
  maximumObjects = HISTORY_SCAN_LIMITS.maximumObjects,
  maximumBlobBytes = HISTORY_SCAN_LIMITS.maximumBlobBytes,
  maximumTextBytes = HISTORY_SCAN_LIMITS.maximumTextBytes,
} = {}) {
  for (const [name, value] of Object.entries({
    maximumObjects,
    maximumBlobBytes,
    maximumTextBytes,
  })) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError(`${name} must be a positive safe integer.`);
    }
  }

  const shallowState = runGit(cwd, ["rev-parse", "--is-shallow-repository"], {
    encoding: "utf8",
  }).trim();
  if (shallowState !== "false") {
    throw new Error("Git history secret scan requires a non-shallow checkout.");
  }

  const objects = enumerateReachableObjects(cwd, maximumObjects);
  const metadata = readObjectMetadata(cwd, objects);
  const blobs = metadata.filter((entry) => entry.type === "blob");
  const scannableObjects = metadata
    .filter((entry) => ["blob", "commit", "tag"].includes(entry.type))
    .map((entry) => ({
      ...entry,
      path: entry.type === "blob" ? entry.path : `<${entry.type}-object>`,
    }));
  const candidates = [];
  let skippedBinaryPaths = 0;
  let candidateBytes = 0;

  for (const object of scannableObjects) {
    if (object.type === "blob" && BINARY_PATH_PATTERN.test(object.path)) {
      skippedBinaryPaths += 1;
      continue;
    }
    if (object.size > maximumBlobBytes) {
      throw new Error(
        `Text-like Git object ${object.objectId.slice(0, 12)} at ${object.path} exceeds the bounded ${maximumBlobBytes}-byte per-object limit.`,
      );
    }
    candidateBytes += object.size;
    if (candidateBytes > maximumTextBytes) {
      throw new Error(
        `Git history text candidates exceed the bounded ${maximumTextBytes}-byte total limit.`,
      );
    }
    candidates.push(object);
  }

  const batchOverhead = candidates.length * 128 + 1024 * 1024;
  const records = readObjectBatch(
    cwd,
    candidates,
    maximumTextBytes + batchOverhead,
  );
  const findings = [];
  let binaryContentBlobs = 0;
  let textBlobs = 0;
  let textObjects = 0;
  let scannedTextBytes = 0;

  for (const record of records) {
    if (isBinaryBlob(record.bytes)) {
      binaryContentBlobs += 1;
      continue;
    }
    const content = decoder.decode(record.bytes);
    textObjects += 1;
    if (record.type === "blob") textBlobs += 1;
    scannedTextBytes += record.size;
    for (const label of findSecretLabels(content)) {
      findings.push({
        objectId: record.objectId,
        path: record.path,
        label,
      });
    }
  }

  findings.sort(
    (first, second) =>
      first.path.localeCompare(second.path, "en") ||
      first.objectId.localeCompare(second.objectId, "en") ||
      first.label.localeCompare(second.label, "en"),
  );

  return {
    reachableObjects: objects.size,
    blobs: blobs.length,
    textObjects,
    textBlobs,
    scannedTextBytes,
    skippedBinaryBlobs: skippedBinaryPaths + binaryContentBlobs,
    findings,
  };
}

async function main() {
  const result = await scanGitHistory();
  if (
    result.reachableObjects === 0 &&
    ["1", "true"].includes((process.env.CI ?? "").toLowerCase())
  ) {
    throw new Error(
      "Git history secret scan found no reachable objects in CI.",
    );
  }
  if (result.findings.length > 0) {
    console.error(result.findings.map(formatHistoryFinding).join("\n"));
    console.error(
      `Git history secret scan found ${result.findings.length} potential credential signature(s); matched values are intentionally omitted.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Git history secret scan passed: ${result.reachableObjects} reachable objects, ${result.textObjects} text objects (${result.textBlobs} blobs), ${result.scannedTextBytes} text bytes; ${result.skippedBinaryBlobs} binary blobs skipped.`,
  );
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Git history secret scan failed without a safe diagnostic.",
    );
    process.exitCode = 1;
  }
}
