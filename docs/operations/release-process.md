# Release process

The exact checkout-to-production procedure is in the
[step-by-step deployment guide](deployment-step-by-step.md).

## Release inputs

Every candidate has:

- a reviewed commit;
- a lockfile;
- a generated/validated sample-data manifest;
- passing required CI jobs;
- an SBOM artefact;
- a locked-dependency licence report with reciprocal-component review;
- a Node coverage report with exclusions;
- reviewed visual baselines and the final visual-run result;
- the browser performance-smoke report plus any required manual traces;
- documented known limitations and security findings; and
- a human-readable version or commit identifier visible in the release record.

## Candidate checklist

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run db:migrate
npm run db:seed
npm run assets:sanitize
npm run validate
npm run security:audit
npm run start
```

Then run the manual smoke, accessibility, responsive, reduced-motion, and
failure-mode checks. Record actual results; a command existing in
`package.json` does not mean it passed.

`validate` contains the local environment/source/build/browser/SBOM gate and
the network-backed high-severity advisory audit. The standalone audit command
above is an intentional second record for the final verification checklist.
With D1 and R2 intentionally unbound, migrate/seed record an explicit no-op and
no infrastructure process is required. A release record should list the
subcommands and reports, not collapse a failing aggregate into an unexplained
status. `test:coverage` runs within `validate`; retain its sub-result and
coverage exclusions in the release record.

After `assets:sanitize`, confirm `public/og.png` has no unexpected diff; the
unit gate locks its reviewed dimensions, PNG chunk set, and SHA-256.

Deployment is a manual operator action taken only after the CI gate has
passed on the exact candidate commit. CI validates and archives build
artifacts; it does not deploy. Staging and production promotion follow the
approval and command sequence in the step-by-step guide, and production
promotion always requires a separate owner approval record.

Use the [validation report](validation-report.md) as the evidence checklist and
replace its audit snapshot with the final commit's actual results.

Review changes to dependencies, workflows, source/provenance manifests,
security-sensitive configuration, persistence schemas, and architecture
decisions explicitly.

## Promotion

1. Deploy the exact validated build to the separate staging Worker.
2. Complete staging verification.
3. Obtain explicit production approval.
4. Deploy the same validated build to the production Worker.
5. Verify the deployment succeeded and record its Workers version ID.
6. Verify `/api/v1/ready`, security headers, service-worker update, and a clean
   and previously controlled browser context.
7. Confirm the provider-edge rate-limiting rule remains active.
8. Attach commit, dataset version, SBOM, licence report/review, coverage and
   performance reports, visual review, validation log, Workers version ID,
   and approver to the release record. Never attach an access token.

Production must not automatically deploy from an unreviewed pull request.
Dependabot major updates never bypass the full gate.

## Versioning

Until a public semantic-version policy is adopted, use the Git commit as the
unambiguous build identity and a separately versioned dataset manifest. Do not
imply that an application version uniquely identifies external source releases
unless the release record contains the mapping.

## Rollback and hotfix

Rollback redeploys the last known-good Workers version as described in the
deployment guide. A hotfix still requires review, automated checks, a recorded scientific
data decision if applicable, and explicit production approval. Follow-up work
must restore any temporarily shortened validation within an owner-approved
deadline.
