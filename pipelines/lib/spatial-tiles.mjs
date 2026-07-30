import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256Bytes } from "./integrity.mjs";
import { stableStringify } from "./deterministic-json.mjs";

export function equatorialTileAddress(
  rightAscensionDeg,
  declinationDeg,
  level,
) {
  if (
    !Number.isFinite(rightAscensionDeg) ||
    rightAscensionDeg < 0 ||
    rightAscensionDeg >= 360
  ) {
    throw new RangeError("Right ascension must be in [0, 360) degrees.");
  }
  if (
    !Number.isFinite(declinationDeg) ||
    declinationDeg < -90 ||
    declinationDeg > 90
  ) {
    throw new RangeError("Declination must be in [-90, +90] degrees.");
  }
  if (!Number.isInteger(level) || level < 0 || level > 12) {
    throw new RangeError("Tile level must be an integer from 0 through 12.");
  }
  const longitudeBins = 2 ** (level + 2);
  const latitudeBins = 2 ** (level + 1);
  const x = Math.min(
    longitudeBins - 1,
    Math.floor((rightAscensionDeg / 360) * longitudeBins),
  );
  const y = Math.min(
    latitudeBins - 1,
    Math.floor(((declinationDeg + 90) / 180) * latitudeBins),
  );
  return {
    level,
    x,
    y,
    key: `L${level}/x${x}/y${y}`,
    scheme: "equal-angle-equatorial-j2000",
  };
}

function previewRecord(object) {
  return {
    id: object.id,
    dataOrigin: object.dataOrigin,
    primaryName: object.names.primary,
    objectType: object.objectType,
    coordinate: object.coordinate,
    apparentMagnitude: object.properties.apparentMagnitude,
    sourceCatalogue: object.provenance[0].dataset,
  };
}

export function groupObjectsIntoTiles(objects, level) {
  const groups = new Map();
  for (const object of objects) {
    if (!object.coordinate || object.coordinate.kind !== "equatorial") continue;
    const address = equatorialTileAddress(
      object.coordinate.rightAscension.value,
      object.coordinate.declination.value,
      level,
    );
    const group = groups.get(address.key) ?? { address, objects: [] };
    group.objects.push(object);
    groups.set(address.key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      objects: group.objects.sort((first, second) =>
        first.id.localeCompare(second.id, "en"),
      ),
    }))
    .sort((first, second) =>
      first.address.key.localeCompare(second.address.key, "en"),
    );
}

export async function writeTileSet(outputRoot, objects, level, representation) {
  const groups = groupObjectsIntoTiles(objects, level);
  const artefacts = [];
  for (const group of groups) {
    const records =
      representation === "preview"
        ? group.objects.map(previewRecord)
        : group.objects;
    const payload = {
      schemaVersion: "1.0.0",
      dataOrigin: "catalogue",
      representation,
      tile: group.address,
      records,
    };
    // Tiles are stored as canonical uncompressed JSON so the committed
    // artifacts are byte-reproducible on any machine. Compressed output is
    // deliberately avoided: zlib builds emit different, equally valid bytes
    // across Node releases and CPU feature sets, which breaks the
    // regenerate-and-compare determinism gate. Transport compression is a
    // delivery concern owned by the host.
    const bytes = Buffer.from(stableStringify(payload), "utf8");
    const relativePath = join(
      representation,
      `L${level}`,
      `x${group.address.x}`,
      `y${group.address.y}.json`,
    );
    const absolutePath = join(outputRoot, relativePath);
    await mkdir(
      join(outputRoot, representation, `L${level}`, `x${group.address.x}`),
      {
        recursive: true,
      },
    );
    await writeFile(absolutePath, bytes);
    artefacts.push({
      path: relativePath.replaceAll("\\", "/"),
      mediaType: "application/json",
      sha256: sha256Bytes(bytes),
      byteLength: bytes.byteLength,
      recordCount: records.length,
      tile: group.address,
    });
  }
  return artefacts;
}
