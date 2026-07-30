import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const lock = JSON.parse(
  await readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
);
function packageName(path, value) {
  if (typeof value.name === "string" && value.name.length > 0)
    return value.name;
  return path.split("node_modules/").at(-1);
}

function packageUrl(name, version) {
  const encodedName = name.startsWith("@")
    ? `${encodeURIComponent(name.slice(0, name.indexOf("/")))}/${encodeURIComponent(name.slice(name.indexOf("/") + 1))}`
    : encodeURIComponent(name);
  return `pkg:npm/${encodedName}@${version}`;
}

const componentsByReference = new Map();
for (const [path, value] of Object.entries(lock.packages ?? {})) {
  if (!path.includes("node_modules/") || !value?.version) continue;
  const name = packageName(path, value);
  if (!name) continue;
  const reference = packageUrl(name, value.version);
  if (componentsByReference.has(reference)) continue;

  const hashes = [];
  if (typeof value.integrity === "string") {
    const match = /^sha512-(.+)$/.exec(value.integrity);
    if (match) hashes.push({ alg: "SHA-512", content: match[1] });
  }
  componentsByReference.set(reference, {
    type: "library",
    name,
    version: value.version,
    "bom-ref": reference,
    purl: reference,
    ...(hashes.length > 0 ? { hashes } : {}),
    ...(typeof value.license === "string"
      ? { licenses: [{ expression: value.license }] }
      : {}),
    scope: value.dev ? "optional" : "required",
  });
}
const components = [...componentsByReference.values()].sort((first, second) =>
  first["bom-ref"].localeCompare(second["bom-ref"], "en"),
);

const serialSeed = JSON.stringify(
  components.map((component) => component["bom-ref"]),
);
const serialBytes = createHash("sha256")
  .update(serialSeed)
  .digest()
  .subarray(0, 16);
serialBytes[6] = (serialBytes[6] & 0x0f) | 0x50;
serialBytes[8] = (serialBytes[8] & 0x3f) | 0x80;
const serialNumber = serialBytes.toString("hex");
const document = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${serialNumber.slice(0, 8)}-${serialNumber.slice(8, 12)}-${serialNumber.slice(12, 16)}-${serialNumber.slice(16, 20)}-${serialNumber.slice(20, 32)}`,
  version: 1,
  metadata: {
    authors: [{ name: "Annas M. Ishtiaq" }],
    component: {
      type: "application",
      name: lock.name ?? "atlas-of-the-cosmos",
      version: lock.version ?? "0.1.0",
      copyright: "Copyright © 2026 Annas M. Ishtiaq. All rights reserved.",
    },
    tools: {
      components: [
        {
          type: "application",
          name: "Atlas deterministic SBOM generator",
          version: "1.0.0",
        },
      ],
    },
  },
  components,
};

const outputDirectory = new URL("../outputs/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  new URL("sbom.cdx.json", outputDirectory),
  `${JSON.stringify(document, null, 2)}\n`,
  "utf8",
);
console.log(
  `Wrote CycloneDX SBOM with ${components.length} components to outputs/sbom.cdx.json`,
);
