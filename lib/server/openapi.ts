import { API_CONTRACT_VERSION, API_VERSION } from "./api-contracts.ts";
import { ATLAS_APPLICATION_VERSION } from "./version-service.ts";

const errorResponse = {
  description: "A typed API error.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiFailure" },
    },
  },
} as const;

const successEnvelope = (dataSchema: Readonly<Record<string, unknown>>) => ({
  type: "object",
  required: ["data", "meta"],
  properties: {
    data: dataSchema,
    meta: { $ref: "#/components/schemas/ApiMeta" },
  },
});

const standardErrors = {
  "400": errorResponse,
  "413": errorResponse,
  "429": errorResponse,
  "500": errorResponse,
} as const;

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: {
    type: "string",
    maxLength: 128,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  },
} as const;

export function getOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Atlas of the Cosmos API",
      version: API_CONTRACT_VERSION,
      summary:
        "Read-only access to the Atlas curated educational catalogue, tours, and source provenance.",
      description:
        "This API exposes a curated sample, not a complete map of the observable universe. Record-kind and evidence fields distinguish catalogue-backed, derived, and conceptual content.",
      contact: {
        name: "Annas M. Ishtiaq",
      },
      "x-application-version": ATLAS_APPLICATION_VERSION,
      "x-publisher": "Annas M. Ishtiaq",
    },
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    tags: [
      { name: "Operations" },
      { name: "Catalogue" },
      { name: "Tours" },
      { name: "Sources" },
    ],
    paths: {
      [`/api/${API_VERSION}/health`]: {
        get: {
          operationId: "getHealth",
          tags: ["Operations"],
          responses: {
            "200": {
              description: "The API process is live.",
              content: {
                "application/json": {
                  schema: successEnvelope({
                    type: "object",
                    required: ["status", "service", "apiVersion"],
                    properties: {
                      status: { const: "ok" },
                      service: { type: "string" },
                      apiVersion: { const: API_VERSION },
                    },
                  }),
                },
              },
            },
            "500": errorResponse,
          },
        },
      },
      [`/api/${API_VERSION}/ready`]: {
        get: {
          operationId: "getReadiness",
          tags: ["Operations"],
          responses: {
            "200": {
              description: "Bundled catalogue and tour data passed validation.",
            },
            "503": errorResponse,
            "500": errorResponse,
          },
        },
      },
      [`/api/${API_VERSION}/version`]: {
        get: {
          operationId: "getVersion",
          tags: ["Operations"],
          responses: {
            "200": { description: "API and bundled dataset version metadata." },
            ...standardErrors,
          },
        },
      },
      [`/api/${API_VERSION}/catalogue`]: {
        get: {
          operationId: "searchCatalogue",
          tags: ["Catalogue"],
          parameters: [
            {
              name: "q",
              in: "query",
              schema: { type: "string", minLength: 1, maxLength: 160 },
              description:
                "Name, alias, catalogue identifier, type, or scale text. Matching is case-insensitive and supports bounded typo tolerance.",
            },
            {
              name: "type",
              in: "query",
              schema: { type: "string", minLength: 1, maxLength: 80 },
            },
            {
              name: "source",
              in: "query",
              schema: { type: "string", minLength: 1, maxLength: 80 },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 50,
                default: 20,
              },
            },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string", minLength: 1, maxLength: 256 },
              description:
                "Opaque cursor returned by the preceding page. Cursors are scoped to the active filters and dataset revision.",
            },
          ],
          responses: {
            "200": {
              description:
                "A deterministically sorted, cursor-paginated catalogue result.",
            },
            ...standardErrors,
          },
        },
      },
      [`/api/${API_VERSION}/objects/{id}`]: {
        get: {
          operationId: "getCatalogueObject",
          tags: ["Catalogue"],
          parameters: [idParameter],
          responses: {
            "200": {
              description:
                "A safely projected object detail with evidence, uncertainty, relationships, and provenance.",
            },
            "404": errorResponse,
            ...standardErrors,
          },
        },
      },
      [`/api/${API_VERSION}/tours`]: {
        get: {
          operationId: "listTours",
          tags: ["Tours"],
          responses: {
            "200": { description: "Guided-tour summaries." },
            ...standardErrors,
          },
        },
      },
      [`/api/${API_VERSION}/tours/{id}`]: {
        get: {
          operationId: "getTour",
          tags: ["Tours"],
          parameters: [idParameter],
          responses: {
            "200": {
              description:
                "A validated data-driven tour with captions, transcript, waypoints, and sources.",
            },
            "404": errorResponse,
            ...standardErrors,
          },
        },
      },
      [`/api/${API_VERSION}/sources`]: {
        get: {
          operationId: "listSources",
          tags: ["Sources"],
          responses: {
            "200": {
              description:
                "Dataset provider, version/date, licence, attribution, citation, coordinate/unit metadata, uncertainty handling, transformations, validation rules, and known limitations.",
            },
            ...standardErrors,
          },
        },
      },
      [`/api/${API_VERSION}/sources/{id}`]: {
        get: {
          operationId: "getSource",
          tags: ["Sources"],
          parameters: [idParameter],
          responses: {
            "200": { description: "One data-source provenance record." },
            "404": errorResponse,
            ...standardErrors,
          },
        },
      },
      [`/api/${API_VERSION}/openapi`]: {
        get: {
          operationId: "getOpenApiDocument",
          tags: ["Operations"],
          responses: {
            "200": { description: "This OpenAPI 3.1 document." },
            ...standardErrors,
          },
        },
      },
    },
    components: {
      schemas: {
        ApiMeta: {
          type: "object",
          additionalProperties: false,
          required: ["apiVersion", "contractVersion"],
          properties: {
            apiVersion: { const: API_VERSION },
            contractVersion: { const: API_CONTRACT_VERSION },
          },
        },
        ApiErrorDetail: {
          type: "object",
          additionalProperties: false,
          required: ["field", "issue"],
          properties: {
            field: { type: "string" },
            issue: { type: "string" },
          },
        },
        ApiFailure: {
          type: "object",
          additionalProperties: false,
          required: ["error", "meta"],
          properties: {
            error: {
              type: "object",
              additionalProperties: false,
              required: ["code", "message", "correlationId"],
              properties: {
                code: {
                  type: "string",
                  enum: [
                    "BAD_REQUEST",
                    "INVALID_QUERY",
                    "INVALID_CURSOR",
                    "CURSOR_MISMATCH",
                    "INVALID_RESOURCE_ID",
                    "NOT_FOUND",
                    "METHOD_NOT_ALLOWED",
                    "PAYLOAD_TOO_LARGE",
                    "RATE_LIMITED",
                    "SERVICE_UNAVAILABLE",
                    "INTERNAL_ERROR",
                  ],
                },
                message: { type: "string" },
                correlationId: { type: "string" },
                details: {
                  type: "array",
                  items: { $ref: "#/components/schemas/ApiErrorDetail" },
                },
              },
            },
            meta: { $ref: "#/components/schemas/ApiMeta" },
          },
        },
      },
    },
  } as const;
}
