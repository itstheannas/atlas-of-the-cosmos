import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  absoluteMagnitudeFromApparent,
  assertValidCatalogueObject,
  classifySpatialScale,
  cosmologicalDistancesFromRedshift,
  distanceModulus,
  fluxRatioFromMagnitudes,
  formatMeasurement,
  logarithmicDisplayRadius,
  validateCatalogueObject,
} from "../../packages/astronomy-core/src/index.ts";

const catalogueUrl = new URL(
  "../../data/sample/catalogue.v1.json",
  import.meta.url,
);

test("distance modulus and magnitude relationships preserve explicit units", () => {
  assert.deepEqual(distanceModulus({ value: 10, unit: "pc" }), {
    value: 0,
    unit: "mag",
  });
  assert.ok(
    Math.abs(distanceModulus({ value: 100, unit: "pc" }).value - 5) < 1e-12,
  );
  assert.ok(
    Math.abs(
      fluxRatioFromMagnitudes(
        { value: 0, unit: "mag" },
        { value: 5, unit: "mag" },
      ).value - 100,
    ) < 1e-12,
  );
});

test("absolute magnitude propagates symmetric input uncertainty", () => {
  const result = absoluteMagnitudeFromApparent(
    {
      quantity: { value: 10, unit: "mag" },
      status: "observed",
      uncertainty: {
        kind: "symmetric",
        plusMinus: { value: 0.1, unit: "mag" },
        confidence: "1-sigma",
      },
      passband: "V",
    },
    {
      quantity: { value: 100, unit: "pc" },
      status: "estimated",
      uncertainty: {
        kind: "symmetric",
        plusMinus: { value: 10, unit: "pc" },
        confidence: "1-sigma",
      },
    },
  );
  assert.equal(result.status, "derived");
  assert.equal(result.quantity.unit, "mag");
  assert.equal(result.passband, "V");
  assert.ok(result.uncertainty.plusMinus.value > 0.2);
  assert.match(result.caveat, /extinction is uncorrected/i);
});

test("measurement formatting follows uncertainty precision and labels evidence", () => {
  assert.equal(
    formatMeasurement(
      {
        quantity: { value: 12.3456, unit: "pc" },
        status: "estimated",
        uncertainty: {
          kind: "symmetric",
          plusMinus: { value: 0.42, unit: "pc" },
          confidence: "1-sigma",
        },
      },
      { includeEvidenceStatus: true },
    ),
    "12.3 ± 0.4 pc (estimated)",
  );
  assert.equal(formatMeasurement(undefined), "Unknown");
});

test("scale selection and logarithmic mapping reject ambiguous invalid values", () => {
  assert.equal(classifySpatialScale({ value: 1, unit: "au" }), "solar-system");
  assert.equal(classifySpatialScale({ value: 10, unit: "kpc" }), "galactic");
  assert.equal(
    logarithmicDisplayRadius({ value: 9, unit: "km" }, { value: 1, unit: "km" })
      .value,
    1,
  );
  assert.throws(
    () =>
      logarithmicDisplayRadius(
        { value: 1, unit: "km" },
        { value: 0, unit: "km" },
      ),
    /positive/,
  );
});

test("cosmological redshift conversion requires and reports explicit assumptions", () => {
  const model = {
    name: "Test flat LCDM",
    citation: "Planck Collaboration VI (2020), A&A 641, A6.",
    hubbleConstant: { value: 67.4, unit: "km/s/Mpc" },
    omegaMatter: { value: 0.315, unit: "dimensionless" },
    omegaDarkEnergy: { value: 0.685, unit: "dimensionless" },
    validRedshiftRange: {
      minimum: { value: 0, unit: "redshift" },
      maximum: { value: 10, unit: "redshift" },
    },
  };
  const result = cosmologicalDistancesFromRedshift(
    {
      quantity: { value: 1, unit: "redshift" },
      status: "observed",
      uncertainty: {
        kind: "symmetric",
        plusMinus: { value: 0.01, unit: "redshift" },
        confidence: "1-sigma",
      },
    },
    model,
  );
  assert.ok(Math.abs(result.comovingRadialDistance.quantity.value - 3_401) < 5);
  assert.ok(Math.abs(result.luminosityDistance.quantity.value - 6_802) < 10);
  assert.equal(result.assumptions.hubbleConstant.unit, "km/s/Mpc");
  assert.equal(result.comovingRadialDistance.status, "modelled");
  assert.equal(result.comovingRadialDistance.uncertainty.kind, "asymmetric");
  assert.throws(
    () =>
      cosmologicalDistancesFromRedshift(
        {
          quantity: { value: -0.001, unit: "redshift" },
          status: "observed",
        },
        model,
      ),
    /non-negative/,
  );
});

test("generated sample catalogue objects pass strict provenance validation", async () => {
  const catalogue = JSON.parse(await readFile(catalogueUrl, "utf8"));
  assert.equal(catalogue.dataOrigin, "catalogue");
  assert.equal(catalogue.objects.length, 4);
  for (const object of catalogue.objects) {
    assert.equal(assertValidCatalogueObject(object).id, object.id);
  }
});

test("catalogue validation rejects procedural masquerading and missing provenance", () => {
  const result = validateCatalogueObject({
    id: "invented:star-1",
    dataOrigin: "procedural",
    names: { primary: "Made-up star", common: [] },
    objectType: "star",
    catalogueIdentifiers: [],
    properties: {},
    provenance: [],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "object.origin"));
  assert.ok(result.issues.some((issue) => issue.code === "object.provenance"));
});

test("catalogue validation enforces photometric passbands and uncertainty units", async () => {
  const catalogue = JSON.parse(await readFile(catalogueUrl, "utf8"));
  const invalid = structuredClone(catalogue.objects[0]);
  delete invalid.properties.apparentMagnitude.passband;
  invalid.properties.apparentMagnitude.uncertainty = {
    kind: "symmetric",
    plusMinus: { value: 1, unit: "pc" },
    confidence: "1-sigma",
  };
  const result = validateCatalogueObject(invalid);
  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "photometry.passband"),
  );
  assert.ok(result.issues.some((issue) => issue.code === "quantity.dimension"));
});
