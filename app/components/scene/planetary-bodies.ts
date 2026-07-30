/**
 * Individually rendered Solar System bodies.
 *
 * The main scene batches thousands of distant objects into instanced meshes
 * and point clouds. The named Solar System bodies are few enough to justify a
 * mesh each, which is what allows real surface character, rings, axial tilt,
 * and Sun-driven day/night terminators.
 *
 * Every surface is drawn mathematically. No image, texture, or third-party
 * artwork is loaded; the palettes and physical figures come from the cited
 * parameters in `lib/planetary-appearance.ts`. The result is an illustrative
 * depiction, never observational imagery.
 */
import * as THREE from "three";

import {
  compressedVisualRadius,
  planetaryAppearanceFor,
  type PlanetaryAppearance,
  type SurfacePalette,
} from "../../../lib/planetary-appearance";

const DEGREES_TO_RADIANS = Math.PI / 180;

/** Shared value-noise helpers used by every surface shader. */
const NOISE_CHUNK = /* glsl */ `
float atlasHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float atlasNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(atlasHash(i + vec3(0.0, 0.0, 0.0)), atlasHash(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(atlasHash(i + vec3(0.0, 1.0, 0.0)), atlasHash(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y),
    mix(
      mix(atlasHash(i + vec3(0.0, 0.0, 1.0)), atlasHash(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(atlasHash(i + vec3(0.0, 1.0, 1.0)), atlasHash(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y),
    f.z);
}

float atlasFbm(vec3 p) {
  float amplitude = 0.5;
  float total = 0.0;
  for (int index = 0; index < 5; index += 1) {
    total += amplitude * atlasNoise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return total;
}

float atlasRidged(vec3 p) {
  return 1.0 - abs(atlasFbm(p) * 2.0 - 1.0);
}

/**
 * Five-octave value noise clusters tightly around 0.5, so raw thresholds clip
 * almost all of the pattern away. This expands a chosen band of the
 * distribution back across the full 0-1 range so surface features are actually
 * visible.
 */
float atlasContrast(float value, float centre, float width) {
  return clamp((value - centre) / max(width, 0.0001) + 0.5, 0.0, 1.0);
}
`;

