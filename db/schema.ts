import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

export const datasetVersions = sqliteTable(
  "dataset_versions",
  {
    id: text("id").primaryKey(),
    datasetSlug: text("dataset_slug").notNull(),
    version: text("version").notNull(),
    publicationDate: text("publication_date").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    licence: text("licence").notNull(),
    sourceUrl: text("source_url").notNull(),
    manifestJson: text("manifest_json").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("dataset_versions_slug_version_uq").on(
      table.datasetSlug,
      table.version,
    ),
    uniqueIndex("dataset_versions_checksum_uq").on(table.checksumSha256),
    check(
      "dataset_versions_checksum_hex",
      sql`length(${table.checksumSha256}) = 64 AND ${table.checksumSha256} NOT GLOB '*[^0-9a-f]*'`,
    ),
  ],
);

export const dataSources = sqliteTable(
  "data_sources",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    dataset: text("dataset").notNull(),
    version: text("version").notNull(),
    publicationDate: text("publication_date").notNull(),
    retrievedOn: text("retrieved_on").notNull(),
    accessMethod: text("access_method").notNull(),
    url: text("url").notNull(),
    licence: text("licence").notNull(),
    attribution: text("attribution").notNull(),
    transformationsJson: text("transformations_json").notNull(),
    limitationsJson: text("limitations_json").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("data_sources_provider_dataset_version_uq").on(
      table.provider,
      table.dataset,
      table.version,
    ),
  ],
);

export const astronomicalObjects = sqliteTable(
  "astronomical_objects",
  {
    id: text("id").primaryKey(),
    datasetVersionId: text("dataset_version_id")
      .notNull()
      .references(() => datasetVersions.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    canonicalName: text("canonical_name").notNull(),
    scientificName: text("scientific_name"),
    objectType: text("object_type").notNull(),
    recordKind: text("record_kind").notNull(),
    evidenceStatus: text("evidence_status").notNull(),
    summary: text("summary").notNull(),
    significance: text("significance").notNull(),
    distanceValue: real("distance_value"),
    distanceUnit: text("distance_unit"),
    distanceUncertaintyJson: text("distance_uncertainty_json"),
    propertiesJson: text("properties_json").notNull(),
    uncertaintySummary: text("uncertainty_summary").notNull(),
    provenanceJson: text("provenance_json").notNull(),
    createdAt: createdAt(),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("astronomical_objects_type_idx").on(table.objectType),
    index("astronomical_objects_dataset_idx").on(table.datasetVersionId),
    index("astronomical_objects_name_idx").on(table.canonicalName),
    check(
      "astronomical_objects_record_kind_check",
      sql`${table.recordKind} IN ('catalogue-backed', 'derived-structure', 'conceptual-model', 'procedural-context')`,
    ),
    check(
      "astronomical_objects_evidence_check",
      sql`${table.evidenceStatus} IN ('observed', 'derived', 'estimated', 'modelled', 'conceptual', 'unknown')`,
    ),
    check(
      "astronomical_objects_distance_pair_check",
      sql`(${table.distanceValue} IS NULL AND ${table.distanceUnit} IS NULL) OR (${table.distanceValue} IS NOT NULL AND ${table.distanceUnit} IS NOT NULL)`,
    ),
    check(
      "astronomical_objects_no_procedural_catalogue_rows",
      sql`${table.recordKind} <> 'procedural-context'`,
    ),
  ],
);

export const catalogueAliases = sqliteTable(
  "catalogue_aliases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    objectId: text("object_id")
      .notNull()
      .references(() => astronomicalObjects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    catalogueNamespace: text("catalogue_namespace"),
  },
  (table) => [
    uniqueIndex("catalogue_aliases_normalized_uq").on(
      table.normalizedAlias,
      table.objectId,
    ),
    index("catalogue_aliases_lookup_idx").on(table.normalizedAlias),
    check(
      "catalogue_aliases_nonempty_check",
      sql`length(trim(${table.alias})) > 0 AND length(trim(${table.normalizedAlias})) > 0`,
    ),
  ],
);

export const objectCoordinates = sqliteTable(
  "object_coordinates",
  {
    objectId: text("object_id")
      .primaryKey()
      .references(() => astronomicalObjects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    frame: text("frame").notNull(),
    epoch: text("epoch").notNull(),
    rightAscensionDeg: real("right_ascension_deg"),
    declinationDeg: real("declination_deg"),
    longitudeDeg: real("longitude_deg"),
    latitudeDeg: real("latitude_deg"),
    distanceParsec: real("distance_parsec"),
    properMotionRaMasYr: real("proper_motion_ra_mas_yr"),
    properMotionDecMasYr: real("proper_motion_dec_mas_yr"),
    radialVelocityKmS: real("radial_velocity_km_s"),
    healpixOrder: integer("healpix_order"),
    healpixCell: text("healpix_cell"),
    coordinateUncertaintyJson: text("coordinate_uncertainty_json"),
  },
  (table) => [
    index("object_coordinates_equatorial_idx").on(
      table.rightAscensionDeg,
      table.declinationDeg,
    ),
    index("object_coordinates_healpix_idx").on(
      table.healpixOrder,
      table.healpixCell,
    ),
    check(
      "object_coordinates_frame_check",
      sql`${table.frame} IN ('ICRS', 'heliocentric-ecliptic', 'galactic')`,
    ),
    check(
      "object_coordinates_ra_check",
      sql`${table.rightAscensionDeg} IS NULL OR (${table.rightAscensionDeg} >= 0 AND ${table.rightAscensionDeg} < 360)`,
    ),
    check(
      "object_coordinates_dec_check",
      sql`${table.declinationDeg} IS NULL OR (${table.declinationDeg} >= -90 AND ${table.declinationDeg} <= 90)`,
    ),
    check(
      "object_coordinates_latitude_check",
      sql`${table.latitudeDeg} IS NULL OR (${table.latitudeDeg} >= -90 AND ${table.latitudeDeg} <= 90)`,
    ),
    check(
      "object_coordinates_spatial_pair_check",
      sql`(${table.healpixOrder} IS NULL AND ${table.healpixCell} IS NULL) OR (${table.healpixOrder} BETWEEN 0 AND 29 AND ${table.healpixCell} IS NOT NULL)`,
    ),
  ],
);

export const objectSources = sqliteTable(
  "object_sources",
  {
    objectId: text("object_id")
      .notNull()
      .references(() => astronomicalObjects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    sourceId: text("source_id")
      .notNull()
      .references(() => dataSources.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    sourceRecordId: text("source_record_id"),
    citationNote: text("citation_note").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.objectId, table.sourceId] }),
    index("object_sources_source_idx").on(table.sourceId),
  ],
);

export const objectRelationships = sqliteTable(
  "object_relationships",
  {
    subjectObjectId: text("subject_object_id")
      .notNull()
      .references(() => astronomicalObjects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    objectObjectId: text("object_object_id")
      .notNull()
      .references(() => astronomicalObjects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    relationshipType: text("relationship_type").notNull(),
    evidenceStatus: text("evidence_status").notNull(),
    sourceId: text("source_id").references(() => dataSources.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    note: text("note"),
  },
  (table) => [
    primaryKey({
      columns: [
        table.subjectObjectId,
        table.objectObjectId,
        table.relationshipType,
      ],
    }),
    index("object_relationships_reverse_idx").on(table.objectObjectId),
    check(
      "object_relationships_type_check",
      sql`${table.relationshipType} IN ('parent', 'child', 'satellite', 'member', 'host', 'related', 'component')`,
    ),
    check(
      "object_relationships_no_self_check",
      sql`${table.subjectObjectId} <> ${table.objectObjectId}`,
    ),
  ],
);

export const tourDefinitions = sqliteTable(
  "tour_definitions",
  {
    id: text("id").notNull(),
    version: text("version").notNull(),
    language: text("language").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    schemaVersion: text("schema_version").notNull(),
    definitionJson: text("definition_json").notNull(),
    published: integer("published", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.version, table.language] }),
    index("tour_definitions_published_idx").on(table.published, table.language),
  ],
);

export const userBookmarks = sqliteTable(
  "user_bookmarks",
  {
    pseudonymousUserId: text("pseudonymous_user_id").notNull(),
    objectId: text("object_id")
      .notNull()
      .references(() => astronomicalObjects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.pseudonymousUserId, table.objectId] }),
    index("user_bookmarks_object_idx").on(table.objectId),
    check(
      "user_bookmarks_pseudonym_length",
      sql`length(${table.pseudonymousUserId}) BETWEEN 32 AND 128`,
    ),
  ],
);

