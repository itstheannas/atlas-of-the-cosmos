# Contributing to Atlas of the Cosmos

Thank you for improving Atlas. Contributions must preserve scientific honesty,
accessibility, privacy, and a useful non-3D experience—not only visual impact.

## Ownership and contribution terms

Atlas of the Cosmos is an Annas M. Ishtiaq project. Copyright © 2026
Annas M. Ishtiaq. All rights reserved. This repository does not offer a public
licence or an automatic right to copy, modify, distribute, or reuse
project-authored material; see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

Every contribution is accepted only under the
[Contributor License Agreement](CONTRIBUTOR_LICENSE_AGREEMENT.md);
submitting a pull request constitutes acceptance of its terms. Agree any
different terms in writing with Annas M. Ishtiaq before submitting.

## Set up

Use Node.js `>=22.13.0` and the committed lockfile:

```bash
npm ci
npm run validate
npm run dev
```

Enable the repository-owned pre-commit checks once per clone:

```bash
git config core.hooksPath .githooks
```

The hook runs environment validation, formatting, lint, both TypeScript
checks, deterministic tests, the source security scan, and locked-dependency
licence policy. It deliberately avoids network-backed advisory lookups and
browser downloads. Hooks can be bypassed, so the protected CI gate remains
authoritative.

Do not commit `node_modules`, build output, Wrangler state, local logs, or
secrets. `.env.example` documents the default no-secret configuration.

## Before changing code

- Read the [architecture overview](docs/architecture/overview.md), relevant
  ADRs, and [known limitations](docs/known-limitations.md).
- Keep framework-neutral science logic out of React components.
- Keep per-frame renderer mutation out of React state.
- Preserve semantic catalogue/tour access without WebGL.
- Open an ADR when changing a durable system boundary, persistence/data model,
  deployment topology, or security/privacy assumption.

## Scientific and content changes

Every catalogue-backed value needs traceable source metadata. A data change
must identify provider, dataset/release, retrieval/publication date, licence,
attribution, coordinate frame/epoch, units, uncertainty/null policy,
transformations, and limitations.

- Never invent a value to fill a missing field.
- Never assign a scientific identifier to a procedural object.
- Label estimates, models, conceptual boundaries, and illustrative
  reconstructions at the point of use.
- Preserve meaningful precision; more decimal places are not more accuracy.
- Verify that data and assets may be redistributed.
- Include deterministic fixtures/tests and update manifests in the same change.

See [Data provenance](docs/data-sources/provenance.md).

## Application changes

- Use strict TypeScript and avoid `any` unless a narrow, documented external
  boundary makes it unavoidable.
- Use native semantic elements and visible focus styles.
- Respect OS and in-app reduced motion.
- Make automated travel/tours interruptible.
- Validate route, storage, file, and future network inputs.
- Do not add unsafe HTML, `eval`, wildcard production CORS, client secrets, or
  client-only authorisation.
- Dispose Three.js resources, animation frames, listeners, and observers.
- Bound quality, pixel ratio, and generated scene density.

## Tests and validation

Add the smallest test at the correct boundary. Scientific reference fixtures
must be independently justified rather than copied from the implementation.

Before opening a change:

```bash
npm run validate
```

`validate` already runs formatting, lint, both type checks, sample-data
regeneration, deterministic tests, source scanning, the production build,
rendered-Worker checks, Playwright desktop/mobile/axe/visual checks, and SBOM
generation. It also performs environment validation, locked-dependency licence
policy/reporting, and the network-backed high-severity dependency advisory
audit.

For visual, renderer, responsive, or accessibility work, also complete the
relevant manual checks in:

- [Accessibility statement](docs/accessibility/accessibility.md)
- [Testing strategy](docs/testing/strategy.md)
- [Performance guide](docs/performance.md)
- [Operations smoke check](docs/operations/runbook.md)

Report actual commands and results. Do not say a flow passed because it has a
test file or looked correct in one screenshot.

## Commits and pull requests

Prefer focused commits with imperative subjects, for example:

```text
fix(search): preserve catalogue provenance in results
test(coordinates): add negative-parallax policy cases
docs(security): record remote catalogue trust boundary
```

A pull request should include:

- the user/scientific problem and chosen approach;
- changed architecture or trust assumptions;
- source/licence details for data/assets;
- commands actually run and their results;
- manual browser/accessibility/performance checks where relevant;
- screenshots only as supporting evidence; and
- remaining limitations or follow-up work.

Do not mix an unrelated dependency upgrade, data refresh, and feature unless
they cannot be reviewed independently. Major dependency updates require the
full gate.

## Security

Do not open a public issue for a suspected vulnerability or exposed secret.
Follow [SECURITY.md](SECURITY.md). Revoke an exposed credential immediately;
removing it from a later commit is not sufficient.

## Conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
