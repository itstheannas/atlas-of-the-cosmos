"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as THREE from "three";

import {
  cosmicScaleLayers,
  cosmosCatalogue,
  type CosmosExhibit,
  type CosmicReferenceFrame,
  type RecordKind,
} from "../../lib/cosmos-data";
import {
  recordAtlasDiagnostic,
  reportCodedClientError,
} from "../../lib/client-observability";
import { applyEducationalOrbitModel } from "../../lib/educational-time-model";
import { formatUiMessage, type UiCopy } from "../../lib/i18n";

/**
 * Automatic is resolved once when the renderer is created. Scientific keeps
 * the reference grid crisp and deliberately reduces decorative point density.
 */
export type CosmosQuality =
  "auto" | "low" | "medium" | "high" | "ultra" | "scientific";

export type ResolvedCosmosQuality = Exclude<CosmosQuality, "auto">;

export type CosmosMarkerKind =
  | "catalogue-point"
  | "catalogue-object"
  | "derived-structure"
  | "conceptual-model";

export type RenderPosition = readonly [x: number, y: number, z: number];

export interface SchematicOrbit {
  /** Render-space centre. This is a visual guide, not an ephemeris state. */
  readonly centre: RenderPosition;
  readonly radius: number;
  readonly inclinationRad?: number;
}

/**
 * A deliberately small renderer view-model. `renderPosition` is a bounded,
 * schematic coordinate and must never be written back into scientific data.
 */
export interface CosmosSceneObject {
  readonly id: string;
  readonly name: string;
  readonly objectType: string;
  readonly scaleLayerId: string;
  readonly scaleLabel: string;
  readonly referenceFrame: CosmicReferenceFrame;
  readonly recordKind: RecordKind;
  readonly markerKind: CosmosMarkerKind;
  readonly colour: string;
  readonly renderPosition: RenderPosition;
  readonly visualScale: number;
  readonly importance: number;
  readonly schematicOrbit?: SchematicOrbit;
}

export interface CosmosFlyToRequest {
  readonly objectId: string;
  /**
   * Change this token to replay a flight to the same object.
   * It is intentionally opaque to the renderer.
   */
  readonly requestId: string | number;
  readonly durationMs?: number;
  readonly cameraDistance?: number;
  readonly orientation?: {
    /** View yaw in degrees around the target's local up axis. */
    readonly yawDeg: number;
    /** View pitch in degrees, clamped just inside the poles. */
    readonly pitchDeg: number;
    /** Camera roll in degrees around its viewing axis. */
    readonly rollDeg: number;
  };
  /** Keep the camera aimed at the interpolated target during travel. */
  readonly targetLock?: boolean;
  /**
   * A fade or cut repositions immediately; the caller owns the fade overlay.
   * Existing callers default to a smooth flight.
   */
  readonly transitionStyle?: "fly" | "cut" | "fade";
}

export type CosmosUserInteractionSource =
  "pointer" | "wheel" | "keyboard" | "gamepad";

export type CosmosFlightStatus =
  "completed" | "interrupted" | "superseded" | "target-missing";

export interface CosmosFlightResult {
  readonly objectId: string;
  readonly requestId: string | number;
  readonly status: CosmosFlightStatus;
}

export interface CosmosCameraSnapshot {
  readonly position: RenderPosition;
  readonly target: RenderPosition;
  readonly distanceFromTarget: number;
  readonly nearestScaleLayerId: string;
  readonly referenceFrame: CosmicReferenceFrame;
  readonly coordinateSpace: "schematic-render-space";
}

export type CosmosGraphicsState =
  | "initialising"
  | "ready"
  | "context-lost"
  | "context-restored"
  | "unsupported"
  | "failed";

export interface CosmosGraphicsStateEvent {
  readonly state: CosmosGraphicsState;
  readonly message: string;
}

export interface CosmosSceneProps {
  readonly copy: UiCopy["cosmosScene"];
  /** Defaults to the curated sample adapted by `adaptCatalogueToScene`. */
  readonly objects?: readonly CosmosSceneObject[];
  readonly selectedObjectId?: string | null;
  readonly initialObjectId?: string;
  readonly flyTo?: CosmosFlyToRequest | null;
  readonly quality?: CosmosQuality;
  readonly showProceduralBackground?: boolean;
  readonly showGrid?: boolean;
  readonly showOrbits?: boolean;
  readonly showLabels?: boolean;
  /** Drives only the explicitly labelled educational mean-motion model. */
  readonly simulationTimeMs?: number;
  readonly reducedMotion?: boolean;
  readonly cameraMode?: "cinematic" | "scientific";
  /** Multiplier for manual keyboard, wheel, touch-zoom, and gamepad travel. */
  readonly navigationSpeed?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
  readonly onSelectObject?: (object: CosmosSceneObject | null) => void;
  readonly onHoverObject?: (object: CosmosSceneObject | null) => void;
  readonly onUserInteraction?: (source: CosmosUserInteractionSource) => void;
  readonly onFlightEnd?: (result: CosmosFlightResult) => void;
  readonly onCameraChange?: (snapshot: CosmosCameraSnapshot) => void;
  readonly onGraphicsStateChange?: (event: CosmosGraphicsStateEvent) => void;
  readonly onQualityResolved?: (quality: ResolvedCosmosQuality) => void;
}

interface QualityProfile {
  readonly id: ResolvedCosmosQuality;
  readonly backgroundPoints: number;
  readonly pixelRatioCap: number;
  readonly sphereDetail: number;
  readonly antialias: boolean;
  readonly gridOpacity: number;
  readonly decorativeMotion: boolean;
}

interface CallbackBag {
  readonly onSelectObject?: CosmosSceneProps["onSelectObject"];
  readonly onHoverObject?: CosmosSceneProps["onHoverObject"];
  readonly onUserInteraction?: CosmosSceneProps["onUserInteraction"];
  readonly onFlightEnd?: CosmosSceneProps["onFlightEnd"];
  readonly onCameraChange?: CosmosSceneProps["onCameraChange"];
  readonly onGraphicsStateChange?: CosmosSceneProps["onGraphicsStateChange"];
  readonly onQualityResolved?: CosmosSceneProps["onQualityResolved"];
}

interface CallbackRef {
  current: CallbackBag;
}

interface RuntimePresentationConfig {
  readonly selectedObjectId: string | null | undefined;
  readonly showProceduralBackground: boolean;
  readonly showGrid: boolean | undefined;
  readonly showOrbits: boolean;
  readonly showLabels: boolean;
  readonly reducedMotion: boolean;
  readonly cameraMode: "cinematic" | "scientific";
  readonly navigationSpeed: number;
}

interface FlightState {
  readonly objectId: string;
  readonly requestId: string | number;
  readonly startedAt: number;
  readonly durationMs: number;
  readonly startCameraWorld: THREE.Vector3;
  readonly startTargetWorld: THREE.Vector3;
  readonly endCameraWorld: THREE.Vector3;
  readonly endTargetWorld: THREE.Vector3;
  readonly startCameraQuaternion: THREE.Quaternion;
  readonly endCameraQuaternion: THREE.Quaternion;
  readonly targetLock: boolean;
  readonly endRollRad: number;
}

interface PointBatch {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly objects: readonly CosmosSceneObject[];
  readonly baseSizes: Float32Array;
  readonly positionAttribute: THREE.BufferAttribute;
  readonly sizeAttribute: THREE.BufferAttribute;
}

interface MarkerBatch {
  readonly mesh: THREE.InstancedMesh;
  readonly objects: readonly CosmosSceneObject[];
  readonly material: THREE.Material;
}

interface SceneRuntime {
  setSelected(id: string | null): void;
  setProceduralVisible(visible: boolean): void;
  setGridVisible(visible: boolean): void;
  setOrbitsVisible(visible: boolean): void;
  setLabelsVisible(visible: boolean): void;
  setReducedMotion(reduced: boolean): void;
  setCameraMode(mode: "cinematic" | "scientific"): void;
  setNavigationSpeed(multiplier: number): void;
  setSimulationTime(timeMs: number): void;
  flyTo(request: CosmosFlyToRequest): void;
  destroy(): void;
}

interface RuntimeOptions {
  readonly copy: UiCopy["cosmosScene"];
  readonly canvas: HTMLCanvasElement;
  readonly labelElement: HTMLDivElement;
  readonly objects: readonly CosmosSceneObject[];
  readonly quality: QualityProfile;
  readonly initialObjectId: string;
  readonly callbacksRef: CallbackRef;
  readonly reducedMotion: boolean;
  readonly cameraMode: "cinematic" | "scientific";
  readonly navigationSpeed: number;
  readonly onInternalGraphicsState: (state: CosmosGraphicsState) => void;
}

interface NavigatorPerformanceHints extends Navigator {
  readonly deviceMemory?: number;
}

class UnsupportedGraphicsError extends Error {
  constructor() {
    super("A WebGL 2 graphics context is unavailable.");
    this.name = "UnsupportedGraphicsError";
  }
}

const QUALITY_PROFILES: Readonly<
  Record<ResolvedCosmosQuality, QualityProfile>
