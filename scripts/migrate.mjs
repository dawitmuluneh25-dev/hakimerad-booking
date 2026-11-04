#!/usr/bin/env node
// Applies pending database migrations, then reports the version that is live.
//
//   pnpm migrate                     # migrate the database at DATABASE_PATH
//   pnpm migrate --check             # exit 1 if migrations are pending (deploy gate)
//   DATABASE_PATH=/var/lib/hakimerad/app.db pnpm migrate
//
// The server also migrates on boot, so this is for operators: run it before
// starting a new release to see the change and to fail early in a pipeline.
// It needs Node's type stripping because it imports the TypeScript source.

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");

const { databasePath, latestSchemaVersion, migrate, openDatabase, schemaVersion } =
  await import("../src/server/db.ts");

const path = databasePath();
let db;
try {
  db = openDatabase(path);
} catch (error) {
  console.error(`Could not open ${path}`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const expected = latestSchemaVersion();
const before = schemaVersion(db);

if (checkOnly) {
  db.close();
  if (before === expected) {
    console.log(`Schema ${before} is current (${path}).`);
    process.exit(0);
  }
  console.error(`Schema ${before} has pending migrations; expected ${expected} (${path}).`);
  process.exit(1);
}

const result = migrate(db);
db.close();

console.log(`Database: ${path}`);
console.log(`Schema:   ${result.from} -> ${result.to} (latest ${expected})`);
if (result.applied.length === 0) {
  console.log("Already up to date.");
} else {
  for (const name of result.applied) console.log(`  applied ${name}`);
}
