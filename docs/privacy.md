# Privacy model

## Summary

The reference release is designed for anonymous exploration and data
minimisation. It has no product account, advertising, behavioural analytics,
remote bookmark store, or application telemetry integration. Bookmarks and
preferences, short recent-item lists, and tour chapter progress remain in the
browser on the current device. A bounded in-memory diagnostic buffer records
numeric timings and coded states locally, but it is not persisted or sent over
the network.

This document covers application behaviour. A deployment operator must also
publish the hosting provider's actual network-log, access-policy, and retention
practices.

## Data handled by the application

| Data                                                                                    | Location              | Purpose                                | Retention                                                              |
| --------------------------------------------------------------------------------------- | --------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Quality, theme, motion, and up to 64 layer visibility overrides                         | browser storage       | remember display choices               | until reset or browser/site data is cleared                            |
| Saved object identifiers                                                                | browser storage       | device-local bookmarks                 | until removed/reset/cleared                                            |
| Up to 20 recent object IDs                                                              | browser storage       | reopen recently viewed sample objects  | until displaced/reset/site data is cleared                             |
| Up to 10 recent search strings                                                          | browser storage       | repeat local catalogue searches        | until displaced/reset/site data is cleared                             |
| Versioned last completed chapter and reduced-motion state by tour                       | browser storage       | resume a bundled guided tour           | until reset/site data is cleared                                       |
| Core routes and up to 64 runtime navigation/static entries, keyed without query strings | browser Cache Storage | limited offline-after-install fallback | until service-worker cache rotation, eviction, or site data is cleared |
| Up to 64 numeric diagnostic events with stable names and timestamps                     | browser memory        | local support/performance diagnosis    | current page session only; never transmitted                           |
| Catalogue and educational data                                                          | application bundle    | product content                        | for the life of the deployed build                                     |

The `localStorage` key is `atlas.cosmos.local-state`, schema version 2. Recent
search strings can contain text entered by a user, so they are bounded and must
not be repurposed as analytics or sent to a server. Do not enter personal data
into search. Do not store free-form notes, credentials, authentication tokens,
precise user location, exact timestamps, or raw interaction histories in this
record.

Version-1 migration preserves bounded preferences, bookmarks, recent lists,
and layer overrides, but discards the old numeric tour index because it could
not prove chapter completion. Diagnostic events exclude URLs, routes, queries,
DOM text, browser-storage contents, identity, and device identifiers.

## Identity

The Atlas application does not request or consume identity headers for its
anonymous experience, and it contains no account or sign-in feature. The
current managed Sites project applies an owner-only access policy before the
application boundary; that hosting identity is not copied into Atlas state.

If identity-dependent features are added, complete a separate privacy and
security review covering purpose, legal basis, access control, retention,
export, correction, deletion, incident notification, and hosting boundaries.

## Hosting data

The managed hosting platform may process ordinary request metadata such as
IP address, user agent, requested path, timestamp, and security events. That
processing is controlled by the deployment and provider configuration, not by
browser local storage. Operators should:

- minimise log fields and retention;
- restrict log access;
- avoid query strings containing personal data;
- document region and subprocessor choices; and
- make the deployed privacy notice match actual configuration.

## External links

Authoritative source links navigate to third-party sites. Those sites have
their own privacy practices. The app should avoid third-party embeds, tracking
pixels, remote fonts, and cross-site analytics in the default experience.

## User controls

Users can remove individual bookmarks through the saved-object interface and
reset local Atlas data in settings. That reset removes the versioned local
record and requests deletion of Cache Storage keys whose names start with
`atlas-cosmos-`; unrelated origin caches are not touched. Browser site-data
controls remain the complete origin-level reset. Because there is no server
profile, the project cannot restore cleared bookmarks, history/progress, or
synchronise them between devices.
