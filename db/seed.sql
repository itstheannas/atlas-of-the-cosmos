-- Deterministic, idempotent seed for the bundled four-record OpenNGC sample.
-- The fixture date is pinned to the upstream release date so repeated clean
-- database creation does not introduce time-dependent values.

INSERT OR IGNORE INTO dataset_versions (
  id,
  dataset_slug,
  version,
  publication_date,
  checksum_sha256,
  licence,
  source_url,
  manifest_json,
  created_at
) VALUES (
  'openngc:v20231203-atlas-1',
  'openngc-development-sample',
  'v20231203-atlas-1',
  '2023-12-03',
  '1712e3ccf5b469393ae45ca373a6dac9297e0a403274e2d40cf8cf9c1f333afc',
  'CC-BY-SA-4.0',
  'https://github.com/mattiaverga/OpenNGC/tree/v20231203',
  '{"recordsAccepted":4,"recordsRejected":0,"schemaVersion":"1.0.0","sourceManifest":"data/manifests/sources/openngc-v20231203.sample.json","sourceSha256":"05f0dd370920aa9a5d7a6792660421c5d5b3bef95648140a484530e1ea07d2ca"}',
  '2023-12-03T00:00:00.000Z'
);

INSERT OR IGNORE INTO data_sources (
  id,
  provider,
  dataset,
  version,
  publication_date,
  retrieved_on,
  access_method,
  url,
  licence,
  attribution,
  transformations_json,
  limitations_json,
  created_at
) VALUES (
  'openngc-v20231203-sample',
  'OpenNGC contributors',
  'OpenNGC',
  'v20231203',
  '2023-12-03',
  '2026-07-29',
  'Pinned HTTPS release-tag download; the repository ships a selected JSON excerpt.',
  'https://github.com/mattiaverga/OpenNGC/tree/v20231203',
  'CC-BY-SA-4.0',
  'Contains data from OpenNGC, copyright OpenNGC contributors, licensed under CC BY-SA 4.0.',
  '["Select four named records without changing source values.","Parse sexagesimal right ascension and declination into degrees.","Map OpenNGC type codes to Atlas object types while preserving the original type code.","Expand selected IAU constellation abbreviations to conventional names.","Normalise NGC and Messier identifiers.","Preserve observed V magnitude and heliocentric redshift without deriving distance."]',
  '["Four records are not representative of the full catalogue.","Magnitude and coordinate uncertainties are unavailable in this excerpt.","The operational ICRS mapping is limited by the source J2000 frame description and is not a claim of milliarcsecond accuracy.","Redshift is not converted into cosmological distance."]',
  '2023-12-03T00:00:00.000Z'
);

