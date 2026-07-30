# Validation report

## Status

- Audit date: 2026-07-30
- Ownership: Atlas of the Cosmos is an Annas M. Ishtiaq project
- Local environment: Windows, Node.js `v24.16.0`, npm `11.13.0`
- Automated browser: Chromium `150.0.4078.105`
- Data/storage mode: deterministic four-record OpenNGC development sample;
  D1 and R2 intentionally unbound
- Managed access inspection: custom owner-only policy with one allowed owner
  and no group grants
- Hosted release state: no source upload, saved version, preview, staging, or
  production deployment was performed during this audit
- Local release decision: validated with the clean-install exception recorded
  below; not a hosted-release approval

This report records what was actually exercised. It is not a claim of complete
scientific coverage, WCAG conformance, universal device support, production
security, or hosted-deployment success.

## Final local evidence summary

| Evidence area             | Result                        | Qualification                                                                                                                                |
| ------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| dependency tree           | pass                          | `npm ls --all --omit=optional` exited 0; platform-inapplicable optional packages were reported as expected                                   |
| clean installation        | not repeated                  | the verified workspace-scoped raw removal request was blocked by an external execution control, so this audit did not claim a fresh `npm ci` |
| deterministic data        | pass                          | 4 source records, 4 preview tiles, and 4 detail tiles regenerated successfully                                                               |
| unit tests                | 80/80 pass                    | no failures, skips, cancellations, or todos                                                                                                  |
| integration tests         | 10/10 pass                    | API contracts plus migration, seed, constraints, parity, checksum, and rollback artefacts                                                    |
| security tests            | 12/12 pass                    | API abuse, response policy, unsafe-source, and security utility cases                                                                        |
| static accessibility      | 2/2 pass                      | source invariants only                                                                                                                       |
| static performance guards | 3/3 pass                      | batching, disposal/fallback, route split, bounded cache, and asset invariants                                                                |
| rendered Worker tests     | 2/2 pass                      | built HTML, linked assets, and response policy                                                                                               |
| Node coverage             | pass                          | 102 tests; 89.61% lines, 71.52% branches, 93.35% functions                                                                                   |
| browser end to end        | 31 pass, 22 intentional skips | 53 project/test combinations, 0 failures                                                                                                     |
| visual regression         | 5/5 pass                      | two reviewed baselines were intentionally refreshed after minimum target/text-size changes                                                   |
| rendered accessibility    | pass in automated scope       | all 19 routes had no serious or critical axe findings                                                                                        |
| browser issue audit       | pass in covered flows         | 0 unexpected console, page, request, or HTTP issues                                                                                          |
| dependency licences       | policy gate pass              | 514 locked packages; 43 reciprocal-licence entries retained for obligation review                                                            |
| dependency advisory audit | high-severity gate pass       | 4 moderate development-tool findings remain in the legacy esbuild chain; the available remediation is breaking                               |
| source/secret scan        | pass                          | working-tree invariants and bounded repository-history scan passed                                                                           |
| SBOM                      | generated                     | CycloneDX 1.6 document with 509 components                                                                                                   |

The coverage aggregate instruments modules imported by the Node unit,
integration, and security runners. It does not measure React rendering, WebGL,
service-worker/browser execution, generated output, third-party code, or
declarative fixtures; those areas have separate browser, visual, static, or
manual evidence.

## Required 27-step final verification

