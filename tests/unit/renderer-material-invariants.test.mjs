import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function sceneSource() {
  return readFile(new URL("app/components/CosmosScene.tsx", root), "utf8");
}

/** Strip comments so these guards assert on code, not on prose about code. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Regression guard for a silent, total rendering failure.
 *
 * `vertexColors` makes the shader multiply albedo by the geometry's `color`
 * attribute. The instanced marker geometries are plain primitives with no
 * such attribute, so an unbound attribute reads as (0,0,0) and every marker
 * renders black no matter how the scene is lit. Per-instance colour must come
 * from `setColorAt`, which the renderer applies through instancing and which
 * does not require `vertexColors`.
 */
test("instanced marker materials colour through instancing, never vertexColors", async () => {
  const scene = withoutComments(await sceneSource());
  const markerBatch = scene.slice(
    scene.indexOf("function createMarkerBatch("),
    scene.indexOf("function createProceduralBackground("),
  );

  assert.ok(
    markerBatch.length > 0,
    "createMarkerBatch must exist for this invariant to be meaningful",
  );
  assert.match(
    markerBatch,
    /setColorAt\(/,
    "per-instance colour must be supplied through setColorAt",
  );
  assert.doesNotMatch(
    markerBatch,
    /vertexColors/,
    "marker geometries define no color attribute; vertexColors renders them black",
  );
});

/**
 * Point clouds legitimately use `vertexColors` because their geometries build
 * an explicit `color` attribute. This asserts that pairing stays intact, so a
 * future refactor cannot drop the attribute and silently black out the stars.
 */
test("point batches that enable vertexColors also provide a color attribute", async () => {
  const scene = await sceneSource();
  const pointMaterial = scene.slice(
    scene.indexOf("function makePointMaterial("),
    scene.indexOf("function createMarkerBatch("),
  );
  assert.match(pointMaterial, /vertexColors:\s*true/);
  assert.match(pointMaterial, /THREE\.ShaderMaterial/);

  for (const builder of [
    "createCataloguePointBatch",
    "createProceduralBackground",
  ]) {
    const start = scene.indexOf(`function ${builder}(`);
    assert.ok(start >= 0, `${builder} must exist`);
    const body = scene.slice(start, start + 4_000);
    assert.match(
      body,
      /setAttribute\("color",/,
      `${builder} must define the color attribute its material consumes`,
    );
  }
});

/** The scene must keep light sources; unlit standard materials render black. */
test("the scene retains ambient and key lighting for lit materials", async () => {
  const scene = await sceneSource();
  assert.match(scene, /new THREE\.HemisphereLight\(/);
  assert.match(scene, /new THREE\.DirectionalLight\(/);
  assert.match(scene, /scene\.add\(ambient\)/);
  assert.match(scene, /scene\.add\(keyLight\)/);
});