export const spatialTileMetadata = sqliteTable(
  "spatial_tile_metadata",
  {
    id: text("id").primaryKey(),
    datasetVersionId: text("dataset_version_id")
      .notNull()
      .references(() => datasetVersions.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    coordinateFrame: text("coordinate_frame").notNull(),
    lod: integer("lod").notNull(),
    cellScheme: text("cell_scheme").notNull(),
    cellId: text("cell_id").notNull(),
    minimumMagnitude: real("minimum_magnitude"),
    maximumMagnitude: real("maximum_magnitude"),
    objectCount: integer("object_count").notNull(),
    compressedBytes: integer("compressed_bytes").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    objectStorageKey: text("object_storage_key").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("spatial_tile_dataset_cell_lod_uq").on(
      table.datasetVersionId,
      table.cellScheme,
      table.cellId,
      table.lod,
    ),
    index("spatial_tile_lookup_idx").on(
      table.coordinateFrame,
      table.cellScheme,
      table.cellId,
      table.lod,
    ),
    check("spatial_tile_lod_check", sql`${table.lod} BETWEEN 0 AND 30`),
    check(
      "spatial_tile_counts_check",
      sql`${table.objectCount} >= 0 AND ${table.compressedBytes} >= 0`,
    ),
    check(
      "spatial_tile_checksum_hex",
      sql`length(${table.checksumSha256}) = 64 AND ${table.checksumSha256} NOT GLOB '*[^0-9a-f]*'`,
    ),
  ],
);
