const operation = process.argv[2];
if (operation !== "migrate" && operation !== "seed") {
  throw new Error("Usage: node scripts/database.mjs <migrate|seed>");
}

// The reference release binds no D1 database, so there is nothing to migrate
// or seed. Hosted migrations must run through the reviewed release process in
// docs/operations/deployment.md before a binding is ever enabled.
console.log(
  `No D1 binding is configured. ${operation} is intentionally a no-op for the anonymous, local-first reference release.`,
);
