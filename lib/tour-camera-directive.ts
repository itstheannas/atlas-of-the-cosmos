import type {
  DistanceUnit,
  Quantity,
} from "../packages/shared-types/src/index.ts";
import type { TourWaypoint } from "../packages/tour-engine/src/schema.ts";

/**
 * Tour waypoints carry physical distances, while the renderer deliberately
 * uses a bounded schematic space. This logarithmic projection preserves
 * ordering across astronomical scales without pretending that render units
 * are kilometres, parsecs, or a single literal universe-wide coordinate.
 */
const METRES_PER_UNIT: Readonly<Record<DistanceUnit, number>> = {
  km: 1_000,
  au: 149_597_870_700,
  ly: 9.460_730_472_580_8e15,
  pc: 3.085_677_581_491_367e16,
  kpc: 3.085_677_581_491_367e19,
  Mpc: 3.085_677_581_491_367e22,
};

const MIN_LOG10_METRES = 6;
const MAX_LOG10_METRES = 27;
const MIN_RENDER_DISTANCE = 4.2;
const MAX_RENDER_DISTANCE = 44;

export interface TourCameraOrientation {
  readonly yawDeg: number;
  readonly pitchDeg: number;
  readonly rollDeg: number;
}

export interface TourCameraDirective {
  readonly cameraDistance?: number;
  readonly orientation?: TourCameraOrientation;
  readonly targetLock: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function physicalDistanceToSchematicCameraDistance(
  distance: Quantity<DistanceUnit> | undefined,
): number | undefined {
  if (!distance || !Number.isFinite(distance.value) || distance.value <= 0) {
    return undefined;
  }

  const metres = distance.value * METRES_PER_UNIT[distance.unit];
  if (!Number.isFinite(metres) || metres <= 0) return undefined;

  const normalized =
    (Math.log10(metres) - MIN_LOG10_METRES) /
    (MAX_LOG10_METRES - MIN_LOG10_METRES);
  return (
    MIN_RENDER_DISTANCE +
    clamp(normalized, 0, 1) * (MAX_RENDER_DISTANCE - MIN_RENDER_DISTANCE)
  );
}

export function createTourCameraDirective(
  waypoint: TourWaypoint,
): TourCameraDirective {
  const cameraDistance = physicalDistanceToSchematicCameraDistance(
    waypoint.cameraDistance,
  );
  const orientation = waypoint.orientation
    ? {
        yawDeg: waypoint.orientation.yaw.value,
        pitchDeg: waypoint.orientation.pitch.value,
        rollDeg: waypoint.orientation.roll.value,
      }
    : undefined;

  return {
    ...(cameraDistance === undefined ? {} : { cameraDistance }),
    ...(orientation === undefined ? {} : { orientation }),
    targetLock: waypoint.targetLock,
  };
}
