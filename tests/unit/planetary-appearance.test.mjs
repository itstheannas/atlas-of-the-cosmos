import assert from "node:assert/strict";
import test from "node:test";

import { cosmosCatalogue, dataSources } from "../../lib/cosmos-data.ts";
import {
  EARTH_RADIUS_KM,
  compressedVisualRadius,
  planetaryAppearanceFor,
  planetaryAppearances,
} from "../../lib/planetary-appearance.ts";

const HEX_COLOUR = /^#[0-9a-f]{6}$/;

test("every appearance targets a real catalogue exhibit", () => {
  const catalogueIds = new Set(cosmosCatalogue.map((exhibit) => exhibit.id));
  for (const appearance of planetaryAppearances) {
    assert.ok(
      catalogueIds.has(appearance.id),
      `${appearance.id} must exist in the catalogue or it will never render`,
    );
  }
});

test("physical figures are cited against declared data sources", () => {
  const sourceIds = new Set(dataSources.map((source) => source.id));
  for (const appearance of planetaryAppearances) {
    assert.ok(
      appearance.referenceSourceIds.length > 0,
      `${appearance.id} must cite the source of its physical figures`,
    );
    for (const id of appearance.referenceSourceIds) {
      assert.ok(
        sourceIds.has(id),
        `${appearance.id} cites unknown source ${id}`,
      );
    }
    assert.match(
      appearance.paletteBasis,
      /approximated from/,
      `${appearance.id} must state which published imagery informed its palette`,
    );
  }
});

test("radii and rotation figures match published Solar System values", () => {
  const radiusOf = (id) => planetaryAppearanceFor(id)?.equatorialRadiusKm;

  // Independent reference values, ordered largest to smallest by radius.
  // Titan is deliberately ahead of Mercury: it is the larger body by radius
  // despite being far less massive.
  const ordering = [
    "sun",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "earth",
    "venus",
    "mars",
    "titan",
    "mercury",
    "moon",
    "europa",
    "pluto",
    "ceres",
  ];
  for (let index = 1; index < ordering.length; index += 1) {
    const larger = radiusOf(ordering[index - 1]);
    const smaller = radiusOf(ordering[index]);
    assert.ok(
      larger > smaller,
      `${ordering[index - 1]} must be larger than ${ordering[index]}`,
    );
  }

  assert.equal(radiusOf("earth"), EARTH_RADIUS_KM);
  // Retrograde rotators carry a negative sidereal period.
  assert.ok(planetaryAppearanceFor("venus").rotationPeriodHours < 0);
  assert.ok(planetaryAppearanceFor("uranus").rotationPeriodHours < 0);
  // Uranus is the famously tipped-over planet.
  assert.ok(planetaryAppearanceFor("uranus").obliquityDeg > 90);
});

test("ring geometry is ordered and gaps fall inside the ring span", () => {
  for (const appearance of planetaryAppearances) {
    const ring = appearance.ring;
    if (!ring) continue;

    assert.ok(
      ring.innerRadiusRatio > 1,
      `${appearance.id} rings must start above the body's surface`,
    );
    assert.ok(
      ring.outerRadiusRatio > ring.innerRadiusRatio,
      `${appearance.id} ring outer edge must exceed its inner edge`,
    );
    assert.ok(
      ring.opacity > 0 && ring.opacity <= 1,
      `${appearance.id} ring opacity must be a visible fraction`,
    );
    assert.ok(
      ring.note.length > 0,
      `${appearance.id} rings must disclose how the depiction departs from observation`,
    );

    if (ring.gapInnerRatio !== undefined || ring.gapOuterRatio !== undefined) {
      assert.ok(ring.gapInnerRatio < ring.gapOuterRatio);
      assert.ok(ring.gapInnerRatio > ring.innerRadiusRatio);
      assert.ok(ring.gapOuterRatio < ring.outerRadiusRatio);
    }
  }

  // Saturn's Cassini Division sits between the B and A rings.
  const saturn = planetaryAppearanceFor("saturn");
  assert.ok(saturn.ring.gapInnerRatio > 1.9 && saturn.ring.gapInnerRatio < 2.0);
});

test("palettes are complete six-digit hex colours", () => {
  for (const appearance of planetaryAppearances) {
    for (const [tone, value] of Object.entries(appearance.palette)) {
      assert.match(value, HEX_COLOUR, `${appearance.id}.${tone}`);
    }
    if (appearance.atmosphere) {
      assert.match(appearance.atmosphere.colour, HEX_COLOUR, appearance.id);
      assert.ok(
        appearance.atmosphere.strength > 0 &&
          appearance.atmosphere.strength <= 1,
      );
    }
    if (appearance.ring) {
      for (const [tone, value] of Object.entries(appearance.ring.palette)) {
        assert.match(value, HEX_COLOUR, `${appearance.id}.ring.${tone}`);
      }
    }
  }
});

test("visual radius compression preserves ordering while bounding the range", () => {
  assert.equal(compressedVisualRadius(EARTH_RADIUS_KM), 1);

  const sun = compressedVisualRadius(695_700);
  const jupiter = compressedVisualRadius(71_492);
  const earth = compressedVisualRadius(EARTH_RADIUS_KM);
  const ceres = compressedVisualRadius(469.7);

  assert.ok(sun > jupiter && jupiter > earth && earth > ceres);
  // True radii span about 1,480:1; the compressed range must stay legible.
  assert.ok(
    sun / ceres < 15,
    "compression must keep the smallest body visible beside the Sun",
  );
  assert.ok(
    jupiter > earth * 1.5,
    "a gas giant must still read as clearly larger than Earth",
  );

  assert.throws(() => compressedVisualRadius(0), RangeError);
  assert.throws(() => compressedVisualRadius(Number.NaN), RangeError);
});
