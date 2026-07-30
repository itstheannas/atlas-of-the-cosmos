import { mkdir, readFile, writeFile } from "node:fs/promises";

const lock = JSON.parse(
  await readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
);

// This is an explicit release policy, not a claim that every use is
// automatically compliant. Reciprocal licences remain called out for review.
const reviewedExpressions = new Set([
  "0BSD",
  "Apache-2.0",
  "Apache-2.0 AND LGPL-3.0-or-later",
  "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "CC0-1.0",
  "ISC",
  "LGPL-3.0-or-later",
  "MIT",
  "MIT OR Apache-2.0",
  "MPL-2.0",
]);

const packages = [];
const findings = [];
for (const [path, value] of Object.entries(lock.packages ?? {})) {
  if (!path.includes("node_modules/") || typeof value?.version !== "string") {
    continue;
  }
  const name =
    typeof value.name === "string" && value.name.length > 0
      ? value.name
      : path.split("node_modules/").at(-1);
  const license = typeof value.license === "string" ? value.license : null;
  if (!name || !license) {
    findings.push(`${path}: missing package name or SPDX licence expression`);
    continue;
  }
  if (!reviewedExpressions.has(license)) {
    findings.push(`${name}@${value.version}: unreviewed licence ${license}`);
  }
  packages.push({
    name,
    version: value.version,
    license,
    developmentOnly: value.dev === true,
    reciprocalReview: /(?:LGPL|MPL)/.test(license),
  });
}

packages.sort((first, second) => {
  const byName = first.name.localeCompare(second.name, "en");
  return byName || first.version.localeCompare(second.version, "en");
});
const countsByLicense = Object.fromEntries(
  [...new Set(packages.map((entry) => entry.license))]
    .sort((first, second) => first.localeCompare(second, "en"))
    .map((license) => [
      license,
      packages.filter((entry) => entry.license === license).length,
    ]),
);
const report = {
  schemaVersion: 1,
  policy: "reviewed SPDX expressions; reciprocal transitive components flagged",
  packageCount: packages.length,
  countsByLicense,
  reciprocalComponents: packages.filter((entry) => entry.reciprocalReview),
  findings,
};

const outputDirectory = new URL("../outputs/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  new URL("license-report.json", outputDirectory),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (findings.length > 0) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Licence policy passed for ${packages.length} locked packages; ` +
      `${report.reciprocalComponents.length} reciprocal components are listed in outputs/license-report.json.`,
  );
}