> = {
  low: {
    id: "low",
    backgroundPoints: 550,
    pixelRatioCap: 1,
    sphereDetail: 0,
    antialias: false,
    gridOpacity: 0.2,
    decorativeMotion: false,
  },
  medium: {
    id: "medium",
    backgroundPoints: 1_300,
    pixelRatioCap: 1.35,
    sphereDetail: 1,
    antialias: true,
    gridOpacity: 0.24,
    decorativeMotion: true,
  },
  high: {
    id: "high",
    backgroundPoints: 2_800,
    pixelRatioCap: 1.75,
    sphereDetail: 1,
    antialias: true,
    gridOpacity: 0.28,
    decorativeMotion: true,
  },
  ultra: {
    id: "ultra",
    backgroundPoints: 5_800,
    pixelRatioCap: 2.25,
    sphereDetail: 2,
    antialias: true,
    gridOpacity: 0.32,
    decorativeMotion: true,
  },
  scientific: {
    id: "scientific",
    backgroundPoints: 700,
    pixelRatioCap: 1.5,
    sphereDetail: 1,
    antialias: true,
    gridOpacity: 0.46,
    decorativeMotion: false,
  },
};

const SCALE_SPACING = 27;
const FLOATING_ORIGIN_THRESHOLD = 48;
const MIN_CAMERA_DISTANCE = 0.45;
const MAX_CAMERA_DISTANCE = 115;
const DEFAULT_FLIGHT_DURATION_MS = 1_850;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;

const SCALE_BY_ID = new Map(
  cosmicScaleLayers.map((layer) => [layer.id, layer] as const),
);

const SCALE_ANCHOR_IDS: Readonly<Record<string, string>> = {
  planetary: "earth",
  "solar-system": "sun",
  "stellar-neighbourhood": "sun",
  "stellar-evolution": "orion-nebula",
  galactic: "milky-way",
  "local-group": "local-group",
  extragalactic: "virgo-cluster",
  "observable-universe": "observable-universe",
};

const SOLAR_ORBIT_ORDER = [
  "mercury",
  "venus",
  "mars",
  "ceres",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

const SCREEN_READER_ONLY_STYLE: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const WRAPPER_STYLE: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "22rem",
  overflow: "hidden",
  background: "#02040a",
  isolation: "isolate",
};

const CANVAS_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  minHeight: "22rem",
  touchAction: "none",
  cursor: "grab",
};

const LABEL_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 2,
  maxWidth: "min(17rem, 72vw)",
  padding: "0.4rem 0.55rem",
  border: "1px solid rgba(179, 205, 231, 0.32)",
  borderRadius: "0.35rem",
  color: "#f0f6ff",
  background: "rgba(4, 10, 19, 0.86)",
  boxShadow: "0 0.5rem 1.5rem rgba(0, 0, 0, 0.28)",
  font: "500 0.75rem/1.35 ui-sans-serif, system-ui, sans-serif",
  letterSpacing: "0.015em",
  opacity: 0,
  pointerEvents: "none",
  transform: "translate3d(-1000px, -1000px, 0)",
  transition: "opacity 120ms ease",
  willChange: "transform, opacity",
};

const CONTEXT_BADGE_STYLE: CSSProperties = {
  position: "absolute",
  right: "0.7rem",
  bottom: "0.65rem",
  zIndex: 2,
  color: "#aab8c9",
  background: "rgba(2, 6, 13, 0.7)",
  border: "1px solid rgba(159, 178, 201, 0.2)",
  borderRadius: "999px",
  padding: "0.28rem 0.48rem",
  font: "600 0.61rem/1 ui-sans-serif, system-ui, sans-serif",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  pointerEvents: "none",
};

const FALLBACK_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 4,
  display: "grid",
  placeContent: "center",
  gap: "0.8rem",
  padding: "2rem",
  color: "#eaf1fb",
  background: "rgba(2, 6, 13, 0.96)",
  textAlign: "center",
  font: "500 0.9rem/1.55 ui-sans-serif, system-ui, sans-serif",
};

const RETRY_BUTTON_STYLE: CSSProperties = {
  justifySelf: "center",
  minHeight: "2.75rem",
  padding: "0.65rem 1rem",
  border: "1px solid #7fb7db",
  borderRadius: "999px",
  color: "#f4fbff",
  background: "#173149",
  font: "700 0.78rem/1 ui-sans-serif, system-ui, sans-serif",
  cursor: "pointer",
};

