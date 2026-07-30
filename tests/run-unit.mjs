// Static imports keep the unit-test entry point cross-platform on Node 22+;
// package scripts do not depend on shell-specific wildcard expansion.
import "./unit/astronomy-core.test.mjs";
import "./unit/catalogue-search.test.mjs";
import "./unit/client-persistence.test.mjs";
import "./unit/client-observability.test.mjs";
import "./unit/comparison-science.test.mjs";
import "./unit/constellations.test.mjs";
import "./unit/coordinate-engine.test.mjs";
import "./unit/educational-time-model.test.mjs";
import "./unit/i18n.test.mjs";
import "./unit/pipeline.test.mjs";
import "./unit/scientific-provenance.test.mjs";
import "./unit/server-observability.test.mjs";
import "./unit/tour-camera-directive.test.mjs";
import "./unit/tour-engine.test.mjs";