| Step | Master procedure step               | Evidence from this audit                                                                                                                     | Status                               |
| ---: | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
|    1 | remove dependencies/build output    | both candidate paths were resolved and confirmed inside the workspace, but the removal request was rejected by an external execution control | blocked externally; not claimed      |
|    2 | clean dependency installation       | not attempted after step 1 was blocked; the existing installed tree passed `npm ls --all --omit=optional`                                    | not repeated                         |
|    3 | start required local infrastructure | environment check passed; D1/R2 are unbound, so no infrastructure service is required for this release mode                                  | not applicable by design             |
|    4 | run database migrations             | `npm run db:migrate` exited 0 and reported the documented unbound-D1 no-op                                                                   | pass                                 |
|    5 | import sample data                  | `npm run db:seed` exited 0 with the documented no-op; `npm run data:sample` produced 4 source, 4 preview, and 4 detail records               | pass                                 |
|    6 | formatting checks                   | `npm run format:check`                                                                                                                       | pass                                 |
|    7 | linting                             | `npm run lint`                                                                                                                               | pass                                 |
|    8 | type checking                       | `npm run typecheck` and `npm run typecheck:packages`                                                                                         | pass                                 |
|    9 | unit tests                          | `npm run test:unit`: 80/80                                                                                                                   | pass                                 |
|   10 | integration tests                   | `npm run test:integration`: 10/10                                                                                                            | pass                                 |
|   11 | production build                    | `npm run build`; largest minified client chunk was 570,075 bytes and retained the build-size warning                                         | pass with documented warning         |
|   12 | end-to-end tests                    | rendered Worker 2/2; Playwright 31 passed, 22 intentional cross-project skips, 0 failed; all five visual baselines passed                    | pass                                 |
|   13 | accessibility tests                 | static 2/2; all 19 routes had no serious/critical automated axe findings                                                                     | automated scope pass                 |
|   14 | security scans                      | security tests 12/12; source scan passed; licence gate accepted 514 packages and retained 43 reciprocal entries for review                   | pass with obligations                |
|   15 | secret scans                        | working tree passed; bounded history scan passed across 276 reachable objects, including 178 text blobs                                      | pass; rerun after the release commit |
|   16 | generate SBOM                       | CycloneDX 1.6 SBOM containing 509 components                                                                                                 | pass                                 |
|   17 | dependency audit                    | configured high-severity gate passed; four moderate development-tool findings remain                                                         | pass at configured threshold         |
|   18 | representative performance tests    | semantic ready 858 ms; search 121 ms; three navigation cycles 1,608 ms; heap growth 1,422,572 bytes; graphics ready; browser errors 0        | pass within smoke budgets            |
|   19 | inspect browser console             | strict issue collector found no unexpected issues in covered principal flows                                                                 | pass in automated scope              |
|   20 | inspect server logs                 | local Worker log showed no application 4xx/5xx failure in the covered flows                                                                  | pass locally                         |
|   21 | verify mobile layouts               | portrait navigation/catalogue flow plus a dedicated 800×430 landscape explorer flow passed                                                   | automated-emulation scope pass       |
|   22 | verify keyboard-only navigation     | principal navigation, search, catalogue selection, canvas controls, focus containment, and tabs passed                                       | automated scope pass                 |
|   23 | verify reduced-motion mode          | operating-system preference and in-app mode produced immediate/shortened travel behaviour; tour progress/resume checks passed                | automated scope pass                 |
|   24 | verify network-failure behaviour    | warm route and partial-cache/uncached-navigation shell fallback passed under simulated network loss                                          | warm/partial-cache scope pass        |
|   25 | verify tour interruption            | start, pause, resume, chapter navigation, pointer interruption, completion persistence, replay, and exit passed                              | automated scope pass                 |
|   26 | verify graphics fallback            | initial WebGL failure and post-initialisation context loss both exposed semantic fallback; recovery passed                                   | automated scope pass                 |
|   27 | record results                      | commands, counts, warnings, metrics, exceptions, residual risks, and assurance exclusions are recorded here                                  | recorded                             |

`npm run validate` composes the local gates, but this report records the
sub-results individually so a single aggregate exit code cannot hide scope or
exceptions.

## Manual assurance exclusions

The local evidence does **not** include:

- a real screen-reader and assistive-technology matrix;
- physical gamepad hardware;
- a physical phone/tablet lab across portrait and landscape;
- representative multi-GPU/driver and broad cross-browser matrices;
- a manual right-to-left locale pass;
- destructive cache-corruption and constrained-memory labs;
- long-duration production load, soak, or distributed rate-limit tests; or
- hosted database migration, backup, restore, and rollback exercises.

Browser emulation, automated axe results, and keyboard checks do not establish
WCAG conformance. Context-loss automation does not establish recovery on every
physical GPU/driver combination.

## Deployment addendum

Before promotion, the release operator records:

- the exact immutable commit, clean worktree state, post-commit history scan,
  environment-specific archive hash, and package manifest;
- saved-version/deployment references and terminal status, kept in the
  restricted release record rather than public documentation;
- authenticated hosted checks for TLS, headers, health, readiness, version,
  ETag/304 behaviour, and provider-edge rate limiting;
- redacted hosted-log review and confirmation that the owner-only access policy
  remains unchanged; and
- approver, rollback target, release decision, and incident/runbook owner.

Never attach a source credential, access token, identity header, cookie,
session value, or full browser-storage dump.
