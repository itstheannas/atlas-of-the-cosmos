import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import sharp from "sharp";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const defaultImageUrl = new URL("../public/og.png", import.meta.url);

export function pngChunkTypes(image) {
  if (
    !Buffer.isBuffer(image) ||
    image.length < PNG_SIGNATURE.length ||
    !image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw new Error("Social image has an invalid PNG signature.");
  }
  const types = [];
  let offset = 8;
  while (offset < image.length) {
    if (image.length - offset < 12) {
      throw new Error("Social image has a truncated PNG chunk header.");
    }
    const length = image.readUInt32BE(offset);
    const type = image.subarray(offset + 4, offset + 8).toString("ascii");
    if (!/^[A-Za-z]{4}$/.test(type)) {
      throw new Error("Social image has an invalid PNG chunk type.");
    }
    if (type === "IEND" && length !== 0) {
      throw new Error("Social image has a malformed non-empty IEND chunk.");
    }
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > image.length) {
      throw new Error(`Social image has a truncated ${type} PNG chunk.`);
    }
    types.push(type);
    offset = chunkEnd;
    if (type === "IEND") {
      if (offset !== image.length) {
        throw new Error("Social image has bytes after its IEND chunk.");
      }
      return types;
    }
  }
  throw new Error("Social image is missing its required IEND chunk.");
}

export async function sanitizeSocialImage(imageUrl = defaultImageUrl) {
  const original = await readFile(imageUrl);
  const metadata = await sharp(original).metadata();

  if (
    metadata.format !== "png" ||
    metadata.width !== 1730 ||
    metadata.height !== 909
  ) {
    throw new Error("Social image must remain the reviewed 1730 x 909 PNG.");
  }

  const chunkTypes = pngChunkTypes(original);
  const reviewedChunkTypes = new Set(["IHDR", "pHYs", "IDAT", "IEND"]);
  const alreadySanitized =
    chunkTypes[0] === "IHDR" &&
    chunkTypes.at(-1) === "IEND" &&
    chunkTypes.every((type) => reviewedChunkTypes.has(type));

  if (alreadySanitized) {
    process.stdout.write(
      `Verified public/og.png contains only reviewed image-data chunks at ${metadata.width} x ${metadata.height} pixels.\n`,
    );
    return;
  }

  const originalPixels = await sharp(original).ensureAlpha().raw().toBuffer();
  const sanitized = await sharp(original)
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      palette: false,
    })
    .toBuffer();
  const sanitizedPixels = await sharp(sanitized).ensureAlpha().raw().toBuffer();

  if (!originalPixels.equals(sanitizedPixels)) {
    throw new Error("Metadata sanitization changed the reviewed image pixels.");
  }

  pngChunkTypes(sanitized);
  await writeFile(imageUrl, sanitized);
  process.stdout.write(
    `Sanitized public/og.png metadata without changing ${metadata.width} x ${metadata.height} pixels.\n`,
  );
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (entryPoint === import.meta.url) {
  await sanitizeSocialImage();
}
