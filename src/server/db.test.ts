import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import {
  allRows,
  applyMigrations,
  latestSchemaVersion,
  migrate,
  openDatabase,
  schemaVersion,
  type Db,
} from "./db.ts";

const directories: string[] = [];

function tempDatabase(): string {
  const directory = mkdtempSync(join(tmpdir(), "hakimerad-db-"));
  directories.push(directory);
  return join(directory, "app.db");
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function columns(db: Db, table: string): string[] {
  return allRows<{ name: string }>(db, `PRAGMA table_info(${table})`).map((row) => row.name);
}

describe("schema migrations", () => {
  it("brings a new database to the latest version", () => {
    const db = openDatabase(":memory:");

    expect(schemaVersion(db)).toBe(latestSchemaVersion());
    expect(columns(db, "users")).toContain("token_identifier");
    expect(columns(db, "referrals")).toContain("payment_status");
    // Seeded defaults still run after migrations.
    const procedures = allRows<{ procedure: string }>(
      db,
      "SELECT procedure FROM procedure_settings ORDER BY procedure",
    );
    expect(procedures.map((row) => row.procedure)).toEqual([
      "abscess-drainage",
      "biopsy-fnac",
    ]);
  });

  it("applies nothing when the database is already current", () => {
    const path = tempDatabase();
    const first = openDatabase(path);
    expect(schemaVersion(first)).toBe(latestSchemaVersion());
    first.close();

    const second = openDatabase(path);
    const result = migrate(second);
    expect(result).toEqual({ from: latestSchemaVersion(), to: latestSchemaVersion(), applied: [] });
    second.close();
  });

  it("upgrades a database created before migrations existed", () => {
    const path = tempDatabase();
    // The original shape: referrals without the review and payment columns, and
    // no recorded version at all.
    const legacy = new DatabaseSync(path);
    legacy.exec(`
      CREATE TABLE referrals (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        procedure TEXT NOT NULL,
        status TEXT NOT NULL,
        submitted_by_id TEXT NOT NULL,
        submitter_role TEXT NOT NULL,
        for_dependent INTEGER NOT NULL,
        patient_json TEXT NOT NULL,
        guardian_json TEXT,
        referrer_json TEXT NOT NULL,
        clinical_json TEXT NOT NULL,
        imaging_json TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    legacy.prepare(
      "INSERT INTO referrals (id, reference, procedure, status, submitted_by_id, submitter_role, for_dependent, patient_json, referrer_json, clinical_json, imaging_json, submitted_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      "r1",
      "ABC123",
      "biopsy-fnac",
      "submitted",
      "u1",
      "physician",
      0,
      "{}",
      "{}",
      "{}",
      "{}",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );
    expect(schemaVersion(legacy)).toBe(0);

    const result = migrate(legacy);
    expect(result.from).toBe(0);
    expect(result.to).toBe(latestSchemaVersion());
    expect(result.applied).toEqual([
      "baseline",
      "referral-review-and-payment-columns",
    ]);
    expect(columns(legacy, "referrals")).toContain("priority");
    expect(columns(legacy, "referrals")).toContain("payment_status");

    // The existing row survives and picks up the column default.
    const row = legacy.prepare("SELECT payment_status FROM referrals WHERE id = 'r1'").get() as
      | { payment_status: string }
      | undefined;
    expect(row?.payment_status).toBe("unset");
    legacy.close();
  });

  it("rolls a failed migration back and keeps the old version", () => {
    const db = new DatabaseSync(":memory:");
    expect(() =>
      applyMigrations(db, [
        { version: 1, name: "ok", up: (target) => target.exec("CREATE TABLE first (id TEXT)") },
        {
          version: 2,
          name: "broken",
          up: (target) => {
            target.exec("CREATE TABLE second (id TEXT)");
            target.exec("INSERT INTO missing_table VALUES (1)");
          },
        },
      ]),
    ).toThrow(/migration 2 \(broken\) failed/);

    expect(schemaVersion(db)).toBe(1);
    const tables = allRows<{ name: string }>(
      db,
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    ).map((row) => row.name);
    expect(tables).toContain("first");
    expect(tables).not.toContain("second");
    db.close();
  });
});
