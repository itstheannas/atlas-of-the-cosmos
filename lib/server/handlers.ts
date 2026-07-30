import {
  cosmosCatalogue,
  cosmosDataValidationIssues,
  dataSources,
  guidedTours,
} from "../cosmos-data.ts";
import { API_VERSION } from "./api-contracts.ts";
import { ApiProblem } from "./api-error.ts";
import { getCatalogueObject, searchCatalogue } from "./catalogue-service.ts";
import { NO_STORE_CACHE, PUBLIC_METADATA_CACHE } from "./cache.ts";
import { executeApiGet } from "./http.ts";
import { getOpenApiDocument } from "./openapi.ts";
import { assertResourceId } from "./request-security.ts";
import { getDataSource, listDataSources } from "./source-service.ts";
import { getTour, listTours } from "./tour-service.ts";
import { getVersionInformation } from "./version-service.ts";

export interface DynamicIdRouteContext {
  readonly params:
    | Promise<{ readonly id?: string | readonly string[] }>
    | { readonly id?: string | readonly string[] };
}

async function routeId(context: DynamicIdRouteContext): Promise<string> {
  const params = await context.params;
  const rawId = params.id;
  return assertResourceId(typeof rawId === "string" ? rawId : undefined);
}

export function handleHealthRequest(request: Request): Promise<Response> {
  return executeApiGet(
    request,
    () => ({
      data: {
        status: "ok" as const,
        service: "atlas-of-the-cosmos",
        apiVersion: API_VERSION,
      },
    }),
    { cache: NO_STORE_CACHE, rateLimit: false, operation: "health" },
  );
}

export function handleReadyRequest(request: Request): Promise<Response> {
  return executeApiGet(
    request,
    () => {
      if (cosmosDataValidationIssues.length > 0) {
        throw new ApiProblem(
          "SERVICE_UNAVAILABLE",
          "The bundled astronomical data did not pass readiness validation.",
        );
      }

      return {
        data: {
          status: "ready" as const,
          checks: {
            catalogue: {
              status: "ready" as const,
              records: cosmosCatalogue.length,
            },
            tours: {
              status: "ready" as const,
              records: guidedTours.length,
            },
            sources: {
              status: "ready" as const,
              records: dataSources.length,
            },
          },
        },
      };
    },
    { cache: NO_STORE_CACHE, rateLimit: false, operation: "ready" },
  );
}

export function handleVersionRequest(request: Request): Promise<Response> {
  return executeApiGet(request, () => ({ data: getVersionInformation() }), {
    cache: PUBLIC_METADATA_CACHE,
    operation: "version",
  });
}

export function handleCatalogueRequest(request: Request): Promise<Response> {
  return executeApiGet(request, ({ url }) => ({ data: searchCatalogue(url) }), {
    cache: PUBLIC_METADATA_CACHE,
    operation: "catalogue.list",
  });
}

export function handleObjectRequest(
  request: Request,
  context: DynamicIdRouteContext,
): Promise<Response> {
  return executeApiGet(
    request,
    async () => ({ data: getCatalogueObject(await routeId(context)) }),
    { cache: PUBLIC_METADATA_CACHE, operation: "catalogue.object" },
  );
}

export function handleToursRequest(request: Request): Promise<Response> {
  return executeApiGet(request, () => ({ data: listTours() }), {
    cache: PUBLIC_METADATA_CACHE,
    operation: "tours.list",
  });
}

export function handleTourRequest(
  request: Request,
  context: DynamicIdRouteContext,
): Promise<Response> {
  return executeApiGet(
    request,
    async () => ({ data: getTour(await routeId(context)) }),
    { cache: PUBLIC_METADATA_CACHE, operation: "tours.detail" },
  );
}

export function handleSourcesRequest(request: Request): Promise<Response> {
  return executeApiGet(request, () => ({ data: listDataSources() }), {
    cache: PUBLIC_METADATA_CACHE,
    operation: "sources.list",
  });
}

export function handleSourceRequest(
  request: Request,
  context: DynamicIdRouteContext,
): Promise<Response> {
  return executeApiGet(
    request,
    async () => ({ data: getDataSource(await routeId(context)) }),
    { cache: PUBLIC_METADATA_CACHE, operation: "sources.detail" },
  );
}

export function handleOpenApiRequest(request: Request): Promise<Response> {
  return executeApiGet(request, () => ({ data: getOpenApiDocument() }), {
    cache: PUBLIC_METADATA_CACHE,
    envelope: false,
    operation: "openapi",
  });
}