const SURFACE_VERTEX_SHADER = /* glsl */ `
varying vec3 vSurfaceDirection;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
  vSurfaceDirection = normalize(position);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDirection = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const SURFACE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec3 uAccent;
uniform vec3 uAtmosphere;
uniform float uAtmosphereStrength;
uniform vec3 uSunDirection;
uniform float uSpin;
uniform float uSelected;
uniform float uAmbient;

varying vec3 vSurfaceDirection;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

${NOISE_CHUNK}

// Rotate the sampling direction so the surface pattern turns with the body
// without re-uploading geometry.
vec3 spun(vec3 direction, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec3(direction.x * c - direction.z * s, direction.y, direction.x * s + direction.z * c);
}

void main() {
  vec3 dir = spun(vSurfaceDirection, uSpin);
  float latitude = dir.y;
  vec3 albedo;

#if defined(STYLE_STAR)
  float granulation = atlasFbm(dir * 9.0);
  float supergranulation = atlasFbm(dir * 3.1 + 4.7);
  albedo = mix(uLow, uMid, smoothstep(0.32, 0.68, granulation));
  albedo = mix(albedo, uHigh, smoothstep(0.55, 0.95, supergranulation));
  // Darker magnetic regions, kept subtle so the disc stays readable.
  albedo = mix(albedo, uAccent, smoothstep(0.86, 0.98, atlasRidged(dir * 5.0 + 12.0)) * 0.55);
  float limb = pow(max(dot(vWorldNormal, vViewDirection), 0.0), 0.45);
  albedo *= mix(0.55, 1.0, limb);
#elif defined(STYLE_GAS_GIANT) || defined(STYLE_ICE_GIANT)
  #if defined(STYLE_GAS_GIANT)
    float primaryBands = 26.0;
    float secondaryBands = 11.0;
    float warpAmount = 0.055;
    float streakStrength = 0.32;
  #else
    float primaryBands = 13.0;
    float secondaryBands = 6.0;
    float warpAmount = 0.03;
    float streakStrength = 0.14;
  #endif

  // Domain-warp latitude so belt boundaries wander instead of ruling straight
  // lines around the globe.
  float warp = atlasFbm(vec3(dir.x * 3.0, dir.y * 6.0, dir.z * 3.0)) - 0.5;
  float bandLatitude = latitude + warp * warpAmount;

  // Two incommensurate harmonics give belts of uneven width, as observed.
  float primary = sin(bandLatitude * primaryBands) * 0.5 + 0.5;
  float secondary = sin(bandLatitude * secondaryBands + 1.7) * 0.5 + 0.5;
  float banding = clamp(mix(primary, secondary, 0.38), 0.0, 1.0);

  albedo = mix(uLow, uMid, smoothstep(0.18, 0.82, banding));
  albedo = mix(albedo, uHigh, smoothstep(0.62, 0.97, banding) * 0.85);

  // Noise stretched along longitude reads as zonal flow rather than blobs.
  float streaks = atlasContrast(
    atlasFbm(vec3(dir.x * 2.4, dir.y * 34.0, dir.z * 2.4)), 0.5, 0.3);
  albedo = mix(albedo, uHigh, streaks * streakStrength * banding);
  albedo = mix(albedo, uLow, (1.0 - streaks) * streakStrength * (1.0 - banding));

  #if defined(FEATURE_STORM)
    // One long-lived southern oval, elongated in longitude like the real spot.
    vec2 stormCentre = vec2(0.35, -0.28);
    vec2 stormPosition = vec2(atan(dir.z, dir.x) / 3.14159265, latitude);
    vec2 delta = stormPosition - stormCentre;
    delta.x = delta.x - 2.0 * floor(delta.x * 0.5 + 0.5);
    delta.x *= 0.55;
    float stormDistance = length(delta);
    float storm = 1.0 - smoothstep(0.06, 0.15, stormDistance);
    float curl = atlasFbm(vec3(dir * 18.0)) * 0.35;
    albedo = mix(albedo, uAccent, storm * (0.75 + curl));
    albedo = mix(albedo, uHigh,
      smoothstep(0.13, 0.17, stormDistance) * storm * 0.4);
  #endif
#elif defined(STYLE_OCEAN)
  // Continents: a warped noise field thresholded into a crisp coastline.
  vec3 continentCoords = dir * 2.6 + 11.0;
  float continent = atlasContrast(
    atlasFbm(continentCoords + atlasFbm(continentCoords * 1.8) * 0.5),
    0.5, 0.17);
  float land = smoothstep(0.5, 0.58, continent);

  albedo = mix(uLow, uMid, smoothstep(0.12, 0.5, continent));
  albedo = mix(albedo, uHigh, land);
  // Vegetation versus arid ground on the land masses.
  float landCover = atlasContrast(atlasFbm(dir * 6.5 + 3.0), 0.5, 0.26);
  albedo = mix(albedo, uHigh * 1.45, land * smoothstep(0.55, 0.9, landCover) * 0.55);
  albedo = mix(albedo, uHigh * 0.62, land * smoothstep(0.45, 0.1, landCover) * 0.45);

  // Polar ice, then weather on top of everything.
  albedo = mix(albedo, uAccent, smoothstep(0.74, 0.9, abs(latitude)));
  float clouds = atlasContrast(
    atlasFbm(vec3(dir.x * 3.2, dir.y * 5.4, dir.z * 3.2) + 30.0), 0.52, 0.22);
  albedo = mix(albedo, vec3(1.0), smoothstep(0.55, 0.95, clouds) * 0.6);
#elif defined(STYLE_CLOUD_VEILED)
  // Slow, thick haze: heavily domain-warped so the veil swirls.
  vec3 swirl = vec3(dir.x * 2.4, dir.y * 4.2, dir.z * 2.4);
  float haze = atlasContrast(
    atlasFbm(swirl + atlasFbm(swirl * 1.7) * 0.85), 0.5, 0.2);
  albedo = mix(uLow, uMid, haze);
  albedo = mix(albedo, uHigh, smoothstep(0.62, 0.98, haze) * 0.75);
  float veil = atlasContrast(
    atlasFbm(vec3(dir.x * 1.6, dir.y * 9.0, dir.z * 1.6)), 0.5, 0.28);
  albedo = mix(albedo, uHigh, veil * 0.22);
#elif defined(STYLE_ICY_MOON)
  float iceBase = atlasContrast(atlasFbm(dir * 5.5), 0.5, 0.26);
  albedo = mix(uMid, uHigh, iceBase);
  // Long linear fractures crossing the crust.
  float cracks = atlasRidged(vec3(dir.x * 3.4, dir.y * 9.0, dir.z * 3.4));
  albedo = mix(albedo, uAccent, smoothstep(0.74, 0.97, cracks) * 0.8);
  float secondaryCracks = atlasRidged(vec3(dir.z * 7.0, dir.x * 4.0, dir.y * 5.0));
  albedo = mix(albedo, uAccent, smoothstep(0.86, 0.99, secondaryCracks) * 0.45);
  albedo = mix(albedo, uLow, smoothstep(0.7, 0.95, atlasFbm(dir * 12.0)) * 0.25);
#else
  // Airless rocky bodies: broad terrain, basins, and crater-like ridges.
  float terrain = atlasContrast(atlasFbm(dir * 3.4), 0.5, 0.22);
  float detail = atlasContrast(atlasFbm(dir * 9.0), 0.5, 0.3);
  albedo = mix(uLow, uMid, terrain);
  albedo = mix(albedo, uHigh, smoothstep(0.55, 0.95, terrain * 0.65 + detail * 0.35));
  // Dark basins.
  albedo = mix(albedo, uLow, smoothstep(0.62, 0.16, terrain) * 0.5);
  // Bright crater rims and rays.
  float craters = atlasRidged(dir * 8.0);
  albedo = mix(albedo, uHigh, smoothstep(0.86, 0.995, craters) * 0.5);
  #if defined(FEATURE_POLAR_CAPS)
    albedo = mix(albedo, uAccent, smoothstep(0.8, 0.94, abs(latitude)) * 0.9);
  #endif
#endif

#if defined(STYLE_STAR)
  vec3 colour = albedo;
#else
  // Sun-driven shading with a soft terminator and a small ambient floor so the
  // night side stays readable rather than pure black.
  float incidence = dot(normalize(vWorldNormal), normalize(uSunDirection));
  float daylight = smoothstep(-0.14, 0.32, incidence);
  vec3 colour = albedo * (uAmbient + (1.0 - uAmbient) * daylight);
  float rim = pow(1.0 - max(dot(vWorldNormal, vViewDirection), 0.0), 2.6);
  colour += uAtmosphere * rim * uAtmosphereStrength * (0.25 + 0.75 * daylight);
#endif

  colour += uAtmosphere * uSelected * 0.22;
  gl_FragColor = vec4(colour, 1.0);
}
`;

