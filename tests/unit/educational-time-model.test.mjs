import assert from "node:assert/strict";
import test from "node:test";

import {
  applyEducationalOrbitModel,
  describeEducationalTime,
} from "../../lib/educational-time-model.ts";

const earthSceneObject = {
  id: "earth",
  renderPosition: [10, 0, 0],
  schematicOrbit: {
    centre: [0, 0, 0],
    radius: 10,
  },
};

test("educational time model moves supported bodies on bounded schematic orbits", () => {
  const atJ2000 = applyEducationalOrbitModel(
    [earthSceneObject],
    new Date("2000-01-01T12:00:00.000Z"),
  )[0];
  const halfOrbitLater = applyEducationalOrbitModel(
    [earthSceneObject],
    new Date("2000-07-02T03:04:19.000Z"),
  )[0];

  assert.notDeepEqual(atJ2000.renderPosition, earthSceneObject.renderPosition);
  assert.ok(
    Math.abs(
      Math.hypot(atJ2000.renderPosition[0], atJ2000.renderPosition[2]) - 10,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(atJ2000.renderPosition[0] + halfOrbitLater.renderPosition[0]) <
      0.1,
  );
});

test("time summary exposes rotation, moon phase, and validity clamping", () => {
  const inside = describeEducationalTime(
    new Date("2026-07-29T12:00:00.000Z"),
    "earth",
  );
  assert.equal(inside.withinModelWindow, true);
  assert.ok(inside.rotationPhaseDegrees >= 0);
  assert.ok(inside.rotationPhaseDegrees < 360);
  assert.ok(inside.moonIlluminatedFraction >= 0);
  assert.ok(inside.moonIlluminatedFraction <= 1);

  const outside = describeEducationalTime(
    new Date("2200-01-01T00:00:00.000Z"),
    "earth",
  );
  assert.equal(outside.withinModelWindow, false);
  assert.match(outside.effectiveDateIso, /^2100-12-31/);
});

test("objects without an explicit mean-motion model remain unchanged", () => {
  const object = {
    id: "andromeda-galaxy",
    renderPosition: [1, 2, 3],
  };
  const [result] = applyEducationalOrbitModel(
    [object],
    new Date("2026-07-29T00:00:00.000Z"),
  );
  assert.equal(result, object);
});
