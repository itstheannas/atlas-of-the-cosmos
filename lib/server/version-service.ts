import { cosmosCatalogue, dataSources, guidedTours } from "../cosmos-data.ts";
import { API_CONTRACT_VERSION, API_VERSION } from "./api-contracts.ts";
import { getCatalogueCapabilities } from "./catalogue-service.ts";
import { RATE_LIMITER_LIMITATION } from "./rate-limit.ts";

export const ATLAS_APPLICATION_VERSION = "0.1.0" as const;

export function getVersionInformation() {
  const catalogue = getCatalogueCapabilities();
  return {
    service: "atlas-of-the-cosmos",
    publisher: "Annas M. Ishtiaq",
    applicationVersion: ATLAS_APPLICATION_VERSION,
    apiVersion: API_VERSION,
    contractVersion: API_CONTRACT_VERSION,
    compatibility: {
      policy:
        "Breaking contract changes require a new /api/vN route. Additive fields may be introduced within v1.",
    },
    datasets: {
      catalogueRevision: catalogue.revision,
      catalogueObjects: cosmosCatalogue.length,
      dataSources: dataSources.length,
      guidedTours: guidedTours.length,
      tourSchemaVersion: "1.0.0",
      sampleStatus: "curated-educational-sample",
    },
    endpoints: {
      health: "/api/v1/health",
      readiness: "/api/v1/ready",
      version: "/api/v1/version",
      catalogue: "/api/v1/catalogue",
      object: "/api/v1/objects/{id}",
      tours: "/api/v1/tours",
      tour: "/api/v1/tours/{id}",
      sources: "/api/v1/sources",
      source: "/api/v1/sources/{id}",
      openApi: "/api/v1/openapi",
    },
    operationalLimitations: {
      localRateLimiter: RATE_LIMITER_LIMITATION,
    },
  };
}
