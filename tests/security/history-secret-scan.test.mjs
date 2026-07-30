import assert from "node:assert/strict";
import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { findSecretLabels } from "../../scripts/security-scan.mjs";
import {
  formatHistoryFinding,
  isBinaryBlob,
  sanitizeHistoryPath,
  scanGitHistory,
} from "../../scripts/history-secret-scan.mjs";

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed: ${result.stderr}`,
  );
}

test("credential signatures include fixed formats and entropy-like assignments", () => {
  const providerToken = `${["gh", "p_"].join("")}${"A".repeat(36)}`;
  const highEntropyValue = [
    "A7vQ",
    "2x-P",
    "9mR4",
    "sT8_",
    "cL3n",
    "Z6wK",
    "1dF5",
  ].join("");
  const assignment = `${["client", "secret"].join("_")}="${highEntropyValue}"`;

  assert.deepEqual(findSecretLabels(providerToken), ["GitHub token"]);
  assert.deepEqual(findSecretLabels(assignment), [
    "high-entropy credential assignment",
  ]);
});

test("binary detection and diagnostic path sanitization avoid secret disclosure", () => {
  const providerToken = `${["npm", "_"].join("")}${"B".repeat(36)}`;
  assert.equal(
    isBinaryBlob(Buffer.concat([Buffer.from([0]), Buffer.from(providerToken)])),
    true,
  );
  assert.equal(
    sanitizeHistoryPath(`${"archive/".repeat(40)}${providerToken}.txt`),
    "<redacted-path>",
  );
});

test("full-history scan finds deleted blobs and commit-message credentials without returning values", async (context) => {
  const repository = await mkdtemp(
    join(tmpdir(), "atlas-history-secret-scan-"),
  );
  const shallowRepository = `${repository}-shallow`;
  context.after(async () => {
    await Promise.all([
      rm(repository, { recursive: true, force: true }),
      rm(shallowRepository, { recursive: true, force: true }),
    ]);
  });

  runGit(repository, ["init", "--quiet"]);
  runGit(repository, ["config", "user.name", "Atlas Security Test"]);
  runGit(repository, ["config", "user.email", "security-test@example.invalid"]);

  await writeFile(join(repository, "clean.txt"), "reviewed content\n", "utf8");
  runGit(repository, ["add", "clean.txt"]);
  runGit(repository, ["commit", "--quiet", "-m", "initial"]);

  const historicalToken = `${["npm", "_"].join("")}${"C".repeat(36)}`;
  await writeFile(
    join(repository, "historical-leak.txt"),
    `credential=${historicalToken}\n`,
    "utf8",
  );
  runGit(repository, ["add", "historical-leak.txt"]);
  runGit(repository, ["commit", "--quiet", "-m", "temporary fixture"]);

  await unlink(join(repository, "historical-leak.txt"));
  runGit(repository, ["add", "--all"]);
  runGit(repository, ["commit", "--quiet", "-m", "remove fixture"]);

  const messageToken = `${["gl", "pat-"].join("")}${"D".repeat(24)}`;
  await writeFile(join(repository, "second.txt"), "second commit\n", "utf8");
  runGit(repository, ["add", "second.txt"]);
  runGit(repository, [
    "commit",
    "--quiet",
    "-m",
    `credential rotation ${messageToken}`,
  ]);

  const result = await scanGitHistory({ cwd: repository });
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.path === "historical-leak.txt" &&
        finding.label === "npm access token",
    ),
  );
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.path === "<commit-object>" &&
        finding.label === "GitLab access token",
    ),
  );
  assert.doesNotMatch(JSON.stringify(result), new RegExp(historicalToken));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(messageToken));
  assert.doesNotMatch(
    result.findings.map(formatHistoryFinding).join("\n"),
    new RegExp(historicalToken),
  );

  runGit(tmpdir(), [
    "clone",
    "--quiet",
    "--depth=1",
    pathToFileURL(repository).href,
    shallowRepository,
  ]);
  await assert.rejects(
    scanGitHistory({ cwd: shallowRepository }),
    /requires a non-shallow checkout/u,
  );
});