INSERT OR IGNORE INTO astronomical_objects (
  id,
  dataset_version_id,
  canonical_name,
  scientific_name,
  object_type,
  record_kind,
  evidence_status,
  summary,
  significance,
  distance_value,
  distance_unit,
  distance_uncertainty_json,
  properties_json,
  uncertainty_summary,
  provenance_json,
  created_at,
  updated_at
) VALUES
  (
    'openngc:ngc0224',
    'openngc:v20231203-atlas-1',
    'Andromeda Galaxy',
    NULL,
    'galaxy',
    'catalogue-backed',
    'observed',
    'A galaxy record in the bundled four-object OpenNGC development excerpt.',
    'Provides a reproducible catalogue fixture for a galaxy classification.',
    NULL,
    NULL,
    NULL,
    '{"apparentMagnitude":{"caveat":"Measurement uncertainty is unavailable in this source excerpt.","method":"OpenNGC V-Mag field","passband":"V","quantity":{"unit":"mag","value":3.44},"status":"observed"},"constellation":{"abbreviation":"And","name":"Andromeda"},"redshift":{"caveat":"Preserved as observed catalogue metadata; not converted to distance.","method":"OpenNGC heliocentric Redshift field","quantity":{"unit":"redshift","value":-0.001},"status":"observed"},"sourceClassification":"G"}',
    'Coordinate and magnitude uncertainty are unavailable in the selected source columns; values are not assumed exact.',
    '[{"accessedAt":"2026-07-29","dataset":"OpenNGC","datasetVersion":"v20231203","licence":"CC-BY-SA-4.0","provider":"OpenNGC contributors","recordIdentifier":"NGC0224","sourceUrl":"https://raw.githubusercontent.com/mattiaverga/OpenNGC/v20231203/database_files/NGC.csv"}]',
    '2023-12-03T00:00:00.000Z',
    '2023-12-03T00:00:00.000Z'
  ),
  (
    'openngc:ngc1952',
    'openngc:v20231203-atlas-1',
    'Crab Nebula',
    NULL,
    'supernova-remnant',
    'catalogue-backed',
    'observed',
    'A supernova-remnant record in the bundled four-object OpenNGC development excerpt.',
    'Provides a reproducible catalogue fixture for a supernova-remnant classification.',
    NULL,
    NULL,
    NULL,
    '{"apparentMagnitude":{"caveat":"Measurement uncertainty is unavailable in this source excerpt.","method":"OpenNGC V-Mag field","passband":"V","quantity":{"unit":"mag","value":8.4},"status":"observed"},"constellation":{"abbreviation":"Tau","name":"Taurus"},"sourceClassification":"SNR","sourceNote":"Position is for the Crab pulsar."}',
    'Coordinate and magnitude uncertainty are unavailable in the selected source columns; values are not assumed exact.',
    '[{"accessedAt":"2026-07-29","dataset":"OpenNGC","datasetVersion":"v20231203","licence":"CC-BY-SA-4.0","provider":"OpenNGC contributors","recordIdentifier":"NGC1952","sourceUrl":"https://raw.githubusercontent.com/mattiaverga/OpenNGC/v20231203/database_files/NGC.csv"}]',
    '2023-12-03T00:00:00.000Z',
    '2023-12-03T00:00:00.000Z'
  ),
  (
    'openngc:ngc1976',
    'openngc:v20231203-atlas-1',
    'Great Orion Nebula',
    NULL,
    'nebula',
    'catalogue-backed',
    'observed',
    'A nebula record in the bundled four-object OpenNGC development excerpt.',
    'Provides a reproducible catalogue fixture for a nebula and cluster classification.',
    NULL,
    NULL,
    NULL,
    '{"apparentMagnitude":{"caveat":"Measurement uncertainty is unavailable in this source excerpt.","method":"OpenNGC V-Mag field","passband":"V","quantity":{"unit":"mag","value":4},"status":"observed"},"constellation":{"abbreviation":"Ori","name":"Orion"},"redshift":{"caveat":"Preserved as observed catalogue metadata; not converted to distance.","method":"OpenNGC heliocentric Redshift field","quantity":{"unit":"redshift","value":0.000093},"status":"observed"},"sourceClassification":"Cl+N"}',
    'Coordinate and magnitude uncertainty are unavailable in the selected source columns; values are not assumed exact.',
    '[{"accessedAt":"2026-07-29","dataset":"OpenNGC","datasetVersion":"v20231203","licence":"CC-BY-SA-4.0","provider":"OpenNGC contributors","recordIdentifier":"NGC1976","sourceUrl":"https://raw.githubusercontent.com/mattiaverga/OpenNGC/v20231203/database_files/NGC.csv"}]',
    '2023-12-03T00:00:00.000Z',
    '2023-12-03T00:00:00.000Z'
  ),
  (
    'openngc:ngc6205',
    'openngc:v20231203-atlas-1',
    'Hercules Globular Cluster',
    NULL,
    'globular-cluster',
    'catalogue-backed',
    'observed',
    'A globular-cluster record in the bundled four-object OpenNGC development excerpt.',
    'Provides a reproducible catalogue fixture for a globular-cluster classification.',
    NULL,
    NULL,
    NULL,
    '{"apparentMagnitude":{"caveat":"Measurement uncertainty is unavailable in this source excerpt.","method":"OpenNGC V-Mag field","passband":"V","quantity":{"unit":"mag","value":5.8},"status":"observed"},"constellation":{"abbreviation":"Her","name":"Hercules"},"redshift":{"caveat":"Preserved as observed catalogue metadata; not converted to distance.","method":"OpenNGC heliocentric Redshift field","quantity":{"unit":"redshift","value":-0.000815},"status":"observed"},"sourceClassification":"GCl"}',
    'Coordinate and magnitude uncertainty are unavailable in the selected source columns; values are not assumed exact.',
    '[{"accessedAt":"2026-07-29","dataset":"OpenNGC","datasetVersion":"v20231203","licence":"CC-BY-SA-4.0","provider":"OpenNGC contributors","recordIdentifier":"NGC6205","sourceUrl":"https://raw.githubusercontent.com/mattiaverga/OpenNGC/v20231203/database_files/NGC.csv"}]',
    '2023-12-03T00:00:00.000Z',
    '2023-12-03T00:00:00.000Z'
  );