const RING_VERTEX_SHADER = /* glsl */ `
varying vec3 vLocalPosition;
varying vec3 vWorldPosition;

void main() {
  vLocalPosition = position;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const RING_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec3 uAccent;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uGapInner;
uniform float uGapOuter;
uniform float uOpacity;
uniform float uBodyRadius;
uniform vec3 uSunDirection;
uniform vec3 uBodyWorldPosition;

varying vec3 vLocalPosition;
varying vec3 vWorldPosition;

${NOISE_CHUNK}

void main() {
  float radius = length(vLocalPosition.xy);
  if (radius < uInnerRadius || radius > uOuterRadius) discard;

  float span = max(uOuterRadius - uInnerRadius, 0.0001);
  float normalised = (radius - uInnerRadius) / span;

  // Fine ringlet structure: many narrow concentric density variations.
  float ringlets = atlasFbm(vec3(normalised * 190.0, 0.0, 0.0));
  float coarse = atlasFbm(vec3(normalised * 26.0, 5.0, 0.0));
  float density = clamp(ringlets * 0.55 + coarse * 0.65, 0.0, 1.0);

  vec3 colour = mix(uLow, uMid, density);
  colour = mix(colour, uHigh, smoothstep(0.6, 0.95, coarse) * 0.8);
  colour = mix(colour, uAccent, smoothstep(0.0, 0.12, 1.0 - normalised) * 0.35);

  float alpha = uOpacity * (0.35 + 0.65 * density);
  // Principal division and soft outer/inner falloff.
  if (uGapOuter > uGapInner) {
    alpha *= 1.0 - 0.94 * smoothstep(uGapInner - 0.012, uGapInner, radius)
                 * (1.0 - smoothstep(uGapOuter, uGapOuter + 0.012, radius));
  }
  alpha *= smoothstep(0.0, 0.045, normalised);
  alpha *= 1.0 - smoothstep(0.955, 1.0, normalised);

  // Planet shadow: darken ring points lying behind the body along the Sun line.
  vec3 toPoint = vWorldPosition - uBodyWorldPosition;
  vec3 sunDir = normalize(uSunDirection);
  float alongSun = dot(toPoint, sunDir);
  if (alongSun < 0.0) {
    float perpendicular = length(toPoint - sunDir * alongSun);
    float shadow = 1.0 - smoothstep(uBodyRadius * 0.82, uBodyRadius * 1.06, perpendicular);
    colour *= mix(1.0, 0.16, shadow);
  }

  gl_FragColor = vec4(colour, alpha);
}
`;

