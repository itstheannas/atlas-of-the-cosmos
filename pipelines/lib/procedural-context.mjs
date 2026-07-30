function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (const character of text) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function rounded(value) {
  return Number(value.toFixed(8));
}

export function generateProceduralStarContext(seed, pointCount = 64) {
  if (typeof seed !== "string" || seed.length === 0) {
    throw new TypeError("Procedural seed must be a non-empty string.");
  }
  if (!Number.isInteger(pointCount) || pointCount < 0 || pointCount > 100_000) {
    throw new RangeError(
      "Procedural point count must be an integer from 0 to 100,000.",
    );
  }
  const random = mulberry32(fnv1a32(seed));
  const points = Array.from({ length: pointCount }, () => {
    const z = 2 * random() - 1;
    const azimuth = 2 * Math.PI * random();
    const radial = Math.sqrt(Math.max(0, 1 - z * z));
    const intensity = Math.min(1, 0.04 / Math.max(0.04, random() ** 1.8));
    const temperature = 2_500 + 7_500 * random() ** 2.2;
    return {
      direction: {
        x: {
          value: rounded(radial * Math.cos(azimuth)),
          unit: "dimensionless",
        },
        y: {
          value: rounded(radial * Math.sin(azimuth)),
          unit: "dimensionless",
        },
        z: { value: rounded(z), unit: "dimensionless" },
      },
      relativeIntensity: {
        value: rounded(intensity),
        unit: "dimensionless",
      },
      colourTemperature: {
        quantity: { value: Math.round(temperature), unit: "K" },
        status: "modelled",
        method: "Seeded illustrative distribution; not a stellar measurement.",
        caveat: "Used only to colour non-catalogued background context.",
      },
    };
  });

  return {
    batchId: `procedural-background-${fnv1a32(seed).toString(16).padStart(8, "0")}`,
    dataOrigin: "procedural",
    kind: "background-stars",
    generator: {
      name: "atlas-seeded-context",
      version: "1.0.0",
      seed,
      distribution:
        "Uniform direction on a unit sphere; illustrative intensity and colour-temperature distributions.",
    },
    label: "Procedural background stars",
    disclaimer:
      "Illustrative context only. Points are not catalogue objects and have no scientific identifiers.",
    layerCanBeDisabled: true,
    points,
  };
}
