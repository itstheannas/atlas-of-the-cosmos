import assert from "node:assert/strict";
import test from "node:test";

import {
  analyseComparisonRow,
  canonicaliseComparisonValue,
  linearComparisonFraction,
  linearDiameterScale,
  logarithmicComparisonFraction,
} from "../../lib/comparison-science.ts";

const fact = (value, unit, label = "Test value") => ({
  label,
  value,
  unit,
  display: `${value} ${unit}`,
  status: "observed",
  sourceId: "test-source",
});

test("compatible values are canonicalised before linear ratios", () => {
  const earth = canonicaliseComparisonValue(fact(1, "earth-mass", "Mass"));
  const sun = canonicaliseComparisonValue(fact(1, "solar-mass", "Mass"));
  const analysis = analyseComparisonRow([earth, sun]);

  assert.equal(analysis.kind, "comparable");
  assert.equal(analysis.canonicalUnit, "kg");
  assert.ok(
    Math.abs(
      linearComparisonFraction(earth, analysis) - 5.9722e24 / 1.98847e30,
    ) < 1e-15,
  );
  assert.equal(linearComparisonFraction(sun, analysis), 1);
});

test("equivalent distance units occupy the same canonical scale", () => {
  const astronomicalUnits = canonicaliseComparisonValue(
    fact(1, "au", "Distance"),
  );
  const kilometres = canonicaliseComparisonValue(
    fact(149_597_870.7, "km", "Distance"),
  );
  const analysis = analyseComparisonRow([astronomicalUnits, kilometres]);

  assert.equal(analysis.kind, "comparable");
  assert.equal(analysis.dimension, "length");
  assert.equal(linearComparisonFraction(astronomicalUnits, analysis), 1);
  assert.equal(linearComparisonFraction(kilometres, analysis), 1);
  assert.equal(logarithmicComparisonFraction(astronomicalUnits, analysis), 1);
});

test("mixed physical dimensions never receive a plotted ratio", () => {
  const distance = canonicaliseComparisonValue(
    fact(46.5e9, "light-year", "Present comoving radius"),
  );
  const lookbackTime = canonicaliseComparisonValue(
    fact(13.8, "billion-year", "Lookback time"),
  );
  const analysis = analyseComparisonRow([distance, lookbackTime]);

  assert.deepEqual(analysis, {
    kind: "incompatible",
    dimensions: ["length", "duration"],
  });
  assert.equal(linearComparisonFraction(distance, analysis), undefined);
  assert.equal(
    logarithmicComparisonFraction(lookbackTime, analysis),
    undefined,
  );
});

test("nonlinear magnitude values are displayed but never ratio-normalised", () => {
  const bright = canonicaliseComparisonValue(
    fact(-1.46, "apparent-magnitude", "Apparent magnitude"),
  );
  const faint = canonicaliseComparisonValue(
    fact(8.4, "apparent-magnitude", "Apparent magnitude"),
  );
  const analysis = analyseComparisonRow([bright, faint]);

  assert.deepEqual(analysis, { kind: "non-ratio", dimension: "magnitude" });
  assert.equal(linearComparisonFraction(bright, analysis), undefined);
});

test("radius-derived true-scale diameters remain geometrically linear", () => {
  const earthDiameter = canonicaliseComparisonValue(
    fact(6_371, "km", "Mean radius"),
    2,
  );
  const solarDiameter = canonicaliseComparisonValue(
    fact(696_340, "km", "Nominal radius"),
    2,
  );
  const expectedRatio = 6_371 / 696_340;
  const scale = linearDiameterScale(earthDiameter.value, solarDiameter.value);

  assert.ok(Math.abs(scale - expectedRatio) < 1e-15);
  assert.notEqual(scale, Math.sqrt(expectedRatio));
});

test("interval midpoints are explicitly retained for diagram calculations", () => {
  const range = canonicaliseComparisonValue(
    fact([30, 50], "au", "Representative span"),
  );

  assert.equal(range.usedIntervalMidpoint, true);
  assert.deepEqual(range.interval, [
    30 * 149_597_870_700,
    50 * 149_597_870_700,
  ]);
  assert.equal(range.value, 40 * 149_597_870_700);
});