const STAR_VERTEX_SHADER = `
  uniform float uPixelRatio;
  attribute float aSize;
  varying vec3 vColour;

  void main() {
    vColour = color;
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying vec3 vColour;

  void main() {
    float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
    float alpha = 1.0 - smoothstep(0.38, 1.0, radius);
    if (alpha < 0.015) discard;
    float core = 1.0 - smoothstep(0.0, 0.28, radius);
    gl_FragColor = vec4(vColour + core * 0.34, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const PROCEDURAL_VERTEX_SHADER = `
  uniform float uPixelRatio;
  attribute float aSize;
  varying vec3 vColour;

  void main() {
    vColour = color;
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const PROCEDURAL_FRAGMENT_SHADER = `
  uniform float uOpacity;
  varying vec3 vColour;

  void main() {
    float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
    float alpha = 1.0 - smoothstep(0.18, 1.0, radius);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColour, alpha * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function finitePosition(position: RenderPosition): boolean {
  return position.every(Number.isFinite);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(value: number): number {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededUnit(value: string, salt: number): number {
  let state = (hashString(value) + Math.imul(salt, 2_246_822_519)) >>> 0;
  state += 0x6d2b79f5;
  let mixed = state;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
}

function layerCentre(scaleLayerId: string): RenderPosition {
  const layer = SCALE_BY_ID.get(scaleLayerId) ?? cosmicScaleLayers[0];
  return [0, 0, -(layer.order - 1) * SCALE_SPACING];
}

function markerKindFor(exhibit: CosmosExhibit): CosmosMarkerKind {
  if (exhibit.visual.textureMode === "catalogue-point") {
    return "catalogue-point";
  }
  if (exhibit.recordKind === "catalogue-backed") {
    return "catalogue-object";
  }
  if (exhibit.recordKind === "derived-structure") {
    return "derived-structure";
  }
  return "conceptual-model";
}

function adaptedPosition(
  exhibit: CosmosExhibit,
  indexWithinLayer: number,
): {
  readonly position: RenderPosition;
  readonly orbit?: SchematicOrbit;
} {
  const centre = layerCentre(exhibit.scaleLayerId);
  const anchorId = SCALE_ANCHOR_IDS[exhibit.scaleLayerId];

  if (exhibit.id === anchorId) {
    return { position: centre };
  }

  if (exhibit.scaleLayerId === "solar-system") {
    const orbitIndex = SOLAR_ORBIT_ORDER.indexOf(
      exhibit.id as (typeof SOLAR_ORBIT_ORDER)[number],
    );
    if (orbitIndex >= 0) {
      const radius = 0.72 + orbitIndex * 0.62;
      const angle = orbitIndex * GOLDEN_ANGLE + seededUnit(exhibit.id, 7) * 0.7;
      const inclination =
        (seededUnit(exhibit.id, 11) - 0.5) * THREE.MathUtils.degToRad(8);
      return {
        position: [
          centre[0] + Math.cos(angle) * radius,
          centre[1] + Math.sin(inclination) * radius,
          centre[2] + Math.sin(angle) * radius,
        ],
        orbit: {
          centre,
          radius,
          inclinationRad: inclination,
        },
      };
    }
  }

  const angle =
    indexWithinLayer * GOLDEN_ANGLE + seededUnit(exhibit.id, 19) * 0.75;
  const radius =
    1.65 +
    Math.sqrt(indexWithinLayer + 1) * 1.28 +
    seededUnit(exhibit.id, 23) * 0.72;
  const verticalCompression = exhibit.scaleLayerId === "galactic" ? 0.32 : 0.58;
  const depthJitter = (seededUnit(exhibit.id, 29) - 0.5) * 3.8;

  return {
    position: [
      centre[0] + Math.cos(angle) * radius,
      centre[1] + Math.sin(angle) * radius * verticalCompression,
      centre[2] + depthJitter,
    ],
  };
}

/**
 * Creates the default bounded scale-band view. The positions and orbit rings
 * produced here are explicitly schematic; catalogue coordinates and measured
 * distances remain untouched in `cosmos-data`.
 */
export function adaptCatalogueToScene(
  exhibits: readonly CosmosExhibit[],
): readonly CosmosSceneObject[] {
  const layerCounts = new Map<string, number>();

  return exhibits.map((exhibit) => {
    const layer = SCALE_BY_ID.get(exhibit.scaleLayerId) ?? cosmicScaleLayers[0];
    const indexWithinLayer = layerCounts.get(exhibit.scaleLayerId) ?? 0;
    layerCounts.set(exhibit.scaleLayerId, indexWithinLayer + 1);
    const adapted = adaptedPosition(exhibit, indexWithinLayer);
    const isAnchor = SCALE_ANCHOR_IDS[exhibit.scaleLayerId] === exhibit.id;
    const isCataloguePoint = exhibit.visual.textureMode === "catalogue-point";

    return {
      id: exhibit.id,
      name: exhibit.name,
      objectType: exhibit.objectType,
      scaleLayerId: exhibit.scaleLayerId,
      scaleLabel: layer.title,
      referenceFrame: layer.referenceFrame,
      recordKind: exhibit.recordKind,
      markerKind: markerKindFor(exhibit),
      colour: exhibit.visual.colour,
      renderPosition: adapted.position,
      visualScale: isAnchor ? 1.6 : isCataloguePoint ? 0.92 : 1,
      importance: isAnchor
        ? 1.55
        : exhibit.recordKind === "catalogue-backed"
          ? 1
          : 0.9,
      ...(adapted.orbit ? { schematicOrbit: adapted.orbit } : {}),
    };
  });
}

const DEFAULT_SCENE_OBJECTS = adaptCatalogueToScene(cosmosCatalogue);

function normaliseObjects(
  objects: readonly CosmosSceneObject[],
): readonly CosmosSceneObject[] {
  const seen = new Set<string>();
  return objects.filter((object) => {
    if (
      object.id.length === 0 ||
      seen.has(object.id) ||
      !finitePosition(object.renderPosition) ||
      !Number.isFinite(object.visualScale) ||
      !Number.isFinite(object.importance)
    ) {
      return false;
    }
    seen.add(object.id);
    return true;
  });
}

function detectAutomaticQuality(): ResolvedCosmosQuality {
  const navigatorWithHints = navigator as NavigatorPerformanceHints;
  const memory = navigatorWithHints.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency || 4;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowScreen = Math.min(window.innerWidth, window.innerHeight) < 720;

  if (memory <= 2 || cores <= 2) {
    return "low";
  }
  if (coarsePointer || narrowScreen || memory <= 4 || cores <= 4) {
    return "medium";
  }
  return window.devicePixelRatio > 1.6 && memory >= 8 ? "high" : "medium";
}

function makePointMaterial(
  pixelRatio: number,
  procedural: boolean,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      ...(procedural ? { uOpacity: { value: 0.78 } } : {}),
    },
    vertexShader: procedural ? PROCEDURAL_VERTEX_SHADER : STAR_VERTEX_SHADER,
    fragmentShader: procedural
      ? PROCEDURAL_FRAGMENT_SHADER
      : STAR_FRAGMENT_SHADER,
    transparent: true,
    depthTest: !procedural,
    depthWrite: false,
    vertexColors: true,
    blending: procedural ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: true,
  });
}

function createCataloguePointBatch(
  objects: readonly CosmosSceneObject[],
  pixelRatio: number,
): PointBatch | null {
  if (objects.length === 0) {
    return null;
  }

  const positions = new Float32Array(objects.length * 3);
  const colours = new Float32Array(objects.length * 3);
  const sizes = new Float32Array(objects.length);
  const colour = new THREE.Color();

  objects.forEach((object, index) => {
    const offset = index * 3;
    positions[offset] = object.renderPosition[0];
    positions[offset + 1] = object.renderPosition[1];
    positions[offset + 2] = object.renderPosition[2];
    colour.set(object.colour);
    colours[offset] = colour.r;
    colours[offset + 1] = colour.g;
    colours[offset + 2] = colour.b;
    sizes[index] = clamp(5.5 * object.visualScale * object.importance, 4, 14);
  });

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  const sizeAttribute = new THREE.BufferAttribute(sizes.slice(), 1);
  geometry.setAttribute("aSize", sizeAttribute);
  geometry.computeBoundingSphere();

  const material = makePointMaterial(pixelRatio, false);
  const points = new THREE.Points(geometry, material);
  points.name = "catalogue-backed star points";
  points.userData.dataOrigin = "catalogue";
  points.frustumCulled = true;

  return {
    points,
    objects,
    baseSizes: sizes,
    positionAttribute,
    sizeAttribute,
  };
}

function markerGeometry(
  kind: Exclude<CosmosMarkerKind, "catalogue-point">,
  detail: number,
): THREE.BufferGeometry {
  if (kind === "derived-structure") {
    return new THREE.TorusGeometry(0.72, 0.13, 6, 16);
  }
  if (kind === "conceptual-model") {
    return new THREE.OctahedronGeometry(0.7, 0);
  }
  return new THREE.IcosahedronGeometry(0.58, detail);
}

function createMarkerBatch(
  kind: Exclude<CosmosMarkerKind, "catalogue-point">,
  objects: readonly CosmosSceneObject[],
  profile: QualityProfile,
): MarkerBatch | null {
  if (objects.length === 0) {
    return null;
  }

  const geometry = markerGeometry(kind, profile.sphereDetail);
  const material =
    kind === "conceptual-model"
      ? new THREE.MeshBasicMaterial({
          color: "#b7c4d8",
          transparent: true,
          opacity: 0.78,
          wireframe: true,
          toneMapped: true,
        })
      : new THREE.MeshStandardMaterial({
          color: "#ffffff",
          roughness: kind === "derived-structure" ? 0.48 : 0.68,
          metalness: kind === "derived-structure" ? 0.18 : 0.04,
          emissive: new THREE.Color("#07101b"),
          emissiveIntensity: 0.5,
          vertexColors: true,
          transparent: kind === "derived-structure",
          opacity: kind === "derived-structure" ? 0.88 : 1,
          toneMapped: true,
        });
  const mesh = new THREE.InstancedMesh(geometry, material, objects.length);
  const transform = new THREE.Object3D();
  const colour = new THREE.Color();

  objects.forEach((object, index) => {
    transform.position.fromArray(object.renderPosition);
    transform.scale.setScalar(0.22 * object.visualScale);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    colour.set(object.colour);
    mesh.setColorAt(index, colour);
  });

  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.name = `${kind} marker batch`;
  mesh.userData.dataOrigin =
    kind === "catalogue-object" ? "catalogue" : "model";
  mesh.userData.representation =
    kind === "catalogue-object" ? "catalogue marker" : "schematic";
  mesh.frustumCulled = false;

  return { mesh, objects, material };
}

function createProceduralBackground(
  profile: QualityProfile,
  pixelRatio: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "procedural contextual background";
  group.userData.dataOrigin = "procedural";
  group.userData.disclaimer =
    "Uncatalogued, illustrative context; no point has a scientific identifier.";

  const count = profile.backgroundPoints;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colour = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const u = seededUnit("atlas-procedural-context", index * 3 + 1);
    const v = seededUnit("atlas-procedural-context", index * 3 + 2);
    const w = seededUnit("atlas-procedural-context", index * 3 + 3);
    const theta = TAU * u;
    const cosPhi = 2 * v - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const radius = 88 + w * 72;
    const offset = index * 3;
    positions[offset] = Math.cos(theta) * sinPhi * radius;
    positions[offset + 1] = cosPhi * radius;
    positions[offset + 2] = Math.sin(theta) * sinPhi * radius;

    const temperatureCue = seededUnit("atlas-procedural-colour", index);
    if (temperatureCue < 0.22) {
      colour.setRGB(0.58, 0.69, 1);
    } else if (temperatureCue > 0.82) {
      colour.setRGB(1, 0.67, 0.42);
    } else {
      colour.setRGB(0.86, 0.9, 1);
    }
    const intensity =
      0.34 + seededUnit("atlas-procedural-intensity", index) * 0.66;
    colours[offset] = colour.r * intensity;
    colours[offset + 1] = colour.g * intensity;
    colours[offset + 2] = colour.b * intensity;
    sizes[index] =
      0.55 + Math.pow(seededUnit("atlas-procedural-size", index), 7) * 1.8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.computeBoundingSphere();
  const material = makePointMaterial(pixelRatio, true);
  const points = new THREE.Points(geometry, material);
  points.name = "procedural background points — not catalogue objects";
  points.renderOrder = -10;
  points.frustumCulled = false;
  group.add(points);
  return group;
}

function createReferenceGrid(profile: QualityProfile): THREE.Group {
  const group = new THREE.Group();
  group.name = "schematic scale and coordinate grid";
  group.userData.representation = "schematic scale-band guide";

  const vertices: number[] = [];
  const segmentsPerCircle = profile.id === "low" ? 32 : 56;

  cosmicScaleLayers.forEach((layer) => {
    const centre = layerCentre(layer.id);
    [2.6, 5.2].forEach((radius) => {
      for (let index = 0; index < segmentsPerCircle; index += 1) {
        const angleA = (index / segmentsPerCircle) * TAU;
        const angleB = ((index + 1) / segmentsPerCircle) * TAU;
        vertices.push(
          centre[0] + Math.cos(angleA) * radius,
          centre[1] + Math.sin(angleA) * radius,
          centre[2],
          centre[0] + Math.cos(angleB) * radius,
          centre[1] + Math.sin(angleB) * radius,
          centre[2],
        );
      }
    });
    vertices.push(
      centre[0] - 6.4,
      centre[1],
      centre[2],
      centre[0] + 6.4,
      centre[1],
      centre[2],
      centre[0],
      centre[1] - 3.8,
      centre[2],
      centre[0],
      centre[1] + 3.8,
      centre[2],
    );
  });

  for (let index = 0; index < cosmicScaleLayers.length - 1; index += 1) {
    const current = layerCentre(cosmicScaleLayers[index].id);
    const next = layerCentre(cosmicScaleLayers[index + 1].id);
    vertices.push(...current, ...next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  const material = new THREE.LineBasicMaterial({
    color: profile.id === "scientific" ? "#6f8aa4" : "#43546e",
    transparent: true,
    opacity: profile.gridOpacity,
    depthWrite: false,
    toneMapped: true,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "batched reference grid";
  group.add(lines);
  return group;
}

function createOrbitGuides(objects: readonly CosmosSceneObject[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "schematic orbit guides";
  group.userData.representation =
    "diagrammatic circular paths; not time-specific ephemerides";
  const vertices: number[] = [];
  const segments = 72;

  objects.forEach((object) => {
    if (!object.schematicOrbit) {
      return;
    }
    const { centre, radius, inclinationRad = 0 } = object.schematicOrbit;
    for (let index = 0; index < segments; index += 1) {
      const angleA = (index / segments) * TAU;
      const angleB = ((index + 1) / segments) * TAU;
      vertices.push(
        centre[0] + Math.cos(angleA) * radius,
        centre[1] + Math.sin(angleA) * Math.sin(inclinationRad) * radius,
        centre[2] + Math.sin(angleA) * Math.cos(inclinationRad) * radius,
        centre[0] + Math.cos(angleB) * radius,
        centre[1] + Math.sin(angleB) * Math.sin(inclinationRad) * radius,
        centre[2] + Math.sin(angleB) * Math.cos(inclinationRad) * radius,
      );
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  const material = new THREE.LineBasicMaterial({
    color: "#7087a3",
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    toneMapped: true,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "batched schematic orbit paths";
  group.add(lines);
  return group;
}

function disposeScene(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  scene.traverse((object) => {
    if (
      !("geometry" in object) ||
      !(object.geometry instanceof THREE.BufferGeometry) ||
      !("material" in object)
    ) {
      return;
    }
    geometries.add(object.geometry as THREE.BufferGeometry);
    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    objectMaterials.forEach((candidate: unknown) => {
      if (!(candidate instanceof THREE.Material)) return;
      const material = candidate as THREE.Material;
      materials.add(material);
      Object.values(material as unknown as Record<string, unknown>).forEach(
        (value) => {
          if (value instanceof THREE.Texture) {
            textures.add(value as THREE.Texture<unknown>);
          }
        },
      );
    });
  });

  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  scene.clear();
}

function createSceneRuntime(options: RuntimeOptions): SceneRuntime {
  const {
    copy,
    canvas,
    labelElement,
    objects,
    quality,
    callbacksRef,
    initialObjectId,
    onInternalGraphicsState,
  } = options;

  const contextAttributes: WebGLContextAttributes = {
    alpha: false,
    antialias: quality.antialias,
    depth: true,
    powerPreference: quality.id === "low" ? "low-power" : "high-performance",
    preserveDrawingBuffer: false,
    stencil: false,
  };
  const context = canvas.getContext("webgl2", contextAttributes);
  if (!context) {
    throw new UnsupportedGraphicsError();
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: quality.antialias,
    alpha: false,
    powerPreference: contextAttributes.powerPreference,
    logarithmicDepthBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = quality.id === "scientific" ? 0.94 : 1.08;
  renderer.setClearColor("#02040a", 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.015, 520);
  const target = new THREE.Vector3();
  const worldOrigin = new THREE.Vector3();
  const worldRoot = new THREE.Group();
  worldRoot.name = "floating-origin render root";
  scene.add(worldRoot);

  const objectById = new Map(objects.map((object) => [object.id, object]));
  const currentPositionById = new Map(
    objects.map((object) => [object.id, object.renderPosition]),
  );
  const positionFor = (object: CosmosSceneObject): RenderPosition =>
    currentPositionById.get(object.id) ?? object.renderPosition;
  const initialObject =
    objectById.get(initialObjectId) ?? objectById.get("earth") ?? objects[0];
  if (initialObject) {
    target.fromArray(positionFor(initialObject));
  }
  camera.position.copy(target).add(new THREE.Vector3(0, 3.4, 13.5));
  camera.lookAt(target);

  const ambient = new THREE.HemisphereLight("#9dbde4", "#080b12", 1.25);
  ambient.name = "physically inspired ambient field";
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight("#fff0d1", 2.1);
  keyLight.position.set(4, 8, 11);
  keyLight.name = "marker key light";
  scene.add(keyLight);

  const pointObjects = objects.filter(
    (object) => object.markerKind === "catalogue-point",
  );
  const pointBatch = createCataloguePointBatch(
    pointObjects,
    Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap),
  );
  if (pointBatch) {
    worldRoot.add(pointBatch.points);
  }

  const markerKinds: readonly Exclude<CosmosMarkerKind, "catalogue-point">[] = [
    "catalogue-object",
    "derived-structure",
    "conceptual-model",
  ];
  const markerBatches = markerKinds
    .map((kind) =>
      createMarkerBatch(
        kind,
        objects.filter((object) => object.markerKind === kind),
        quality,
      ),
    )
    .filter((batch): batch is MarkerBatch => batch !== null);
  markerBatches.forEach((batch) => worldRoot.add(batch.mesh));

  const referenceGrid = createReferenceGrid(quality);
  const orbitGuides = createOrbitGuides(objects);
  worldRoot.add(referenceGrid, orbitGuides);

  const proceduralBackground = createProceduralBackground(
    quality,
    Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap),
  );
  scene.add(proceduralBackground);

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const temporaryVector = new THREE.Vector3();
  const temporaryVectorB = new THREE.Vector3();
  const transform = new THREE.Object3D();
  const selectedColour = new THREE.Color();
  const originalColour = new THREE.Color();
  const keysDown = new Set<string>();
  const activePointers = new Map<number, { x: number; y: number }>();
  const pickableObjects: THREE.Object3D[] = [
    ...(pointBatch ? [pointBatch.points] : []),
    ...markerBatches.map((batch) => batch.mesh),
  ];
  let selectedId: string | null = initialObject?.id ?? null;
  let hoveredId: string | null = null;
  let labelsVisible = true;
  let reducedMotion = options.reducedMotion;
  let cameraMode = options.cameraMode;
  let navigationSpeed = Math.min(4, Math.max(0.25, options.navigationSpeed));
  let flight: FlightState | null = null;
  let animationFrame = 0;
  let running = false;
  let disposed = false;
  let contextLost = false;
  let contextFailureTimer = 0;
  let previousFrameTime = performance.now();
  let diagnosticWindowStarted = previousFrameTime;
  let diagnosticFrameCount = 0;
  let diagnosticFrameDurationMs = 0;
  let lastCameraEmission = 0;
  let lastLabelUpdate = 0;
  let cameraDirty = true;
  let pointerMoved = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartTime = 0;
  let primaryPointerId: number | null = null;
  let pointerMode: "rotate" | "pan" = "rotate";
  let hadMultiTouch = false;
  let pinchDistance = 0;
  let pinchCentreX = 0;
  let pinchCentreY = 0;
  let pendingHoverPoint: { readonly x: number; readonly y: number } | null =
    null;
  let previousGamepadSelectPressed = false;
  let previousGamepadResetPressed = false;
  let gamepadNavigationActive = false;

  const emitGraphicsState = (
    state: CosmosGraphicsState,
    message: string,
  ): void => {
    onInternalGraphicsState(state);
    callbacksRef.current.onGraphicsStateChange?.({ state, message });
  };

  const pixelRatio = (): number =>
    Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap);

  const resize = (): void => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(width, height, false);
    const dpr = renderer.getPixelRatio();
    if (pointBatch) {
      pointBatch.points.material.uniforms.uPixelRatio.value = dpr;
    }
    const backgroundPoints = proceduralBackground.children[0];
    if (
      backgroundPoints instanceof THREE.Points &&
      backgroundPoints.material instanceof THREE.ShaderMaterial
    ) {
      backgroundPoints.material.uniforms.uPixelRatio.value = dpr;
    }
    cameraDirty = true;
  };

  const updateMarkerPresentation = (): void => {
    const viewportHeight = Math.max(1, canvas.clientHeight);
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));

    markerBatches.forEach((batch) => {
      batch.objects.forEach((object, index) => {
        temporaryVector.fromArray(positionFor(object)).sub(worldOrigin);
        const distance = camera.position.distanceTo(temporaryVector);
        const worldPerPixel = (2 * distance * tangent) / viewportHeight;
        const selectedMultiplier = selectedId === object.id ? 1.72 : 1;
        const hoveredMultiplier = hoveredId === object.id ? 1.3 : 1;
        const minimumSize = 0.11 * object.visualScale;
        const screenAwareSize = worldPerPixel * 6.2;
        const maximumSize = 1.45 * object.visualScale;
        const scale =
          clamp(screenAwareSize, minimumSize, maximumSize) *
          object.importance *
          selectedMultiplier *
          hoveredMultiplier;

        transform.position.fromArray(positionFor(object));
        if (object.markerKind === "derived-structure") {
          transform.quaternion.copy(camera.quaternion);
        } else {
          transform.quaternion.identity();
        }
        transform.scale.setScalar(scale);
        transform.updateMatrix();
        batch.mesh.setMatrixAt(index, transform.matrix);

        originalColour.set(object.colour);
        if (selectedId === object.id) {
          selectedColour
            .copy(originalColour)
            .lerp(new THREE.Color("#ffffff"), 0.52);
          batch.mesh.setColorAt(index, selectedColour);
        } else if (hoveredId === object.id) {
          selectedColour
            .copy(originalColour)
            .lerp(new THREE.Color("#d8efff"), 0.28);
          batch.mesh.setColorAt(index, selectedColour);
        } else {
          batch.mesh.setColorAt(index, originalColour);
        }
      });
      batch.mesh.instanceMatrix.needsUpdate = true;
      if (batch.mesh.instanceColor) {
        batch.mesh.instanceColor.needsUpdate = true;
      }
    });

    if (pointBatch) {
      pointBatch.objects.forEach((object, index) => {
        const selectedMultiplier = selectedId === object.id ? 1.62 : 1;
        const hoveredMultiplier = hoveredId === object.id ? 1.28 : 1;
        pointBatch.sizeAttribute.setX(
          index,
          pointBatch.baseSizes[index] * selectedMultiplier * hoveredMultiplier,
        );
      });
      pointBatch.sizeAttribute.needsUpdate = true;
    }
  };

  const updateLabel = (now: number, force = false): void => {
    if (!force && now - lastLabelUpdate < 45) {
      return;
    }
    lastLabelUpdate = now;
    if (!labelsVisible) {
      labelElement.style.opacity = "0";
      return;
    }
    const activeId = hoveredId ?? selectedId;
    const object = activeId ? objectById.get(activeId) : undefined;
    if (!object) {
      labelElement.style.opacity = "0";
      return;
    }

    camera.updateMatrixWorld();
    projected.fromArray(positionFor(object)).sub(worldOrigin).project(camera);
    const visible =
      projected.z > -1 &&
      projected.z < 1 &&
      Math.abs(projected.x) <= 1.08 &&
      Math.abs(projected.y) <= 1.08;
    if (!visible) {
      labelElement.style.opacity = "0";
      return;
    }

    const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight;
    const recordLabel =
      object.recordKind === "catalogue-backed"
        ? copy.recordLabels.catalogue
        : object.recordKind === "derived-structure"
          ? copy.recordLabels.derivedStructure
          : object.recordKind === "procedural-context"
            ? copy.recordLabels.proceduralContext
            : copy.recordLabels.conceptualModel;
    labelElement.textContent = `${object.name} · ${object.scaleLabel} · ${recordLabel}`;
    labelElement.style.transform = `translate3d(${Math.round(x + 12)}px, ${Math.round(y - 18)}px, 0)`;
    labelElement.style.opacity = "1";
  };

  const emitCameraSnapshot = (now: number, force = false): void => {
    if (!cameraDirty || (!force && now - lastCameraEmission < 220)) {
      return;
    }
    lastCameraEmission = now;
    const worldCamera = temporaryVector.copy(camera.position).add(worldOrigin);
    const worldTarget = temporaryVectorB.copy(target).add(worldOrigin);
    let nearestLayer = cosmicScaleLayers[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    cosmicScaleLayers.forEach((layer) => {
      const centre = layerCentre(layer.id);
      const distance = Math.abs(worldTarget.z - centre[2]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestLayer = layer;
      }
    });

    callbacksRef.current.onCameraChange?.({
      position: [worldCamera.x, worldCamera.y, worldCamera.z],
      target: [worldTarget.x, worldTarget.y, worldTarget.z],
      distanceFromTarget: camera.position.distanceTo(target),
      nearestScaleLayerId: nearestLayer.id,
      referenceFrame: nearestLayer.referenceFrame,
      coordinateSpace: "schematic-render-space",
    });
    cameraDirty = false;
  };

  const cancelFlight = (status: "interrupted" | "superseded"): void => {
    if (!flight) {
      return;
    }
    const cancelled = flight;
    flight = null;
    callbacksRef.current.onFlightEnd?.({
      objectId: cancelled.objectId,
      requestId: cancelled.requestId,
      status,
    });
  };

  const interruptFlight = (): void => {
    cancelFlight("interrupted");
  };

  const rotateCamera = (deltaX: number, deltaY: number): void => {
    temporaryVector.copy(camera.position).sub(target);
    const spherical = new THREE.Spherical().setFromVector3(temporaryVector);
    const sensitivity = cameraMode === "scientific" ? 0.0028 : 0.0036;
    spherical.theta -= deltaX * sensitivity;
    spherical.phi = clamp(
      spherical.phi + deltaY * sensitivity,
      0.045,
      Math.PI - 0.045,
    );
    temporaryVector.setFromSpherical(spherical);
    camera.position.copy(target).add(temporaryVector);
    camera.lookAt(target);
    cameraDirty = true;
  };

  const panCamera = (deltaX: number, deltaY: number): void => {
    const distance = camera.position.distanceTo(target);
    const worldPerPixel =
      (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) /
      Math.max(1, canvas.clientHeight);
    camera.getWorldDirection(temporaryVector);
    temporaryVectorB.crossVectors(temporaryVector, camera.up).normalize();
    const up = new THREE.Vector3()
      .crossVectors(temporaryVectorB, temporaryVector)
      .normalize();
    const movement = temporaryVectorB
      .multiplyScalar(-deltaX * worldPerPixel)
      .add(up.multiplyScalar(deltaY * worldPerPixel));
    camera.position.add(movement);
    target.add(movement);
    cameraDirty = true;
  };

  const dollyCamera = (delta: number): void => {
    temporaryVector.copy(camera.position).sub(target);
    const distance = temporaryVector.length();
    const requestedDistance = clamp(
      distance * Math.exp(delta * 0.0012),
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    );
    temporaryVector.setLength(requestedDistance);
    camera.position.copy(target).add(temporaryVector);
    camera.lookAt(target);
    cameraDirty = true;
  };

  const translateCamera = (
    rightAmount: number,
    upAmount: number,
    forwardAmount: number,
  ): void => {
    camera.getWorldDirection(temporaryVector);
    temporaryVectorB.crossVectors(temporaryVector, camera.up).normalize();
    const up = new THREE.Vector3()
      .crossVectors(temporaryVectorB, temporaryVector)
      .normalize();
    const movement = temporaryVectorB
      .multiplyScalar(rightAmount)
      .add(up.multiplyScalar(upAmount))
      .add(temporaryVector.multiplyScalar(forwardAmount));
    camera.position.add(movement);
    target.add(movement);
    cameraDirty = true;
  };

  const setHovered = (id: string | null): void => {
    if (hoveredId === id) {
      return;
    }
    hoveredId = id;
    canvas.style.cursor = id
      ? "pointer"
      : activePointers.size > 0
        ? "grabbing"
        : "grab";
    updateMarkerPresentation();
    updateLabel(performance.now(), true);
    callbacksRef.current.onHoverObject?.(
      id ? (objectById.get(id) ?? null) : null,
    );
  };

  const setSelected = (id: string | null): void => {
    selectedId = id && objectById.has(id) ? id : null;
    updateMarkerPresentation();
    updateLabel(performance.now(), true);
  };

  const setSimulationTime = (timeMs: number): void => {
    if (!Number.isFinite(timeMs)) return;
    const trackedObject = selectedId ? objectById.get(selectedId) : undefined;
    const previousTrackedPosition = trackedObject
      ? new THREE.Vector3().fromArray(positionFor(trackedObject))
      : null;

    const timedObjects = applyEducationalOrbitModel(objects, new Date(timeMs));
    timedObjects.forEach((object) => {
      currentPositionById.set(object.id, object.renderPosition);
    });

    if (pointBatch) {
      const positionArray = pointBatch.positionAttribute.array as Float32Array;
      pointBatch.objects.forEach((object, index) => {
        const position = positionFor(object);
        const offset = index * 3;
        positionArray[offset] = position[0];
        positionArray[offset + 1] = position[1];
        positionArray[offset + 2] = position[2];
      });
      pointBatch.positionAttribute.needsUpdate = true;
      pointBatch.points.geometry.computeBoundingSphere();
    }

    if (trackedObject && previousTrackedPosition && !flight) {
      const nextTrackedPosition = new THREE.Vector3().fromArray(
        positionFor(trackedObject),
      );
      const movement = nextTrackedPosition.sub(previousTrackedPosition);
      target.add(movement);
      camera.position.add(movement);
    }

    updateMarkerPresentation();
    updateLabel(performance.now(), true);
    cameraDirty = true;
  };

  const pickObject = (
    clientX: number,
    clientY: number,
  ): CosmosSceneObject | null => {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }
    pointerNdc.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointerNdc, camera);
    raycaster.params.Points = {
      threshold: Math.max(0.11, camera.position.distanceTo(target) * 0.011),
    };
    const intersections = raycaster.intersectObjects(pickableObjects, false);
    for (const intersection of intersections) {
      if (pointBatch && intersection.object === pointBatch.points) {
        const index = intersection.index;
        if (index !== undefined) {
          return pointBatch.objects[index] ?? null;
        }
      }
      if (intersection.object instanceof THREE.InstancedMesh) {
        const batch = markerBatches.find(
          (candidate) => candidate.mesh === intersection.object,
        );
        if (batch && intersection.instanceId !== undefined) {
          return batch.objects[intersection.instanceId] ?? null;
        }
      }
    }
    return null;
  };

  const pickAtCanvasCentre = (): CosmosSceneObject | null => {
    const bounds = canvas.getBoundingClientRect();
    return pickObject(
      bounds.left + bounds.width * 0.5,
      bounds.top + bounds.height * 0.5,
    );
  };

  const beginFlight = (request: CosmosFlyToRequest): void => {
    const object = objectById.get(request.objectId);
    if (!object) {
      callbacksRef.current.onFlightEnd?.({
        objectId: request.objectId,
        requestId: request.requestId,
        status: "target-missing",
      });
      return;
    }

    cancelFlight("superseded");
    const endTargetWorld = new THREE.Vector3().fromArray(positionFor(object));
    const startCameraWorld = camera.position.clone().add(worldOrigin);
    const startTargetWorld = target.clone().add(worldOrigin);
    const direction = startCameraWorld.clone().sub(startTargetWorld);
    if (request.orientation) {
      const yaw = THREE.MathUtils.degToRad(
        Number.isFinite(request.orientation.yawDeg)
          ? request.orientation.yawDeg
          : 0,
      );
      const pitch = THREE.MathUtils.degToRad(
        clamp(
          Number.isFinite(request.orientation.pitchDeg)
            ? request.orientation.pitchDeg
            : 0,
          -89.9,
          89.9,
        ),
      );
      const cosinePitch = Math.cos(pitch);
      direction.set(
        -Math.sin(yaw) * cosinePitch,
        -Math.sin(pitch),
        Math.cos(yaw) * cosinePitch,
      );
    } else {
      if (direction.lengthSq() < 0.0001) {
        direction.set(0, 0.2, 1);
      }
      direction.normalize();
    }
    const suggestedDistance = clamp(4.6 * object.visualScale + 2.8, 4.2, 13);
    const requestedCameraDistance =
      request.cameraDistance !== undefined &&
      Number.isFinite(request.cameraDistance) &&
      request.cameraDistance > 0
        ? request.cameraDistance
        : suggestedDistance;
    const cameraDistance = clamp(
      requestedCameraDistance,
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    );
    const endCameraWorld = endTargetWorld
      .clone()
      .add(direction.normalize().multiplyScalar(cameraDistance));
    if (!request.orientation) {
      endCameraWorld.y +=
        cameraMode === "cinematic" && !reducedMotion
          ? Math.min(2.1, cameraDistance * 0.12)
          : 0;
    }
    const endRollRad = THREE.MathUtils.degToRad(
      request.orientation && Number.isFinite(request.orientation.rollDeg)
        ? request.orientation.rollDeg
        : 0,
    );
    const endCamera = new THREE.Object3D();
    endCamera.position.copy(endCameraWorld);
    endCamera.lookAt(endTargetWorld);
    endCamera.rotateZ(endRollRad);
    const startCameraQuaternion = camera.quaternion.clone();
    const endCameraQuaternion = endCamera.quaternion.clone();
    const requestedDuration =
      request.durationMs !== undefined &&
      Number.isFinite(request.durationMs) &&
      request.durationMs >= 0
        ? request.durationMs
        : DEFAULT_FLIGHT_DURATION_MS;
    const durationMs =
      reducedMotion ||
      request.transitionStyle === "cut" ||
      request.transitionStyle === "fade"
        ? 0
        : clamp(requestedDuration, 180, 12_000);

    if (durationMs === 0) {
      target.copy(endTargetWorld).sub(worldOrigin);
      camera.position.copy(endCameraWorld).sub(worldOrigin);
      camera.quaternion.copy(endCameraQuaternion);
      cameraDirty = true;
      setSelected(object.id);
      callbacksRef.current.onFlightEnd?.({
        objectId: request.objectId,
        requestId: request.requestId,
        status: "completed",
      });
      return;
    }

    flight = {
      objectId: request.objectId,
      requestId: request.requestId,
      startedAt: performance.now(),
      durationMs,
      startCameraWorld,
      startTargetWorld,
      endCameraWorld,
      endTargetWorld,
      startCameraQuaternion,
      endCameraQuaternion,
      targetLock: request.targetLock ?? true,
      endRollRad,
    };
  };

  const updateFlight = (now: number): void => {
    if (!flight) {
      return;
    }
    const activeFlight = flight;
    const linearProgress =
      (now - activeFlight.startedAt) / activeFlight.durationMs;
    const progress = smoothstep(linearProgress);
    const arc =
      cameraMode === "cinematic" && quality.decorativeMotion
        ? Math.sin(progress * Math.PI) *
          Math.min(
            3.2,
            activeFlight.startCameraWorld.distanceTo(
              activeFlight.endCameraWorld,
            ) * 0.055,
          )
        : 0;
    temporaryVector
      .copy(activeFlight.startCameraWorld)
      .lerp(activeFlight.endCameraWorld, progress);
    temporaryVector.y += arc;
    temporaryVectorB
      .copy(activeFlight.startTargetWorld)
      .lerp(activeFlight.endTargetWorld, progress);
    camera.position.copy(temporaryVector).sub(worldOrigin);
    target.copy(temporaryVectorB).sub(worldOrigin);
    if (activeFlight.targetLock) {
      camera.lookAt(target);
      if (activeFlight.endRollRad !== 0) {
        camera.rotateZ(activeFlight.endRollRad * progress);
      }
    } else {
      camera.quaternion
        .copy(activeFlight.startCameraQuaternion)
        .slerp(activeFlight.endCameraQuaternion, progress);
    }
    cameraDirty = true;

    if (linearProgress >= 1) {
      flight = null;
      setSelected(activeFlight.objectId);
      callbacksRef.current.onFlightEnd?.({
        objectId: activeFlight.objectId,
        requestId: activeFlight.requestId,
        status: "completed",
      });
      emitCameraSnapshot(now, true);
    }
  };

  const updateKeyboard = (deltaSeconds: number): void => {
    if (keysDown.size === 0) {
      return;
    }
    const fast = keysDown.has("ShiftLeft") || keysDown.has("ShiftRight");
    const speed =
      Math.max(0.6, camera.position.distanceTo(target) * 0.48) *
      (fast ? 3 : 1) *
      navigationSpeed *
      deltaSeconds;
    let right = 0;
    let up = 0;
    let forward = 0;

    if (keysDown.has("KeyA")) right -= speed;
    if (keysDown.has("KeyD")) right += speed;
    if (keysDown.has("KeyQ")) up -= speed;
    if (keysDown.has("KeyE")) up += speed;
    if (keysDown.has("KeyW")) forward += speed;
    if (keysDown.has("KeyS")) forward -= speed;
    if (right !== 0 || up !== 0 || forward !== 0) {
      translateCamera(right, up, forward);
    }

    const rotationSpeed = 72 * deltaSeconds;
    if (keysDown.has("ArrowLeft")) rotateCamera(rotationSpeed, 0);
    if (keysDown.has("ArrowRight")) rotateCamera(-rotationSpeed, 0);
    if (keysDown.has("ArrowUp")) rotateCamera(0, -rotationSpeed);
    if (keysDown.has("ArrowDown")) rotateCamera(0, rotationSpeed);
    if (keysDown.has("Equal") || keysDown.has("NumpadAdd")) {
      dollyCamera(-500 * navigationSpeed * deltaSeconds);
    }
    if (keysDown.has("Minus") || keysDown.has("NumpadSubtract")) {
      dollyCamera(500 * navigationSpeed * deltaSeconds);
    }
  };

  const gamepadAxis = (value: number | undefined): number => {
    const axis = value ?? 0;
    return Math.abs(axis) < 0.14 ? 0 : axis;
  };

  const updateGamepad = (deltaSeconds: number): void => {
    if (typeof navigator.getGamepads !== "function") {
      return;
    }
    const gamepad = Array.from(navigator.getGamepads()).find(
      (candidate): candidate is Gamepad =>
        candidate !== null && candidate.connected,
    );
    if (!gamepad) {
      previousGamepadSelectPressed = false;
      previousGamepadResetPressed = false;
      gamepadNavigationActive = false;
      return;
    }

    const leftX = gamepadAxis(gamepad.axes[0]);
    const leftY = gamepadAxis(gamepad.axes[1]);
    const rightX = gamepadAxis(gamepad.axes[2]);
    const rightY = gamepadAxis(gamepad.axes[3]);
    const navigationScale =
      Math.max(0.6, camera.position.distanceTo(target) * 0.42) *
      navigationSpeed *
      deltaSeconds;
    const navigating =
      leftX !== 0 ||
      leftY !== 0 ||
      rightX !== 0 ||
      rightY !== 0 ||
      Math.abs(
        (gamepad.buttons[7]?.value ?? 0) - (gamepad.buttons[6]?.value ?? 0),
      ) > 0.05;
    if (navigating && !gamepadNavigationActive) {
      callbacksRef.current.onUserInteraction?.("gamepad");
    }
    gamepadNavigationActive = navigating;
    if (leftX !== 0 || leftY !== 0) {
      interruptFlight();
      translateCamera(leftX * navigationScale, 0, leftY * -navigationScale);
    }
    if (rightX !== 0 || rightY !== 0) {
      interruptFlight();
      rotateCamera(rightX * 105 * deltaSeconds, rightY * 105 * deltaSeconds);
    }

    const zoom =
      (gamepad.buttons[7]?.value ?? 0) - (gamepad.buttons[6]?.value ?? 0);
    if (Math.abs(zoom) > 0.05) {
      interruptFlight();
      dollyCamera(zoom * 460 * navigationSpeed * deltaSeconds);
    }

    const selectPressed = gamepad.buttons[0]?.pressed ?? false;
    if (selectPressed && !previousGamepadSelectPressed) {
      callbacksRef.current.onUserInteraction?.("gamepad");
      const object = pickAtCanvasCentre();
      setSelected(object?.id ?? null);
      callbacksRef.current.onSelectObject?.(object);
    }
    previousGamepadSelectPressed = selectPressed;

    const resetPressed = gamepad.buttons[9]?.pressed ?? false;
    if (resetPressed && !previousGamepadResetPressed) {
      callbacksRef.current.onUserInteraction?.("gamepad");
      const resetObject =
        objectById.get(initialObjectId) ??
        objectById.get("earth") ??
        objects[0];
      if (resetObject) {
        beginFlight({
          objectId: resetObject.id,
          requestId: `gamepad-reset-${performance.now()}`,
          durationMs: 700,
        });
      }
    }
    previousGamepadResetPressed = resetPressed;
  };

  const rebaseFloatingOrigin = (): void => {
    if (camera.position.length() < FLOATING_ORIGIN_THRESHOLD) {
      return;
    }
    const shift = camera.position.clone();
    worldOrigin.add(shift);
    camera.position.sub(shift);
    target.sub(shift);
    worldRoot.position.copy(worldOrigin).multiplyScalar(-1);
    cameraDirty = true;
  };

  const animate = (now: number): void => {
    if (!running || disposed) {
      return;
    }
    animationFrame = window.requestAnimationFrame(animate);
    const rawFrameDurationMs = Math.max(0, now - previousFrameTime);
    const deltaSeconds = Math.min(0.05, rawFrameDurationMs / 1_000);
    previousFrameTime = now;
    if (rawFrameDurationMs <= 250) {
      diagnosticFrameCount += 1;
      diagnosticFrameDurationMs += rawFrameDurationMs;
    }
    const diagnosticElapsed = now - diagnosticWindowStarted;
    if (diagnosticElapsed >= 5_000 && diagnosticFrameCount > 0) {
      recordAtlasDiagnostic({
        kind: "renderer",
        name: "frame-rate",
        value: (diagnosticFrameCount * 1_000) / diagnosticElapsed,
        unit: "fps",
      });
      recordAtlasDiagnostic({
        kind: "renderer",
        name: "average-frame-time",
        value: diagnosticFrameDurationMs / diagnosticFrameCount,
        unit: "ms",
      });
      diagnosticWindowStarted = now;
      diagnosticFrameCount = 0;
      diagnosticFrameDurationMs = 0;
    }
    updateKeyboard(deltaSeconds);
    updateGamepad(deltaSeconds);
    updateFlight(now);
    rebaseFloatingOrigin();
    proceduralBackground.position.copy(camera.position);

    if (pendingHoverPoint && activePointers.size === 0) {
      const object = pickObject(pendingHoverPoint.x, pendingHoverPoint.y);
      pendingHoverPoint = null;
      setHovered(object?.id ?? null);
    }

    if (cameraDirty) {
      updateMarkerPresentation();
    }
    updateLabel(now);
    emitCameraSnapshot(now);
    renderer.render(scene, camera);
  };

  const startRendering = (): void => {
    if (running || disposed || contextLost || document.hidden) {
      return;
    }
    running = true;
    previousFrameTime = performance.now();
    diagnosticWindowStarted = previousFrameTime;
    diagnosticFrameCount = 0;
    diagnosticFrameDurationMs = 0;
    animationFrame = window.requestAnimationFrame(animate);
  };

  const stopRendering = (): void => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
  };

  const handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    callbacksRef.current.onUserInteraction?.("pointer");
    interruptFlight();
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail when a browser cancels a gesture mid-event.
    }
    if (primaryPointerId === null) {
      primaryPointerId = event.pointerId;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      pointerStartTime = performance.now();
      pointerMoved = false;
      hadMultiTouch = false;
      pointerMode =
        event.button === 1 || event.button === 2 || event.shiftKey
          ? "pan"
          : "rotate";
    }
    if (activePointers.size >= 2) {
      hadMultiTouch = true;
      const pointerValues = [...activePointers.values()];
      const first = pointerValues[0];
      const second = pointerValues[1];
      pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
      pinchCentreX = (first.x + second.x) * 0.5;
      pinchCentreY = (first.y + second.y) * 0.5;
    }
    canvas.style.cursor = "grabbing";
  };

  const handlePointerMove = (event: PointerEvent): void => {
    const previous = activePointers.get(event.pointerId);
    if (!previous) {
      if (event.pointerType === "mouse") {
        pendingHoverPoint = { x: event.clientX, y: event.clientY };
      }
      return;
    }
    event.preventDefault();
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const distanceFromStart = Math.hypot(
      event.clientX - pointerStartX,
      event.clientY - pointerStartY,
    );
    if (distanceFromStart > 4) {
      pointerMoved = true;
    }

    if (activePointers.size >= 2) {
      const pointerValues = [...activePointers.values()];
      const first = pointerValues[0];
      const second = pointerValues[1];
      const nextDistance = Math.hypot(second.x - first.x, second.y - first.y);
      const nextCentreX = (first.x + second.x) * 0.5;
      const nextCentreY = (first.y + second.y) * 0.5;
      if (pinchDistance > 0) {
        dollyCamera((pinchDistance - nextDistance) * 3.2 * navigationSpeed);
        panCamera(nextCentreX - pinchCentreX, nextCentreY - pinchCentreY);
      }
      pinchDistance = nextDistance;
      pinchCentreX = nextCentreX;
      pinchCentreY = nextCentreY;
      return;
    }

    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    if (pointerMode === "pan") {
      panCamera(deltaX, deltaY);
    } else {
      rotateCamera(deltaX, deltaY);
    }
  };

  const finishPointer = (event: PointerEvent): void => {
    const wasPrimary = event.pointerId === primaryPointerId;
    activePointers.delete(event.pointerId);
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already have been released by the browser.
    }
    if (
      event.type === "pointerup" &&
      wasPrimary &&
      !pointerMoved &&
      !hadMultiTouch &&
      performance.now() - pointerStartTime < 650
    ) {
      const object = pickObject(event.clientX, event.clientY);
      setSelected(object?.id ?? null);
      callbacksRef.current.onSelectObject?.(object);
    }
    if (wasPrimary) {
      primaryPointerId = activePointers.keys().next().value ?? null;
    }
    if (activePointers.size < 2) {
      pinchDistance = 0;
    }
    canvas.style.cursor = hoveredId
      ? "pointer"
      : activePointers.size > 0
        ? "grabbing"
        : "grab";
  };

  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    callbacksRef.current.onUserInteraction?.("wheel");
    interruptFlight();
    const unitScale =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? canvas.clientHeight
          : 1;
    dollyCamera(event.deltaY * unitScale * navigationSpeed);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    const navigationKeys = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyQ",
      "KeyE",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Equal",
      "Minus",
      "NumpadAdd",
      "NumpadSubtract",
      "ShiftLeft",
      "ShiftRight",
      "Escape",
      "Home",
      "Enter",
      "Space",
    ]);
    if (!navigationKeys.has(event.code)) {
      return;
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      keysDown.add(event.code);
      return;
    }
    event.preventDefault();
    if (!event.repeat) {
      callbacksRef.current.onUserInteraction?.("keyboard");
    }
    if (event.code === "Escape") {
      interruptFlight();
      return;
    }
    if (event.code === "Home") {
      const resetObject =
        objectById.get(initialObjectId) ??
        objectById.get("earth") ??
        objects[0];
      if (resetObject) {
        beginFlight({
          objectId: resetObject.id,
          requestId: `keyboard-reset-${performance.now()}`,
          durationMs: 700,
        });
      }
      return;
    }
    if (event.code === "Enter" || event.code === "Space") {
      const object = hoveredId
        ? (objectById.get(hoveredId) ?? null)
        : pickAtCanvasCentre();
      setSelected(object?.id ?? null);
      callbacksRef.current.onSelectObject?.(object);
      return;
    }
    interruptFlight();
    keysDown.add(event.code);
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    keysDown.delete(event.code);
  };

  const handleBlur = (): void => {
    keysDown.clear();
  };

  const handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  const handleContextLost = (event: Event): void => {
    event.preventDefault();
    contextLost = true;
    stopRendering();
    reportCodedClientError("webgl-context-lost");
    emitGraphicsState("context-lost", copy.statusContextLost);
    window.clearTimeout(contextFailureTimer);
    contextFailureTimer = window.setTimeout(() => {
      if (contextLost && !disposed) {
        reportCodedClientError("webgl-context-recovery-failed");
        onInternalGraphicsState("failed");
        callbacksRef.current.onGraphicsStateChange?.({
          state: "failed",
          message: copy.statusContextRecoveryFailed,
        });
      }
    }, 6_000);
  };

  const handleContextRestored = (): void => {
    contextLost = false;
    window.clearTimeout(contextFailureTimer);
    renderer.resetState();
    resize();
    updateMarkerPresentation();
    emitGraphicsState("context-restored", copy.statusContextRestored);
    onInternalGraphicsState("ready");
    startRendering();
  };

  const handleVisibility = (): void => {
    if (document.hidden) {
      stopRendering();
    } else {
      startRendering();
    }
  };

  canvas.addEventListener("pointerdown", handlePointerDown, {
    passive: false,
  });
  canvas.addEventListener("pointermove", handlePointerMove, {
    passive: false,
  });
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("keydown", handleKeyDown);
  canvas.addEventListener("keyup", handleKeyUp);
  canvas.addEventListener("blur", handleBlur);
  canvas.addEventListener("contextmenu", handleContextMenu);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);
  document.addEventListener("visibilitychange", handleVisibility);

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener("resize", resize);
  }

  resize();
  updateMarkerPresentation();
  updateLabel(performance.now(), true);
  rebaseFloatingOrigin();
  renderer.render(scene, camera);
  startRendering();
  callbacksRef.current.onQualityResolved?.(quality.id);
  emitGraphicsState(
    "ready",
    formatUiMessage(copy.statusReady, { quality: quality.id }),
  );

  return {
    setSelected,
    setProceduralVisible(visible) {
      proceduralBackground.visible = visible;
    },
    setGridVisible(visible) {
      referenceGrid.visible = visible;
    },
    setOrbitsVisible(visible) {
      orbitGuides.visible = visible;
    },
    setLabelsVisible(visible) {
      labelsVisible = visible;
      updateLabel(performance.now(), true);
    },
    setReducedMotion(nextReducedMotion) {
      reducedMotion = nextReducedMotion;
      if (reducedMotion && flight) {
        const activeFlight = flight;
        target.copy(activeFlight.endTargetWorld).sub(worldOrigin);
        camera.position.copy(activeFlight.endCameraWorld).sub(worldOrigin);
        camera.quaternion.copy(activeFlight.endCameraQuaternion);
        flight = null;
        setSelected(activeFlight.objectId);
        callbacksRef.current.onFlightEnd?.({
          objectId: activeFlight.objectId,
          requestId: activeFlight.requestId,
          status: "completed",
        });
        cameraDirty = true;
      }
    },
    setCameraMode(nextCameraMode) {
      cameraMode = nextCameraMode;
      camera.fov = cameraMode === "scientific" ? 44 : 48;
      camera.updateProjectionMatrix();
      renderer.toneMappingExposure = cameraMode === "scientific" ? 0.94 : 1.08;
      cameraDirty = true;
    },
    setNavigationSpeed(multiplier) {
      if (!Number.isFinite(multiplier)) return;
      navigationSpeed = Math.min(4, Math.max(0.25, multiplier));
    },
    setSimulationTime,
    flyTo: beginFlight,
    destroy() {
      disposed = true;
      stopRendering();
      window.clearTimeout(contextFailureTimer);
      resizeObserver?.disconnect();
      if (!resizeObserver) {
        window.removeEventListener("resize", resize);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("blur", handleBlur);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      activePointers.clear();
      keysDown.clear();
      gamepadNavigationActive = false;
      labelElement.style.opacity = "0";
      disposeScene(scene);
      renderer.renderLists.dispose();
      renderer.dispose();
    },
  };
}

function graphicsFallbackCopy(
  copy: UiCopy["cosmosScene"],
  state: CosmosGraphicsState,
): string {
  if (state === "context-lost") {
    return copy.fallbackContextLost;
  }
  if (state === "unsupported") {
    return copy.fallbackUnsupported;
  }
  return copy.fallbackFailed;
}

export function CosmosScene({
  copy,
  objects = DEFAULT_SCENE_OBJECTS,
  selectedObjectId,
  initialObjectId = "earth",
  flyTo,
  quality = "auto",
  showProceduralBackground = true,
  showGrid,
  showOrbits = true,
  showLabels = true,
  simulationTimeMs,
  reducedMotion,
  cameraMode = "cinematic",
  navigationSpeed = 1,
  className,
  style,
  ariaLabel,
  onSelectObject,
  onHoverObject,
  onUserInteraction,
  onFlightEnd,
  onCameraChange,
  onGraphicsStateChange,
  onQualityResolved,
}: CosmosSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const callbacksRef = useRef<CallbackBag>({});
  const presentationConfigRef = useRef<RuntimePresentationConfig>({
    selectedObjectId,
    showProceduralBackground,
    showGrid,
    showOrbits,
    showLabels,
    reducedMotion: reducedMotion ?? false,
    cameraMode,
    navigationSpeed,
  });
  const [graphicsState, setGraphicsState] =
    useState<CosmosGraphicsState>("initialising");
  const [activeQuality, setActiveQuality] =
    useState<ResolvedCosmosQuality>("medium");
  const [lastFlightResult, setLastFlightResult] =
    useState<CosmosFlightResult | null>(null);
  const [systemReducedMotion, setSystemReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [hasFocus, setHasFocus] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const instructionsId = useId();
  const proceduralDescriptionId = useId();

  const sceneObjects = useMemo(() => normaliseObjects(objects), [objects]);
  const effectiveReducedMotion = reducedMotion ?? systemReducedMotion;

  useEffect(() => {
    callbacksRef.current = {
      onSelectObject,
      onHoverObject,
      onUserInteraction,
      onFlightEnd: (result) => {
        setLastFlightResult(result);
        onFlightEnd?.(result);
      },
      onCameraChange,
      onGraphicsStateChange,
      onQualityResolved,
    };
  }, [
    onSelectObject,
    onHoverObject,
    onUserInteraction,
    onFlightEnd,
    onCameraChange,
    onGraphicsStateChange,
    onQualityResolved,
  ]);

  useEffect(() => {
    presentationConfigRef.current = {
      selectedObjectId,
      showProceduralBackground,
      showGrid,
      showOrbits,
      showLabels,
      reducedMotion: effectiveReducedMotion,
      cameraMode,
      navigationSpeed,
    };
  }, [
    selectedObjectId,
    showProceduralBackground,
    showGrid,
    showOrbits,
    showLabels,
    effectiveReducedMotion,
    cameraMode,
    navigationSpeed,
  ]);

  useEffect(() => {
    if (reducedMotion !== undefined) {
      return;
    }
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = (): void => {
      setSystemReducedMotion(preference.matches);
    };
    applyPreference();
    preference.addEventListener("change", applyPreference);
    return () => {
      preference.removeEventListener("change", applyPreference);
    };
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const labelElement = labelRef.current;
    if (!canvas || !labelElement) {
      return;
    }

    const resolvedQuality =
      quality === "auto" ? detectAutomaticQuality() : quality;
    setActiveQuality(resolvedQuality);
    setGraphicsState("initialising");

    try {
      const presentation = presentationConfigRef.current;
      const runtime = createSceneRuntime({
        copy,
        canvas,
        labelElement,
        objects: sceneObjects,
        quality: QUALITY_PROFILES[resolvedQuality],
        initialObjectId: presentation.selectedObjectId ?? initialObjectId,
        callbacksRef,
        reducedMotion: false,
        cameraMode: "cinematic",
        navigationSpeed: presentation.navigationSpeed,
        onInternalGraphicsState: setGraphicsState,
      });
      runtimeRef.current = runtime;
      if (presentation.selectedObjectId !== undefined) {
        runtime.setSelected(presentation.selectedObjectId);
      }
      runtime.setProceduralVisible(presentation.showProceduralBackground);
      runtime.setGridVisible(
        presentation.showGrid ?? resolvedQuality === "scientific",
      );
      runtime.setOrbitsVisible(presentation.showOrbits);
      runtime.setLabelsVisible(presentation.showLabels);
      runtime.setReducedMotion(presentation.reducedMotion);
      runtime.setCameraMode(presentation.cameraMode);
      runtime.setNavigationSpeed(presentation.navigationSpeed);
      return () => {
        runtimeRef.current = null;
        runtime.destroy();
      };
    } catch (error: unknown) {
      const unsupported = error instanceof UnsupportedGraphicsError;
      const nextState: CosmosGraphicsState = unsupported
        ? "unsupported"
        : "failed";
      const message = unsupported
        ? copy.statusUnsupported
        : copy.statusInitialisationFailed;
      const stateTimer = window.setTimeout(() => {
        setGraphicsState(nextState);
      }, 0);
      callbacksRef.current.onGraphicsStateChange?.({
        state: nextState,
        message,
      });
      return () => {
        window.clearTimeout(stateTimer);
      };
    }
  }, [copy, sceneObjects, quality, initialObjectId, retryToken]);

  useEffect(() => {
    if (selectedObjectId !== undefined) {
      runtimeRef.current?.setSelected(selectedObjectId);
    }
  }, [selectedObjectId]);

  useEffect(() => {
    runtimeRef.current?.setProceduralVisible(showProceduralBackground);
  }, [showProceduralBackground]);

  useEffect(() => {
    runtimeRef.current?.setGridVisible(
      showGrid ?? activeQuality === "scientific",
    );
  }, [showGrid, activeQuality]);

  useEffect(() => {
    runtimeRef.current?.setOrbitsVisible(showOrbits);
  }, [showOrbits]);

  useEffect(() => {
    runtimeRef.current?.setLabelsVisible(showLabels);
  }, [showLabels]);

  useEffect(() => {
    runtimeRef.current?.setReducedMotion(effectiveReducedMotion);
  }, [effectiveReducedMotion]);

  useEffect(() => {
    runtimeRef.current?.setCameraMode(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    runtimeRef.current?.setNavigationSpeed(navigationSpeed);
  }, [navigationSpeed]);

  useEffect(() => {
    if (simulationTimeMs !== undefined) {
      runtimeRef.current?.setSimulationTime(simulationTimeMs);
    }
  }, [simulationTimeMs]);

  useEffect(() => {
    if (flyTo) {
      runtimeRef.current?.flyTo(flyTo);
    }
  }, [flyTo]);

  const showFallback =
    graphicsState === "context-lost" ||
    graphicsState === "unsupported" ||
    graphicsState === "failed";

  return (
    <div
      className={className}
      data-cosmos-quality={activeQuality}
      data-graphics-state={graphicsState}
      data-flight-object-id={lastFlightResult?.objectId}
      data-flight-request-id={lastFlightResult?.requestId}
      data-flight-status={lastFlightResult?.status}
      data-flight-requested-duration-ms={flyTo?.durationMs}
      data-procedural-background={
        showProceduralBackground ? "visible" : "hidden"
      }
      style={{ ...WRAPPER_STYLE, ...style }}
    >
      <canvas
        ref={canvasRef}
        aria-describedby={`${instructionsId} ${proceduralDescriptionId}`}
        aria-label={ariaLabel ?? copy.defaultAriaLabel}
        role="application"
        tabIndex={0}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        style={{
          ...CANVAS_STYLE,
          outline: hasFocus ? "2px solid #8ed8ff" : "none",
          outlineOffset: hasFocus ? "-3px" : undefined,
        }}
      >
        {copy.canvasAlternative}
      </canvas>

      <div ref={labelRef} aria-hidden="true" style={LABEL_STYLE} />

      {showProceduralBackground ? (
        <div aria-hidden="true" style={CONTEXT_BADGE_STYLE}>
          {copy.illustrativeBackground}
        </div>
      ) : null}

      {showFallback ? (
        <div aria-live="polite" role="status" style={FALLBACK_STYLE}>
          <span>{graphicsFallbackCopy(copy, graphicsState)}</span>
          {graphicsState !== "context-lost" ? (
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              style={RETRY_BUTTON_STYLE}
            >
              {copy.retryView}
            </button>
          ) : null}
        </div>
      ) : null}

      <span id={instructionsId} style={SCREEN_READER_ONLY_STYLE}>
        {copy.keyboardInstructions}
      </span>
      <span id={proceduralDescriptionId} style={SCREEN_READER_ONLY_STYLE}>
        {copy.proceduralDescription}
      </span>
    </div>
  );
}

export default CosmosScene;
