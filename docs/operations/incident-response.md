# Incident-response outline

## Severity

| Level | Example                                                                                   | Initial action                                                               |
| ----- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| SEV-1 | active secret exposure, widespread script injection, compromised production deployment    | restrict/disable affected release, revoke credentials, engage security owner |
| SEV-2 | widespread outage, scientific provenance corruption, critical accessibility path unusable | rollback or mitigate, preserve evidence, assign incident lead                |
| SEV-3 | partial route/feature failure with a usable fallback                                      | contain, schedule a reviewed fix, monitor                                    |
| SEV-4 | minor defect or documentation mismatch                                                    | normal issue workflow                                                        |

Scientific misinformation can be a high-severity integrity incident even when
the server is available.

## Roles

For SEV-1/2 name an incident lead, operations owner, investigator, and
communications owner. One person may fill several roles in a small project,
but ownership must be explicit. Only authorised deployment operators change
production.

## Process

1. **Detect and record:** timestamp, reporter, affected release/dataset,
   symptoms, scope, and confidence. Avoid copying secrets into the record.
2. **Contain:** stop promotion; revoke exposed credentials; disable a harmful
   integration; or roll back to a known-good saved version.
3. **Preserve evidence:** deployment IDs, commit, SBOM, logs with access
   restrictions, screenshots plus reproduction steps, and relevant manifests.
4. **Eradicate:** fix the root cause, rotate affected secrets, update unsafe
   dependencies, or correct the source/transformation.
5. **Recover:** run full validation, deploy through staging and approval, and
   monitor the release.
6. **Communicate:** state user impact and verified facts. Do not speculate or
   claim "no data was affected" without evidence.
7. **Learn:** write a blameless review with timeline, contributing controls,
   detection gaps, actions, owners, and dates.

## Special cases

- **Secret in source or artefact:** revoke first; deleting a file or rewriting
  visible history is not revocation. Determine where the secret was copied.
- **Dependency compromise:** freeze releases, preserve lockfile/SBOM, identify
  affected builds, rotate CI/deployment credentials as warranted, and rebuild
  from reviewed dependencies.
- **Incorrect scientific data:** mark affected content, trace its source and
  transformations, consult a qualified reviewer, correct with provenance, and
  disclose the affected release range.
- **Privacy concern:** stop unnecessary collection, restrict logs, identify the
  deployment operator's obligations, and avoid expanding access during
  investigation.
- **Stale/compromised service worker:** preserve the affected build and cache
  name, restrict the release if needed, publish a reviewed worker/cache
  rotation, and verify recovery in existing controlled clients as well as a
  clean context.
- **API abuse or inconsistent projection:** preserve correlation/release IDs,
  apply provider-edge limits rather than relying on isolate-local counters,
  compare the bundled UI/API dataset revision, and roll back if scientific
  projections disagree.

## Post-incident minimum record

- impact and duration;
- affected versions and environments;
- detection and containment timestamps;
- root cause and contributing conditions;
- evidence supporting data/security claims;
- recovery validation;
- whether users or providers must be notified; and
- corrective actions with accountable owners.
