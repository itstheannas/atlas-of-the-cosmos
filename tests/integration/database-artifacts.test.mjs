import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const migrationUrl = new URL(
  "../../drizzle/0000_tired_miss_america.sql",
  import.meta.url,
);
const seedUrl = new URL("../../db/seed.sql", import.meta.url);
const rollbackUrl = new URL(
  "../../drizzle/rollback/0000_tired_miss_america.down.sql",
  import.meta.url,
);
const catalogueUrl = new URL(
  "../../data/sample/catalogue.v1.json",
  import.meta.url,
);
const manifestUrl = new URL(
  "../../data/derived/openngc-sample/v20231203/manifest.json",
  import.meta.url,
);

const readArtifacts = async () => {
  const [migration, seed, rollback, catalogueText, manifestText] =
    await Promise.all([
      readFile(migrationUrl, "utf8"),
      readFile(seedUrl, "utf8"),
      readFile(rollbackUrl, "utf8"),
      readFile(catalogueUrl, "utf8"),
      readFile(manifestUrl, "utf8"),
    ]);

  return {
    catalogue: JSON.parse(catalogueText),
    manifest: JSON.parse(manifestText),
    migration: migration.replaceAll("--> statement-breakpoint", ""),
    rollback,
    seed,
  };
};

const createSeededDatabase = async () => {
  const artifacts = await readArtifacts();
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(artifacts.migration);
  database.exec(artifacts.seed);
  return { artifacts, database };
};

test("generated migration, deterministic seed, and rollback execute in SQLite", async () => {
  const { artifacts, database } = await createSeededDatabase();

  try {
    const tableNames = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map(({ name }) => name);

    assert.deepEqual(tableNames, [
      "astronomical_objects",
      "catalogue_aliases",
      "data_sources",
      "dataset_versions",
      "object_coordinates",
      "object_relationships",
      "object_sources",
      "spatial_tile_metadata",
      "tour_definitions",
      "user_bookmarks",
    ]);

    assert.equal(
      database
        .prepare("SELECT COUNT(*) AS count FROM astronomical_objects")
        .get().count,
      4,
    );
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM object_coordinates").get()
        .count,
      4,
    );
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM object_sources").get()
        .count,
      4,
    );
    assert.equal(
      database
        .prepare(
          `SELECT COUNT(*) AS count
          FROM pragma_table_info('spatial_tile_metadata')
          WHERE lower(type) = 'blob'`,
        )
        .get().count,
      0,
    );
    assert.ok(
      database
        .prepare(
          `SELECT 1 AS present
          FROM pragma_table_info('spatial_tile_metadata')
          WHERE name = 'object_storage_key' AND lower(type) = 'text'`,
        )
        .get(),
      "spatial tiles should store an object-storage key rather than a blob",
    );
    const indexNames = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map(({ name }) => name);
    assert.equal(indexNames.length, 16);
    assert.ok(indexNames.includes("catalogue_aliases_lookup_idx"));
    assert.ok(indexNames.includes("object_coordinates_healpix_idx"));
    assert.ok(indexNames.includes("spatial_tile_lookup_idx"));
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);

    database.exec(artifacts.rollback);

    assert.deepEqual(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
        )
        .all(),
      [],
    );
  } finally {
    database.close();
  }
});

