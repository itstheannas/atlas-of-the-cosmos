CREATE TABLE `astronomical_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_version_id` text NOT NULL,
	`canonical_name` text NOT NULL,
	`scientific_name` text,
	`object_type` text NOT NULL,
	`record_kind` text NOT NULL,
	`evidence_status` text NOT NULL,
	`summary` text NOT NULL,
	`significance` text NOT NULL,
	`distance_value` real,
	`distance_unit` text,
	`distance_uncertainty_json` text,
	`properties_json` text NOT NULL,
	`uncertainty_summary` text NOT NULL,
	`provenance_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`dataset_version_id`) REFERENCES `dataset_versions`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "astronomical_objects_record_kind_check" CHECK("astronomical_objects"."record_kind" IN ('catalogue-backed', 'derived-structure', 'conceptual-model', 'procedural-context')),
	CONSTRAINT "astronomical_objects_evidence_check" CHECK("astronomical_objects"."evidence_status" IN ('observed', 'derived', 'estimated', 'modelled', 'conceptual', 'unknown')),
	CONSTRAINT "astronomical_objects_distance_pair_check" CHECK(("astronomical_objects"."distance_value" IS NULL AND "astronomical_objects"."distance_unit" IS NULL) OR ("astronomical_objects"."distance_value" IS NOT NULL AND "astronomical_objects"."distance_unit" IS NOT NULL)),
	CONSTRAINT "astronomical_objects_no_procedural_catalogue_rows" CHECK("astronomical_objects"."record_kind" <> 'procedural-context')
);
--> statement-breakpoint
CREATE INDEX `astronomical_objects_type_idx` ON `astronomical_objects` (`object_type`);--> statement-breakpoint
CREATE INDEX `astronomical_objects_dataset_idx` ON `astronomical_objects` (`dataset_version_id`);--> statement-breakpoint
CREATE INDEX `astronomical_objects_name_idx` ON `astronomical_objects` (`canonical_name`);--> statement-breakpoint
CREATE TABLE `catalogue_aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`object_id` text NOT NULL,
	`alias` text NOT NULL,
	`normalized_alias` text NOT NULL,
	`catalogue_namespace` text,
	FOREIGN KEY (`object_id`) REFERENCES `astronomical_objects`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "catalogue_aliases_nonempty_check" CHECK(length(trim("catalogue_aliases"."alias")) > 0 AND length(trim("catalogue_aliases"."normalized_alias")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalogue_aliases_normalized_uq` ON `catalogue_aliases` (`normalized_alias`,`object_id`);--> statement-breakpoint
CREATE INDEX `catalogue_aliases_lookup_idx` ON `catalogue_aliases` (`normalized_alias`);--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`dataset` text NOT NULL,
	`version` text NOT NULL,
	`publication_date` text NOT NULL,
	`retrieved_on` text NOT NULL,
	`access_method` text NOT NULL,
	`url` text NOT NULL,
	`licence` text NOT NULL,
	`attribution` text NOT NULL,
	`transformations_json` text NOT NULL,
	`limitations_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_sources_provider_dataset_version_uq` ON `data_sources` (`provider`,`dataset`,`version`);--> statement-breakpoint
CREATE TABLE `dataset_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_slug` text NOT NULL,
	`version` text NOT NULL,
	`publication_date` text NOT NULL,
	`checksum_sha256` text NOT NULL,
	`licence` text NOT NULL,
	`source_url` text NOT NULL,
	`manifest_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "dataset_versions_checksum_hex" CHECK(length("dataset_versions"."checksum_sha256") = 64 AND "dataset_versions"."checksum_sha256" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dataset_versions_slug_version_uq` ON `dataset_versions` (`dataset_slug`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `dataset_versions_checksum_uq` ON `dataset_versions` (`checksum_sha256`);--> statement-breakpoint
CREATE TABLE `object_coordinates` (
	`object_id` text PRIMARY KEY NOT NULL,
	`frame` text NOT NULL,
	`epoch` text NOT NULL,
	`right_ascension_deg` real,
	`declination_deg` real,
	`longitude_deg` real,
	`latitude_deg` real,
	`distance_parsec` real,
	`proper_motion_ra_mas_yr` real,
	`proper_motion_dec_mas_yr` real,
	`radial_velocity_km_s` real,
	`healpix_order` integer,
	`healpix_cell` text,
	`coordinate_uncertainty_json` text,
	FOREIGN KEY (`object_id`) REFERENCES `astronomical_objects`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "object_coordinates_frame_check" CHECK("object_coordinates"."frame" IN ('ICRS', 'heliocentric-ecliptic', 'galactic')),
	CONSTRAINT "object_coordinates_ra_check" CHECK("object_coordinates"."right_ascension_deg" IS NULL OR ("object_coordinates"."right_ascension_deg" >= 0 AND "object_coordinates"."right_ascension_deg" < 360)),
	CONSTRAINT "object_coordinates_dec_check" CHECK("object_coordinates"."declination_deg" IS NULL OR ("object_coordinates"."declination_deg" >= -90 AND "object_coordinates"."declination_deg" <= 90)),
	CONSTRAINT "object_coordinates_latitude_check" CHECK("object_coordinates"."latitude_deg" IS NULL OR ("object_coordinates"."latitude_deg" >= -90 AND "object_coordinates"."latitude_deg" <= 90)),
	CONSTRAINT "object_coordinates_spatial_pair_check" CHECK(("object_coordinates"."healpix_order" IS NULL AND "object_coordinates"."healpix_cell" IS NULL) OR ("object_coordinates"."healpix_order" BETWEEN 0 AND 29 AND "object_coordinates"."healpix_cell" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `object_coordinates_equatorial_idx` ON `object_coordinates` (`right_ascension_deg`,`declination_deg`);--> statement-breakpoint
CREATE INDEX `object_coordinates_healpix_idx` ON `object_coordinates` (`healpix_order`,`healpix_cell`);--> statement-breakpoint
CREATE TABLE `object_relationships` (
	`subject_object_id` text NOT NULL,
	`object_object_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`evidence_status` text NOT NULL,
	`source_id` text,
	`note` text,
	PRIMARY KEY(`subject_object_id`, `object_object_id`, `relationship_type`),
	FOREIGN KEY (`subject_object_id`) REFERENCES `astronomical_objects`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`object_object_id`) REFERENCES `astronomical_objects`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "object_relationships_type_check" CHECK("object_relationships"."relationship_type" IN ('parent', 'child', 'satellite', 'member', 'host', 'related', 'component')),
	CONSTRAINT "object_relationships_no_self_check" CHECK("object_relationships"."subject_object_id" <> "object_relationships"."object_object_id")
);
--> statement-breakpoint
CREATE INDEX `object_relationships_reverse_idx` ON `object_relationships` (`object_object_id`);--> statement-breakpoint
CREATE TABLE `object_sources` (
	`object_id` text NOT NULL,
	`source_id` text NOT NULL,
	`source_record_id` text,
	`citation_note` text NOT NULL,
	PRIMARY KEY(`object_id`, `source_id`),
	FOREIGN KEY (`object_id`) REFERENCES `astronomical_objects`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `object_sources_source_idx` ON `object_sources` (`source_id`);--> statement-breakpoint
CREATE TABLE `spatial_tile_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_version_id` text NOT NULL,
	`coordinate_frame` text NOT NULL,
	`lod` integer NOT NULL,
	`cell_scheme` text NOT NULL,
	`cell_id` text NOT NULL,
	`minimum_magnitude` real,
	`maximum_magnitude` real,
	`object_count` integer NOT NULL,
	`compressed_bytes` integer NOT NULL,
	`checksum_sha256` text NOT NULL,
	`object_storage_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`dataset_version_id`) REFERENCES `dataset_versions`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "spatial_tile_lod_check" CHECK("spatial_tile_metadata"."lod" BETWEEN 0 AND 30),
	CONSTRAINT "spatial_tile_counts_check" CHECK("spatial_tile_metadata"."object_count" >= 0 AND "spatial_tile_metadata"."compressed_bytes" >= 0),
	CONSTRAINT "spatial_tile_checksum_hex" CHECK(length("spatial_tile_metadata"."checksum_sha256") = 64 AND "spatial_tile_metadata"."checksum_sha256" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spatial_tile_dataset_cell_lod_uq` ON `spatial_tile_metadata` (`dataset_version_id`,`cell_scheme`,`cell_id`,`lod`);--> statement-breakpoint
CREATE INDEX `spatial_tile_lookup_idx` ON `spatial_tile_metadata` (`coordinate_frame`,`cell_scheme`,`cell_id`,`lod`);--> statement-breakpoint
CREATE TABLE `tour_definitions` (
	`id` text NOT NULL,
	`version` text NOT NULL,
	`language` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`schema_version` text NOT NULL,
	`definition_json` text NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`id`, `version`, `language`)
);
--> statement-breakpoint
CREATE INDEX `tour_definitions_published_idx` ON `tour_definitions` (`published`,`language`);--> statement-breakpoint
CREATE TABLE `user_bookmarks` (
	`pseudonymous_user_id` text NOT NULL,
	`object_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`pseudonymous_user_id`, `object_id`),
	FOREIGN KEY (`object_id`) REFERENCES `astronomical_objects`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "user_bookmarks_pseudonym_length" CHECK(length("user_bookmarks"."pseudonymous_user_id") BETWEEN 32 AND 128)
);
--> statement-breakpoint
CREATE INDEX `user_bookmarks_object_idx` ON `user_bookmarks` (`object_id`);