# Security policy

## Supported version

Security fixes target the latest deployed release and the current `main`
branch. Older saved deployments should be upgraded or rolled back to a fixed
version; they do not receive indefinite patch support.

## Report privately

Do not disclose a suspected vulnerability, exposed credential, personal data,
or working exploit in a public issue or discussion.

Use the repository host's private vulnerability-reporting or Security Advisory
channel when one is enabled. Otherwise contact the repository/deployment owner
through their established private security channel and ask for a secure way to
share details. If no private channel is published, report only that you need
security contact—do not include exploit details.

Include, when safe:

- affected URL, commit, version, or dataset version;
- vulnerability class and realistic impact;
- minimum reproduction steps or proof of concept;
- required privileges and browser/environment;
- whether a secret or personal data may already be exposed; and
- suggested mitigation, if known.

Do not access other users' data, persist access, degrade the service, run
high-volume tests, exfiltrate secrets, or broaden a proof beyond what is needed
to demonstrate the issue. Stop and report if testing reveals a real credential
or private data.

## What to expect

Maintainers will aim to acknowledge a report promptly, establish a confidential
contact, validate impact, contain active exposure, and coordinate a fix and
disclosure. Response timing depends on maintainer availability and severity;
this policy does not promise a bounty or fixed remediation deadline.

Reporters acting in good faith and within the constraints above will not be
treated as malicious merely for submitting a mistaken or duplicate report.
This is not legal advice or authorisation to violate law, provider terms, or
third-party systems.

## Security design

The default application is anonymous and read-oriented, with bundled sample
data, a versioned read-only API, a same-origin service worker, and device-local
preferences/history/progress. It has no active product account, write API,
database, object-store binding, or administration interface. See:

- [Security model](docs/security/security-model.md)
- [Threat model](docs/security/threat-model.md)
- [Incident response](docs/operations/incident-response.md)

Never commit secrets. If a credential is exposed, revoke or rotate it first;
deleting the file or rewriting visible history does not invalidate copied
values.
