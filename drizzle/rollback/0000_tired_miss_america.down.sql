-- Destructive reverse migration for drizzle/0000_tired_miss_america.sql.
-- Back up persistent data and rehearse restoration before applying to D1.
-- Dependent tables are dropped before their referenced parents.

DROP TABLE IF EXISTS `user_bookmarks`;
DROP TABLE IF EXISTS `tour_definitions`;
DROP TABLE IF EXISTS `spatial_tile_metadata`;
DROP TABLE IF EXISTS `object_sources`;
DROP TABLE IF EXISTS `object_relationships`;
DROP TABLE IF EXISTS `object_coordinates`;
DROP TABLE IF EXISTS `catalogue_aliases`;
DROP TABLE IF EXISTS `astronomical_objects`;
DROP TABLE IF EXISTS `data_sources`;
DROP TABLE IF EXISTS `dataset_versions`;