const STYLE_DEFINES: Record<string, string> = {
  star: "STYLE_STAR",
  rocky: "STYLE_ROCKY",
  "ocean-world": "STYLE_OCEAN",
  "cloud-veiled": "STYLE_CLOUD_VEILED",
  "gas-giant": "STYLE_GAS_GIANT",
  "ice-giant": "STYLE_ICE_GIANT",
  "icy-moon": "STYLE_ICY_MOON",
};

/** Bodies whose depiction includes a named surface feature. */
const STORM_BODIES = new Set(["jupiter"]);
// The ocean-world style draws its own ice caps, so Earth is not listed here.
const POLAR_CAP_BODIES = new Set(["mars"]);

function colourUniforms(palette: SurfacePalette) {
  return {
    uLow: { value: new THREE.Color(palette.low) },
    uMid: { value: new THREE.Color(palette.mid) },
    uHigh: { value: new THREE.Color(palette.high) },
    uAccent: { value: new THREE.Color(palette.accent) },
  };
}

/**
 * Three.js types uniform values as `any`. Holding typed references to the
 * uniform objects at construction keeps every per-frame write checked.
 */
interface Vector3Uniform {
  value: THREE.Vector3;
}
interface NumberUniform {
  value: number;
}

export interface PlanetaryBody {
  readonly objectId: string;
  readonly appearance: PlanetaryAppearance;
  readonly group: THREE.Group;
  readonly surface: THREE.Mesh;
  readonly surfaceMaterial: THREE.ShaderMaterial;
  readonly sunDirection: Vector3Uniform;
  readonly spin: NumberUniform;
  readonly selected: NumberUniform;
  readonly ringMaterial?: THREE.ShaderMaterial;
  readonly ringSunDirection?: Vector3Uniform;
  readonly ringBodyPosition?: Vector3Uniform;
  readonly glow?: THREE.Sprite;
  readonly glowTexture?: THREE.Texture;
  readonly glowMaterial?: THREE.SpriteMaterial;
  /** Visual radius in scene units, before the group's own scaling. */
  readonly visualRadius: number;
}

export interface PlanetaryBodySet {
  readonly group: THREE.Group;
  readonly bodies: readonly PlanetaryBody[];
  readonly pickTargets: readonly THREE.Object3D[];
  /** Object ids that this module renders and the batch layer must skip. */
  readonly renderedIds: ReadonlySet<string>;
  /** Scene-unit radius per rendered body, for camera framing. */
  readonly visualRadiusById: ReadonlyMap<string, number>;
}

/**
 * Camera distance that frames a body of the given visual radius.
 *
 * The scene camera has a 48-degree vertical field of view, so this places the
 * body's limb at roughly 40% of the view height: close enough that a selected
 * world reads as a world rather than a speck, far enough to keep its rings and
 * terminator in frame. Without this, travel used a size-independent distance
 * and Earth arrived on screen barely larger than a point.
 */
export function framingDistanceForRadius(radius: number): number {
  return radius * 5.5;
}

function createGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.22, "rgba(255,226,170,0.55)");
    gradient.addColorStop(0.55, "rgba(255,170,80,0.16)");
    gradient.addColorStop(1, "rgba(255,150,60,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface PlanetaryBodyOptions {
  /** Sphere subdivision; higher is smoother. */
  readonly sphereDetail: number;
  /** Scene-unit radius that an Earth-sized body should occupy. */
  readonly earthVisualRadius: number;
}