test("seed is idempotent and preserves the exact four OpenNGC fixture identities", async () => {
  const { artifacts, database } = await createSeededDatabase();

  try {
    database.exec(artifacts.seed);

    const seededObjects = database
      .prepare(
        `SELECT
          objects.id,
          objects.canonical_name AS canonicalName,
          objects.object_type AS objectType,
          coordinates.right_ascension_deg AS rightAscensionDeg,
          coordinates.declination_deg AS declinationDeg,
          json_extract(
            objects.properties_json,
            '$.apparentMagnitude.quantity.value'
          ) AS apparentMagnitude,
          json_extract(
            objects.properties_json,
            '$.redshift.quantity.value'
          ) AS redshift,
          json_extract(
            objects.properties_json,
            '$.sourceClassification'
          ) AS sourceClassification,
          json_extract(
            objects.properties_json,
            '$.constellation.name'
          ) AS constellationName,
          sources.source_record_id AS sourceRecordId
        FROM astronomical_objects AS objects
        INNER JOIN object_coordinates AS coordinates
          ON coordinates.object_id = objects.id
        INNER JOIN object_sources AS sources
          ON sources.object_id = objects.id
        ORDER BY objects.id`,
      )
      .all()
      .map((row) => ({ ...row }));

    const sourceObjects = artifacts.catalogue.objects
      .map((object) => ({
        apparentMagnitude: object.properties.apparentMagnitude.quantity.value,
        canonicalName: object.names.primary,
        constellationName: object.constellation.name,
        declinationDeg: object.coordinate.declination.value,
        id: object.id,
        objectType: object.objectType,
        redshift: object.properties.redshift?.quantity.value ?? null,
        rightAscensionDeg: object.coordinate.rightAscension.value,
        sourceClassification: object.sourceClassification,
        sourceRecordId: object.catalogueIdentifiers.find(
          (identifier) => identifier.canonical,
        ).value,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));

    assert.deepEqual(seededObjects, sourceObjects);
    assert.equal(
      database
        .prepare("SELECT COUNT(*) AS count FROM astronomical_objects")
        .get().count,
      4,
    );
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM catalogue_aliases").get()
        .count,
      13,
    );
    const seededAliases = database
      .prepare(
        `SELECT object_id AS objectId, alias, normalized_alias AS normalizedAlias
        FROM catalogue_aliases
        ORDER BY object_id, normalized_alias`,
      )
      .all()
      .map((row) => ({ ...row }));
    const sourceAliases = artifacts.catalogue.objects
      .flatMap((object) => [
        ...object.catalogueIdentifiers.map((identifier) => ({
          alias: identifier.value,
          normalizedAlias: identifier.value.toLowerCase().replaceAll(" ", ""),
          objectId: object.id,
        })),
        {
          alias: object.names.primary,
          normalizedAlias: object.names.primary.toLowerCase(),
          objectId: object.id,
        },
        ...object.names.common.map((name) => ({
          alias: name,
          normalizedAlias: name.toLowerCase(),
          objectId: object.id,
        })),
      ])
      .sort(
        (left, right) =>
          left.objectId.localeCompare(right.objectId) ||
          left.normalizedAlias.localeCompare(right.normalizedAlias),
      );
    assert.deepEqual(seededAliases, sourceAliases);
    assert.equal(
      database.prepare("SELECT checksum_sha256 FROM dataset_versions").get()
        .checksum_sha256,
      artifacts.manifest.sha256,
    );
    assert.equal(
      database
        .prepare(
          "SELECT COUNT(*) AS count FROM astronomical_objects WHERE record_kind = 'procedural-context'",
        )
        .get().count,
      0,
    );
    assert.equal(
      database
        .prepare(
          `SELECT COUNT(*) AS count
          FROM astronomical_objects
          WHERE json_valid(properties_json) = 0
             OR json_valid(provenance_json) = 0`,
        )
        .get().count,
      0,
    );
    assert.equal(
      database
        .prepare(
          "SELECT COUNT(DISTINCT created_at) AS count FROM astronomical_objects",
        )
        .get().count,
      1,
    );
  } finally {
    database.close();
  }
});

test("database constraints reject fabricated catalogue state", async () => {
  const { database } = await createSeededDatabase();

  try {
    assert.throws(
      () =>
        database
          .prepare(
            `INSERT INTO astronomical_objects (
              id,
              dataset_version_id,
              canonical_name,
              object_type,
              record_kind,
              evidence_status,
              summary,
              significance,
              properties_json,
              uncertainty_summary,
              provenance_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            "procedural:not-a-catalogue-object",
            "openngc:v20231203-atlas-1",
            "Fabricated star",
            "star",
            "procedural-context",
            "conceptual",
            "Should not persist.",
            "Constraint fixture.",
            "{}",
            "Unknown.",
            "[]",
          ),
      /CHECK constraint failed/,
    );

    assert.throws(
      () =>
        database
          .prepare(
            `UPDATE object_coordinates
            SET right_ascension_deg = ?, declination_deg = ?
            WHERE object_id = ?`,
          )
          .run(360, 91, "openngc:ngc0224"),
      /CHECK constraint failed/,
    );

    assert.throws(
      () =>
        database
          .prepare(
            `INSERT INTO object_sources (
              object_id,
              source_id,
              source_record_id,
              citation_note
            ) VALUES (?, ?, ?, ?)`,
          )
          .run(
            "openngc:missing",
            "openngc-v20231203-sample",
            "MISSING",
            "Foreign-key fixture.",
          ),
      /FOREIGN KEY constraint failed/,
    );
  } finally {
    database.close();
  }
});
