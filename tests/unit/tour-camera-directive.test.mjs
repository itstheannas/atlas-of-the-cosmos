import assert from "node:assert/strict";
import test from "node:test";

import {
  createTourCameraDirective,
  physicalDistanceToSchematicCameraDistance,
} from "../../lib/tour-camera-directive.ts";

test("tour camera distances preserve equivalent physical units", () => {
  const astronomicalUnit = physicalDistanceToSchematicCameraDistance({
    value: 1,
    unit: "au",
  });
  const equivalentKilometres = physicalDistanceToSchematicCameraDistance({
    value: 149_597_870.7,
    unit: "km",
  });

  assert.ok(astronomicalUnit !== undefined);
  assert.ok(equivalentKilometres !== undefined);
  assert.ok(Math.abs(astronomicalUnit - equivalentKilometres) < 1e-10);
});

test("tour camera distances use a bounded logarithmic schematic projection", () => {
  const planetary = physicalDistanceToSchematicCameraDistance({
    value: 20_000,
    unit: "km",
  });
  const stellar = physicalDistanceToSchematicCameraDistance({
    value: 10,
    unit: "ly",
  });
  const cosmic = physicalDistanceToSchematicCameraDistance({
    value: 14_260,
    unit: "Mpc",
  });

  assert.ok(planetary !== undefined);
  assert.ok(stellar !== undefined);
  assert.ok(cosmic !== undefined);
  assert.ok(planetary < stellar);
  assert.ok(stellar < cosmic);
  assert.ok(planetary >= 4.2);
  assert.ok(cosmic <= 44);
});

test("tour camera directive preserves orientation and target locking", () => {
  const directive = createTourCameraDirective({
    targetObjectId: "earth",
    cameraDistance: { value: 42, unit: "au" },
    orientation: {
      yaw: { value: 18, unit: "deg" },
      pitch: { value: -4, unit: "deg" },
      roll: { value: 2, unit: "deg" },
    },
    targetLock: false,
  });

  assert.ok(directive.cameraDistance !== undefined);
  assert.deepEqual(directive.orientation, {
    yawDeg: 18,
    pitchDeg: -4,
    rollDeg: 2,
  });
  assert.equal(directive.targetLock, false);
});
