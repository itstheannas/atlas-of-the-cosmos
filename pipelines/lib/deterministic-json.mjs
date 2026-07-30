import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function sortForJson(value) {
  if (Array.isArray(value)) return value.map(sortForJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([first], [second]) => first.localeCompare(second, "en"))
        .map(([key, item]) => [key, sortForJson(item)]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return `${JSON.stringify(sortForJson(value), null, 2)}\n`;
}

export async function writeStableJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stableStringify(value), "utf8");
}