/**
 * Builds a mesh per supported Solar System body found in `objects`.
 *
 * `objects` supplies scene placement only; appearance comes entirely from the
 * cited parameter table.
 */
export function createPlanetaryBodies(
  objects: readonly {
    readonly id: string;
    readonly renderPosition: readonly [number, number, number];
  }[],
  options: PlanetaryBodyOptions,
): PlanetaryBodySet | null {
  const group = new THREE.Group();
  group.name = "solar system bodies — illustrative procedural surfaces";
  group.userData.representation = "illustrative";
  group.userData.disclaimer =
    "Surfaces are drawn procedurally from cited physical parameters and published imagery impressions; they are not photographs and are not to scale.";

  const bodies: PlanetaryBody[] = [];
  const pickTargets: THREE.Object3D[] = [];
  const renderedIds = new Set<string>();
  const visualRadiusById = new Map<string, number>();

  for (const object of objects) {
    const appearance = planetaryAppearanceFor(object.id);
    if (!appearance) continue;

    const visualRadius =
      compressedVisualRadius(appearance.equatorialRadiusKm) *
      options.earthVisualRadius;

    const bodyGroup = new THREE.Group();
    bodyGroup.position.fromArray(object.renderPosition);
    // Obliquity is applied to the body group so rings and surface share one
    // axis, exactly as the physical system does.
    bodyGroup.rotation.z = appearance.obliquityDeg * DEGREES_TO_RADIANS;
    bodyGroup.name = `${object.id} body`;

    const defines: Record<string, string> = {
      [STYLE_DEFINES[appearance.style] ?? "STYLE_ROCKY"]: "1",
    };
    if (STORM_BODIES.has(object.id)) defines.FEATURE_STORM = "1";
    if (POLAR_CAP_BODIES.has(object.id)) defines.FEATURE_POLAR_CAPS = "1";

    const sunDirection: Vector3Uniform = { value: new THREE.Vector3(1, 0, 0) };
    const spin: NumberUniform = { value: 0 };
    const selected: NumberUniform = { value: 0 };

    const surfaceMaterial = new THREE.ShaderMaterial({
      defines,
      uniforms: {
        ...colourUniforms(appearance.palette),
        uAtmosphere: {
          value: new THREE.Color(appearance.atmosphere?.colour ?? "#000000"),
        },
        uAtmosphereStrength: {
          value: appearance.atmosphere?.strength ?? 0,
        },
        uSunDirection: sunDirection,
        uSpin: spin,
        uSelected: selected,
        uAmbient: { value: appearance.emissive ? 1 : 0.09 },
      },
      vertexShader: SURFACE_VERTEX_SHADER,
      fragmentShader: SURFACE_FRAGMENT_SHADER,
      toneMapped: true,
    });

    const geometry = new THREE.SphereGeometry(
      visualRadius,
      Math.max(24, options.sphereDetail * 16),
      Math.max(16, options.sphereDetail * 10),
    );
    const surface = new THREE.Mesh(geometry, surfaceMaterial);
    surface.name = `${object.id} surface`;
    surface.userData.objectId = object.id;
    surface.userData.representation = "illustrative-procedural-surface";
    bodyGroup.add(surface);
    pickTargets.push(surface);

    let ringMaterial: THREE.ShaderMaterial | undefined;
    let ringSunDirection: Vector3Uniform | undefined;
    let ringBodyPosition: Vector3Uniform | undefined;
    if (appearance.ring) {
      const outer = appearance.ring.outerRadiusRatio * visualRadius;
      const inner = appearance.ring.innerRadiusRatio * visualRadius;
      const ringGeometry = new THREE.RingGeometry(inner, outer, 128, 4);
      ringSunDirection = { value: new THREE.Vector3(1, 0, 0) };
      ringBodyPosition = { value: new THREE.Vector3() };
      ringMaterial = new THREE.ShaderMaterial({
        uniforms: {
          ...colourUniforms(appearance.ring.palette),
          uInnerRadius: { value: inner },
          uOuterRadius: { value: outer },
          uGapInner: {
            value: (appearance.ring.gapInnerRatio ?? 0) * visualRadius,
          },
          uGapOuter: {
            value: (appearance.ring.gapOuterRatio ?? 0) * visualRadius,
          },
          uOpacity: { value: appearance.ring.opacity },
          uBodyRadius: { value: visualRadius },
          uSunDirection: ringSunDirection,
          uBodyWorldPosition: ringBodyPosition,
        },
        vertexShader: RING_VERTEX_SHADER,
        fragmentShader: RING_FRAGMENT_SHADER,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: true,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.name = `${object.id} ring system`;
      ring.userData.objectId = object.id;
      ring.userData.representation = "illustrative-procedural-rings";
      // RingGeometry is built in the XY plane; lay it in the body's equator.
      ring.rotation.x = Math.PI / 2;
      ring.renderOrder = 2;
      bodyGroup.add(ring);
      pickTargets.push(ring);
    }

    let glow: THREE.Sprite | undefined;
    let glowTexture: THREE.Texture | undefined;
    let glowMaterial: THREE.SpriteMaterial | undefined;
    if (appearance.emissive) {
      glowTexture = createGlowTexture();
      glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      });
      glow = new THREE.Sprite(glowMaterial);
      glow.scale.setScalar(visualRadius * 6.5);
      glow.name = `${object.id} corona`;
      glow.userData.representation = "illustrative-glow";
      bodyGroup.add(glow);
    }

    group.add(bodyGroup);
    renderedIds.add(object.id);
    visualRadiusById.set(object.id, visualRadius);
    bodies.push({
      objectId: object.id,
      appearance,
      group: bodyGroup,
      surface,
      surfaceMaterial,
      sunDirection,
      spin,
      selected,
      ringMaterial,
      ringSunDirection,
      ringBodyPosition,
      glow,
      glowTexture,
      glowMaterial,
      visualRadius,
    });
  }

  if (bodies.length === 0) {
    return null;
  }

  return { group, bodies, pickTargets, renderedIds, visualRadiusById };
}

