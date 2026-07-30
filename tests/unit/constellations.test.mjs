import assert from "node:assert/strict";
import test from "node:test";

import {
  constellationByObjectId,
  matchesConstellationFilter,
} from "../../lib/constellations.ts";
import { cosmosCatalogue } from "../../lib/cosmos-data.ts";

test("constellation associations reference real exhibit IDs", () => {
  const exhibitIds = new Set(cosmosCatalogue.map((object) => object.id));
  assert.deepEqual(
    Object.keys(constellationByObjectId).filter((id) => !exhibitIds.has(id)),
    [],
  );
});

test("constellation search resolves Sirius, Cygnus X-1, and Messier 87 IDs", () => {
  assert.equal(matchesConstellationFilter("sirius-a", "Canis Major"), true);
  assert.equal(matchesConstellationFilter("sirius-b", "canis"), true);
  assert.equal(matchesConstellationFilter("cygnus-x1", "Cygnus"), true);
  assert.equal(matchesConstellationFilter("m87", "Virgo"), true);
  assert.equal(matchesConstellationFilter("m87-star", "vir"), true);

  for (const obsoleteId of ["sirius", "cygnus-x-1", "messier-87"]) {
    assert.equal(
      Object.hasOwn(constellationByObjectId, obsoleteId),
      false,
      `${obsoleteId} must not be used as an exhibit ID`,
    );
  }
});

test("constellation filtering returns the intended catalogue exhibits", () => {
  const results = cosmosCatalogue
    .filter((object) => matchesConstellationFilter(object.id, "Virgo"))
    .map((object) => object.id);

  assert.deepEqual(results, ["m87", "m87-star"]);
});
