import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const SECRET_SIGNATURES = Object.freeze([
  {
    label: "private key",
    pattern:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
  },
  { label: "secret token", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: "AWS access key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    label: "GitHub token",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{70,})\b/,
  },
  {
    label: "GitLab access token",
    pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/,
  },
  { label: "npm access token", pattern: /\bnpm_[A-Za-z0-9]{36,}\b/ },
  {
    label: "PyPI upload token",
    pattern: /\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{40,}\b/,
  },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  {
    label: "Google OAuth client secret",
    pattern: /\bGOCSPX-[0-9A-Za-z_-]{20,}\b/,
  },
  {
    label: "Slack token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  },
  {
    label: "Stripe live credential",
    pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/,
  },
  {
    label: "SendGrid API key",
    pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{32,}\b/,
  },
  {
    label: "embedded URL credential",
    pattern:
      /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^/\s:@]{1,64}:[^/\s@]{8,}@/i,
  },
  {
    label: "cloud account key",
    pattern: /\bAccountKey=[A-Za-z0-9+/]{40,}={0,2}\b/,
  },
]);

const GENERIC_CREDENTIAL_ASSIGNMENT =
  /\b(?:api[_-]?key|aws[_-]?secret[_-]?access[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|password|passwd|secret|token)\b\s*[:=]\s*["']?([A-Za-z0-9_+./=@%:-]{20,200})["']?/giu;

const executableSourcePatterns = [
  { label: "unsafe eval", pattern: /\beval\s*\(/ },
  { label: "unsafe HTML injection", pattern: /\bdangerouslySetInnerHTML\b/ },
  {
    label: "wildcard CORS",
    pattern: /access-control-allow-origin["']?\s*[:,]\s*["']\*/i,
  },
];

function shannonEntropy(value) {
  const frequencies = new Map();
  for (const character of value) {
    frequencies.set(character, (frequencies.get(character) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of frequencies.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function resemblesHighEntropyCredential(value) {
  if (value.length < 24) return false;
  const characterClasses = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[_+./=@%:-]/.test(value),
  ].filter(Boolean).length;
  return characterClasses >= 3 && shannonEntropy(value) >= 3.5;
}

export function findSecretLabels(content) {
  const labels = new Set();
  for (const { label, pattern } of SECRET_SIGNATURES) {
    if (pattern.test(content)) labels.add(label);
  }

  for (const match of content.matchAll(GENERIC_CREDENTIAL_ASSIGNMENT)) {
    const candidate = match[1] ?? "";
    if (resemblesHighEntropyCredential(candidate)) {
      labels.add("high-entropy credential assignment");
    }
  }

  return [...labels].sort();
}

function enumerateSourceFiles(root) {
  const rg = spawnSync(
    process.platform === "win32" ? "rg.exe" : "rg",
    [
      "--files",
      "--hidden",
      "-g",
      "!node_modules/**",
      "-g",
      "!dist/**",
      "-g",
      "!.git/**",
      "-g",
      "!outputs/**",
      "-g",
      "!*.png",
      "-g",
      "!*.gz",
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (!rg.error && (rg.status === 0 || rg.status === 1)) {
    return rg.stdout.split(/\r?\n/).filter(Boolean);
  }

  // ripgrep is unavailable or failed; fall back to Git's tracked plus
  // untracked-but-not-ignored listing so the gate still runs everywhere.
  const git = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  );
  if (git.error || git.status !== 0) {
    throw new Error(
      `Unable to enumerate source files: ${
        git.stderr || git.error?.message || "ripgrep and git are unavailable"
      }`,
    );
  }
  return git.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((path) => !/\.(?:png|gz)$/.test(path))
    .filter((path) => !/^(?:node_modules|dist|outputs)\//.test(path));
}

export async function runWorkingTreeSecurityScan() {
  const root = new URL("../", import.meta.url);

  const findings = [];
  for (const relativePath of enumerateSourceFiles(root)) {
    const normalizedPath = relativePath.replaceAll("\\", "/");
    if (normalizedPath === "scripts/security-scan.mjs") continue;

    const url = new URL(
      `../${relativePath.replaceAll("\\", "/")}`,
      import.meta.url,
    );
    const content = await readFile(url, "utf8");
    for (const label of findSecretLabels(content)) {
      findings.push(`${relativePath}: ${label}`);
    }

    const isExecutableSource =
      /^(?:app|lib|packages|pipelines|scripts|worker)\//.test(normalizedPath) &&
      /\.(?:[cm]?[jt]sx?)$/.test(normalizedPath);
    if (!isExecutableSource) continue;

    for (const { label, pattern } of executableSourcePatterns) {
      if (pattern.test(content)) findings.push(`${relativePath}: ${label}`);
    }
  }

  return findings;
}

async function main() {
  const findings = await runWorkingTreeSecurityScan();
  if (findings.length > 0) {
    console.error(findings.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Source security invariants and secret-pattern scan passed.");
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  await main();
}
