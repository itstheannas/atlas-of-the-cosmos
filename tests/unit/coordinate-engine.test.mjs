import assert from "node:assert/strict";
import test from "node:test";

import {
  angularSeparation,
  cartesianToEquatorial,
  convertDistance,
  distanceFromParallax,
  eclipticToEquatorial,
  equatorialToCartesian,
  equatorialToEcliptic,
  equatorialToGalactic,
  galacticToEquatorial,
  makeIcrsCoordinate,
  parseDeclination,
  parseRightAscension,
  propagateLinearProperMotion,
} from "../../packages/coordinate-engine/src/index.ts";

function approximately(actual, expected, tolerance, label = "value") {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, received ${actual}`,
  );
}

test("distance conversion uses IAU astronomical-unit and parsec definitions", () => {
  assert.equal(
    convertDistance({ value: 1, unit: "au" }, "km").value,
    149_597_870.7,
  );
  approximately(
    convertDistance({ value: 1, unit: "pc" }, "au").value,
    206_264.80624709636,
    1e-9,
    "parsec in AU",
  );
  approximately(
    convertDistance({ value: 1, unit: "pc" }, "ly").value,
    3.261563777,
    1e-8,
    "parsec in light-years",
  );
});

test("sexagesimal parsing enforces astronomical ranges", () => {
  approximately(parseRightAscension("05:35:16.48").value, 83.8186666667, 1e-9);
  approximately(parseDeclination("-05:23:22.8").value, -5.3896666667, 1e-9);
  assert.throws(() => parseRightAscension("24:00:00"), /outside valid ranges/);
  assert.throws(() => parseDeclination("+90:00:00.1"), /cannot exceed/);
});

test("J2000 equatorial and galactic transforms match the Galactic Centre", () => {
  const galacticCentre = makeIcrsCoordinate(
    { value: 266.4051, unit: "deg" },
    { value: -28.936175, unit: "deg" },
  );
  const galactic = equatorialToGalactic(galacticCentre);
  const longitudeDistanceFromZero = Math.min(
    galactic.longitude.value,
    360 - galactic.longitude.value,
  );
  approximately(longitudeDistanceFromZero, 0, 0.001, "galactic longitude");
  approximately(galactic.latitude.value, 0, 0.001, "galactic latitude");

  const roundTrip = galacticToEquatorial(galactic);
  approximately(
    roundTrip.rightAscension.value,
    266.4051,
    1e-9,
    "round-trip RA",
  );
  approximately(
    roundTrip.declination.value,
    -28.936175,
    1e-9,
    "round-trip Dec",
  );
});

test("J2000 equatorial and mean-ecliptic transforms round-trip", () => {
  const equatorial = makeIcrsCoordinate(
    { value: 90, unit: "deg" },
    { value: 23.439291111, unit: "deg" },
  );
  const ecliptic = equatorialToEcliptic(equatorial);
  approximately(ecliptic.longitude.value, 90, 1e-9);
  approximately(ecliptic.latitude.value, 0, 1e-9);
  const roundTrip = eclipticToEquatorial(ecliptic);
  approximately(roundTrip.rightAscension.value, 90, 1e-9);
  approximately(roundTrip.declination.value, 23.439291111, 1e-9);
});

test("Cartesian conversion round-trips without changing the distance unit", () => {
  const equatorial = makeIcrsCoordinate(
    { value: 120, unit: "deg" },
    { value: -25, unit: "deg" },
  );
  const cartesian = equatorialToCartesian(
    equatorial,
    { value: 12.5, unit: "pc" },
    "solar-system-barycentre",
  );
  const roundTrip = cartesianToEquatorial(cartesian);
  assert.equal(roundTrip.distance.unit, "pc");
  approximately(roundTrip.distance.value, 12.5, 1e-12);
  approximately(roundTrip.coordinate.rightAscension.value, 120, 1e-12);
  approximately(roundTrip.coordinate.declination.value, -25, 1e-12);
});

test("Galactic Cartesian axes are rotated before producing equatorial angles", () => {
  const equatorial = cartesianToEquatorial({
    kind: "cartesian",
    x: { value: 1, unit: "kpc" },
    y: { value: 0, unit: "kpc" },
    z: { value: 0, unit: "kpc" },
    frame: "galactic",
    origin: "solar-system-barycentre",
    epoch: { value: 2000, scale: "Julian-year" },
  });
  approximately(equatorial.coordinate.rightAscension.value, 266.4049948, 1e-6);
  approximately(equatorial.coordinate.declination.value, -28.936174, 1e-6);
  assert.equal(equatorial.coordinate.origin, "solar-system-barycentre");
});

test("parallax inversion refuses non-positive and low-signal measurements", () => {
  assert.equal(
    distanceFromParallax({
      quantity: { value: -0.2, unit: "mas" },
      status: "observed",
    }).kind,
    "unavailable",
  );

  const lowSignal = distanceFromParallax({
    quantity: { value: 1, unit: "mas" },
    status: "observed",
    uncertainty: {
      kind: "symmetric",
      plusMinus: { value: 0.5, unit: "mas" },
      confidence: "1-sigma",
    },
  });
  assert.deepEqual(
    { kind: lowSignal.kind, reason: lowSignal.reason },
    { kind: "unavailable", reason: "low-signal-parallax" },
  );
  assert.deepEqual(
    distanceFromParallax({
      quantity: { value: 2, unit: "mas" },
      status: "observed",
      uncertainty: {
        kind: "symmetric",
        plusMinus: { value: -1, unit: "mas" },
        confidence: "1-sigma",
      },
    }).reason,
    "invalid-parallax-uncertainty",
  );

  const precise = distanceFromParallax({
    quantity: { value: 100, unit: "mas" },
    status: "observed",
    uncertainty: {
      kind: "symmetric",
      plusMinus: { value: 1, unit: "mas" },
      confidence: "1-sigma",
    },
  });
  assert.equal(precise.kind, "distance");
  approximately(precise.measurement.quantity.value, 10, 1e-12);
  assert.equal(precise.measurement.uncertainty.kind, "asymmetric");
  approximately(
    precise.measurement.uncertainty.lower.value,
    10 - 1_000 / 101,
    1e-12,
  );
  approximately(
    precise.measurement.uncertainty.upper.value,
    1_000 / 99 - 10,
    1e-12,
  );
});

test("linear proper-motion propagation records epoch and modelling limits", () => {
  const propagated = propagateLinearProperMotion(
    makeIcrsCoordinate(
      { value: 10, unit: "deg" },
      { value: 0, unit: "deg" },
      2000,
    ),
    {
      rightAscension: {
        quantity: { value: 1_000, unit: "mas/Julian-year" },
        status: "observed",
      },
      declination: {
        quantity: { value: -500, unit: "mas/Julian-year" },
        status: "observed",
      },
      rightAscensionConvention: "mu-alpha-star",
    },
    { value: 2010, unit: "Julian-year" },
  );
  approximately(
    propagated.coordinate.rightAscension.value,
    10 + 10_000 / 3_600_000,
    1e-12,
  );
  approximately(
    propagated.coordinate.declination.value,
    -5_000 / 3_600_000,
    1e-12,
  );
  assert.equal(propagated.coordinate.epoch.value, 2010);
  assert.equal(propagated.status, "modelled");
  assert.match(propagated.caveats[1], /radial velocity/i);
});

test("angular separation is stable for identical and orthogonal directions", () => {
  const origin = makeIcrsCoordinate(
    { value: 0, unit: "deg" },
    { value: 0, unit: "deg" },
  );
  const quarterTurn = makeIcrsCoordinate(
    { value: 90, unit: "deg" },
    { value: 0, unit: "deg" },
  );
  approximately(angularSeparation(origin, origin).value, 0, 1e-12);
  approximately(angularSeparation(origin, quarterTurn).value, 90, 1e-12);
  assert.throws(
    () =>
      angularSeparation(origin, {
        ...quarterTurn,
        frame: "FK5",
      }),
    /same frame/,
  );
});