INSERT OR IGNORE INTO catalogue_aliases (
  id,
  object_id,
  alias,
  normalized_alias,
  catalogue_namespace
) VALUES
  (1, 'openngc:ngc0224', 'NGC0224', 'ngc0224', 'OpenNGC'),
  (2, 'openngc:ngc0224', 'M 31', 'm31', 'Messier'),
  (3, 'openngc:ngc0224', 'Andromeda Galaxy', 'andromeda galaxy', NULL),
  (4, 'openngc:ngc1952', 'NGC1952', 'ngc1952', 'OpenNGC'),
  (5, 'openngc:ngc1952', 'M 1', 'm1', 'Messier'),
  (6, 'openngc:ngc1952', 'Crab Nebula', 'crab nebula', NULL),
  (7, 'openngc:ngc1976', 'NGC1976', 'ngc1976', 'OpenNGC'),
  (8, 'openngc:ngc1976', 'M 42', 'm42', 'Messier'),
  (9, 'openngc:ngc1976', 'Great Orion Nebula', 'great orion nebula', NULL),
  (10, 'openngc:ngc1976', 'Orion Nebula', 'orion nebula', NULL),
  (11, 'openngc:ngc6205', 'NGC6205', 'ngc6205', 'OpenNGC'),
  (12, 'openngc:ngc6205', 'M 13', 'm13', 'Messier'),
  (13, 'openngc:ngc6205', 'Hercules Globular Cluster', 'hercules globular cluster', NULL);

INSERT OR IGNORE INTO object_coordinates (
  object_id,
  frame,
  epoch,
  right_ascension_deg,
  declination_deg,
  longitude_deg,
  latitude_deg,
  distance_parsec,
  proper_motion_ra_mas_yr,
  proper_motion_dec_mas_yr,
  radial_velocity_km_s,
  healpix_order,
  healpix_cell,
  coordinate_uncertainty_json
) VALUES
  ('openngc:ngc0224', 'ICRS', 'J2000.0', 10.684791666666666, 41.26905555555555, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"status":"unavailable","reason":"No coordinate uncertainty columns are present in the selected source excerpt."}'),
  ('openngc:ngc1952', 'ICRS', 'J2000.0', 83.63320833333333, 22.01447222222222, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"status":"unavailable","reason":"No coordinate uncertainty columns are present in the selected source excerpt."}'),
  ('openngc:ngc1976', 'ICRS', 'J2000.0', 83.81866666666666, -5.389666666666667, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"status":"unavailable","reason":"No coordinate uncertainty columns are present in the selected source excerpt."}'),
  ('openngc:ngc6205', 'ICRS', 'J2000.0', 250.42345833333337, 36.46130555555556, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"status":"unavailable","reason":"No coordinate uncertainty columns are present in the selected source excerpt."}');

INSERT OR IGNORE INTO object_sources (
  object_id,
  source_id,
  source_record_id,
  citation_note
) VALUES
  ('openngc:ngc0224', 'openngc-v20231203-sample', 'NGC0224', 'Mattia Verga and OpenNGC contributors, OpenNGC v20231203.'),
  ('openngc:ngc1952', 'openngc-v20231203-sample', 'NGC1952', 'Mattia Verga and OpenNGC contributors, OpenNGC v20231203.'),
  ('openngc:ngc1976', 'openngc-v20231203-sample', 'NGC1976', 'Mattia Verga and OpenNGC contributors, OpenNGC v20231203.'),
  ('openngc:ngc6205', 'openngc-v20231203-sample', 'NGC6205', 'Mattia Verga and OpenNGC contributors, OpenNGC v20231203.');
