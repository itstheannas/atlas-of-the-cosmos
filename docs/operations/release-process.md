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
npm run release:package -- --environment production
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

The manually dispatched `Release candidate` workflow supplies protected
`preview`, `staging`, and `production` packaging paths after an unprotected
validation job passes. The packaging job uses `deployment: false`. Configure
required reviewers and prevent self-review where the private-repository plan
supports them; otherwise retain a separate owner approval record. Its uploaded
artifact is a validated, environment-bound candidate, not a deployment:
source upload, immutable version creation, and deployment still require the
separate approval and control sequence in the step-by-step guide.

Use the [validation report](validation-report.md) as the evidence checklist and
replace its audit snapshot with the final commit's actual results.

Review changes to dependencies, workflows, source/provenance manifests,
security-sensitive configuration, persistence schemas, and architecture
decisions explicitly.

## Promotion

1. Save and deploy the exact candidate commit to the separate staging project.
2. Complete staging verification.
3. Obtain explicit production approval.
4. Save and deploy the same source state to production.
5. Verify the terminal deployment status and production response.
6. Verify `/api/v1/ready`, security headers, service-worker update, and a clean
   and previously controlled browser context.
7. Confirm the managed Sites custom access policy still permits only the
   approved owner account, with no group-wide access.
8. Attach commit, dataset version, SBOM, licence report/review, coverage and
   performance reports, visual review, validation log, deployment ID, access
   policy shape, and approver to the release record. Never attach an access
   token.

Production must not automatically deploy from an unreviewed pull request.
Dependabot major updates never bypass the full gate.

## Versioning

Until a public semantic-version policy is adopted, use the Git commit as the
unambiguous build identity and a separately versioned dataset manifest. Do not
imply that an application version uniquely identifies external source releases
unless the release record contains the mapping.

## Rollback and hotfix

Rollback uses a last known-good saved deployment as described in the deployment
guide. A hotfix still requires review, automated checks, a recorded scientific
data decision if applicable, and explicit production approval. Follow-up work
must restore any temporarily shortened validation within an owner-approved
deadline.
