# Atlas of the Cosmos documentation

This documentation describes the repository as a deployable reference
implementation. It is not a claim that the application contains a complete
astronomical catalogue or a precision ephemeris.

## Start here

- [Copyright and rights notice](../NOTICE.md)
- [Architecture overview](architecture/overview.md)
- [Rendering and coordinate model](architecture/rendering-and-coordinates.md)
- [Client persistence](architecture/client-persistence.md)
- [Versioned read-only API](api.md)
- [Data provenance and local-first operation](data-sources/provenance.md)
- [Sample ingestion guide](data-sources/ingestion.md)
- [Imagery and project-asset attribution](data-sources/imagery-attribution.md)
- [Guided-tour authoring](tours/authoring.md)
- [Threat model](security/threat-model.md)
- [Security model](security/security-model.md)
- [Accessibility statement](accessibility/accessibility.md)
- [Testing strategy](testing/strategy.md)
- [Step-by-step deployment](operations/deployment-step-by-step.md)
- [Master-prompt compliance audit](operations/master-prompt-compliance.md)
- [Deployment guide](operations/deployment.md)
- [Database schema, seed, and rollback](operations/database.md)
- [Operations runbook](operations/runbook.md)
- [Observability and diagnostics](operations/observability.md)
- [Validation report](operations/validation-report.md)
- [Incident response](operations/incident-response.md)
- [Backup and restore](operations/backup-and-restore.md)
- [Release process](operations/release-process.md)
- [Browser support](browser-support.md)
- [Performance guide](performance.md)
- [Privacy model](privacy.md)
- [Known limitations](known-limitations.md)

## Architecture decisions

- [ADR-0001: Modular vinext, React, and Three.js application](decisions/0001-modular-vinext-react-three.md)
- [ADR-0002: Separate scientific and render coordinates](decisions/0002-rendering-coordinate-boundaries.md)
- [ADR-0003: Local-first, versioned sample data](decisions/0003-local-first-sample-data.md)
- [ADR-0004: Minimal, versioned client persistence](decisions/0004-client-persistence.md)
