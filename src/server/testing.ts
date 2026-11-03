import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Ctx, Identity } from "./context.ts";
import { openDatabase, type Db } from "./db.ts";
import { syncCurrentUser } from "./services/users.ts";

/** Fresh in-memory database per test; uploads go to a throwaway directory. */
export function createTestDb(): { db: Db; dispose: () => void } {
  const previous = process.env.DATA_DIR;
  const dir = mkdtempSync(join(tmpdir(), "hakimerad-test-"));
  process.env.DATA_DIR = dir;
  const db = openDatabase(":memory:");
  return {
    db,
    dispose: () => {
      db.close();
      if (previous === undefined) delete process.env.DATA_DIR;
      else process.env.DATA_DIR = previous;
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export function identityFor(subject: string): Identity {
  return {
    tokenIdentifier: `test|${subject}`,
    subject,
    email: `${subject}@example.com`,
    name: subject,
  };
}

/** A request context for one signed-in (or anonymous) caller. */
export function as(db: Db, subject: string | null): Ctx {
  return { db, identity: subject === null ? null : identityFor(subject) };
}

/** Creates the local user row for each named caller, like the OIDC callback does. */
export function signUp(db: Db, subjects: string[]): void {
  for (const subject of subjects) syncCurrentUser(as(db, subject));
}