const SUN_WORLD_POSITION = new THREE.Vector3();
const BODY_WORLD_POSITION = new THREE.Vector3();
const SUN_DIRECTION = new THREE.Vector3();

/**
 * Per-frame update: points each body's terminator at the Sun and advances the
 * schematic spin.
 *
 * `spinSeconds` is a presentation clock, not an ephemeris. Relative rotation
 * *rates* follow the cited sidereal periods (including retrograde signs), but
 * absolute orientation is arbitrary and must not be read as a real sub-solar
 * longitude.
 */
export function updatePlanetaryBodies(
  set: PlanetaryBodySet,
  spinSeconds: number,
): void {
  const sun = set.bodies.find((body) => body.appearance.emissive);
  if (sun) {
    sun.group.getWorldPosition(SUN_WORLD_POSITION);
  } else {
    SUN_WORLD_POSITION.set(0, 0, 0);
  }

  for (const body of set.bodies) {
    body.group.getWorldPosition(BODY_WORLD_POSITION);
    SUN_DIRECTION.copy(SUN_WORLD_POSITION).sub(BODY_WORLD_POSITION);
    if (SUN_DIRECTION.lengthSq() < 1e-8) {
      SUN_DIRECTION.set(1, 0, 0);
    }
    SUN_DIRECTION.normalize();
    body.sunDirection.value.copy(SUN_DIRECTION);

    const period = body.appearance.rotationPeriodHours;
    if (Number.isFinite(period) && period !== 0) {
      // Normalised against Earth's day so relative rates stay faithful.
      body.spin.value = ((spinSeconds * 2 * Math.PI) / period) * 6;
    }

    body.ringSunDirection?.value.copy(SUN_DIRECTION);
    body.ringBodyPosition?.value.copy(BODY_WORLD_POSITION);
  }
}

export function setPlanetaryBodySelection(
  set: PlanetaryBodySet,
  selectedId: string | null,
): void {
  for (const body of set.bodies) {
    body.selected.value = body.objectId === selectedId ? 1 : 0;
  }
}

export function disposePlanetaryBodies(set: PlanetaryBodySet): void {
  for (const body of set.bodies) {
    body.surface.geometry.dispose();
    body.surfaceMaterial.dispose();
    if (body.ringMaterial) body.ringMaterial.dispose();
    body.glowTexture?.dispose();
    body.glowMaterial?.dispose();
    // Safety net for any child geometry not held directly above (the rings).
    body.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
        mesh.geometry.dispose();
      }
    });
  }
}
