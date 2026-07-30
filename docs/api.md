# Versioned read-only API

## Scope

Atlas exposes a same-origin, read-only JSON API from the same portable Worker
artefact as the web application. It projects the bundled curated
educational content; it is not a live Gaia, SIMBAD, NASA Exoplanet Archive, or
ephemeris service.

The current route and contract versions are:

- route namespace: `/api/v1`;
- contract version: `1.0.0`; and
- application version reported by the service: `0.1.0`.

Breaking contract changes require a new `/api/vN` route. Additive fields may be
introduced within `v1`. The runtime OpenAPI 3.1 document is available at
`/api/v1/openapi`.

## Endpoints

All endpoints accept `GET` and `HEAD` only.

| Path                     | Purpose                                               | Cache behaviour                          |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------- |
| `/api/v1/health`         | process liveness                                      | `no-store`, not application-rate-limited |
| `/api/v1/ready`          | bundled catalogue, tour, and source validation status | `no-store`, not application-rate-limited |
| `/api/v1/version`        | app, API, contract, dataset, and endpoint versions    | public metadata cache + ETag             |
| `/api/v1/catalogue`      | bounded search and filter results                     | public metadata cache + ETag             |
| `/api/v1/catalogue/{id}` | compatibility alias for object detail                 | public metadata cache + ETag             |
| `/api/v1/objects/{id}`   | projected object detail and provenance                | public metadata cache + ETag             |
| `/api/v1/tours`          | tour summaries                                        | public metadata cache + ETag             |
| `/api/v1/tours/{id}`     | validated tour definition                             | public metadata cache + ETag             |
| `/api/v1/sources`        | source registry                                       | public metadata cache + ETag             |
| `/api/v1/sources/{id}`   | one provenance/source record                          | public metadata cache + ETag             |
| `/api/v1/openapi`        | OpenAPI 3.1 document                                  | public metadata cache + ETag             |

Success responses, except the raw OpenAPI document, use a `data`/`meta`
envelope. Error responses use a typed `error`/`meta` envelope with a
correlation ID. The service accepts a bounded safe `x-correlation-id` or
generates one; callers must not put personal or secret material in it.

## Catalogue query

`GET /api/v1/catalogue` accepts only:

| Parameter | Constraint                                                               |
| --------- | ------------------------------------------------------------------------ |
| `q`       | 1-160 printable characters; name, alias, identifier, type, or scale text |
| `type`    | one supported object type, maximum 80 characters                         |
| `source`  | one supported source ID, maximum 80 characters                           |
| `limit`   | integer 1-50; default 20                                                 |
| `cursor`  | opaque URL-safe cursor, maximum 256 characters                           |

Duplicate and unknown query parameters are rejected. Cursors are bound to the
catalogue revision and active filters; changing the query requires restarting
pagination. Search is deterministic, case-insensitive, and includes bounded
typo tolerance over the curated in-memory sample.

## Scientific provenance fields

Object detail responses expose the `sourceId` for every projected measurement
and coordinate. Each object source projection includes provider, dataset,
version, citation, citation URL, the narrowest available record URL and
identifier, and a link scope that distinguishes an object record from dataset
context, an ephemeris service, a published result, or local methodology.

Tour-detail responses expose chapter-level `sourceIds`; those IDs are validated
against the tour source registry. Source-detail responses include version/date,
licence, attribution, citation link, update strategy, coordinate system, units,
uncertainty handling, transformations, validation rules, and known
limitations. These are additive `v1` fields, not a claim that the API mirrors
the upstream providers.

## Security and operational limits

- Request URLs, bodies, methods, IDs, filters, limits, and cursors are bounded
  and validated.
- Responses use conservative cache policy, ETags where appropriate,
  `X-Content-Type-Options`, and a correlation ID.
- The Worker applies the application response-security headers after the route
  handler. No wildcard CORS header is emitted; browser use is same-origin by
  default.
- The in-process rate limiter allows 60 requests per minute per derived client
  key with a bounded 10,000-entry map, but its counters are **per Worker
  isolate** and reset on cold start. It is a local safety net, not a
  distributed production enforcement boundary. Configure provider-edge rate
  limiting for an exposed production origin.
- The API has no write, identity, bookmark-sync, administration, upload, or
  user-content endpoints.
- The public projection is intentionally narrower than internal display data;
  do not expose new internal fields without contract, privacy, and security
  review.

## Local checks

After `npm run dev`, or against `npm run start` after a build:

```bash
curl http://127.0.0.1:3000/api/v1/health
curl http://127.0.0.1:3000/api/v1/ready
curl "http://127.0.0.1:3000/api/v1/catalogue?q=Andromeda&limit=5"
curl http://127.0.0.1:3000/api/v1/openapi
```

The exact development port is printed by vinext and may differ if port 3000 is
busy. Automated contract checks run with:

```bash
npm run test:integration
npm run test:security
npm run build
npm run test:rendered
```
