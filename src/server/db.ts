import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Local SQLite database. `node:sqlite` ships with Node 22.5+, so the app needs
 * no database server, no native module and no hosted backend.
 */
export type Db = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  token_identifier TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  role TEXT,
  full_name TEXT,
  phone TEXT,
  onboarded_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS users_by_role ON users (role);

CREATE TABLE IF NOT EXISTS physician_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  licensing_body TEXT NOT NULL,
  specialty TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  facility_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  review_note TEXT,
  reviewed_by_id TEXT,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS physician_profiles_by_status ON physician_profiles (status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_logs_by_entity ON audit_logs (entity_type, entity_id, at DESC);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  procedure TEXT NOT NULL,
  status TEXT NOT NULL,
  submitted_by_id TEXT NOT NULL REFERENCES users (id),
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
CREATE INDEX IF NOT EXISTS referrals_by_submitter ON referrals (submitted_by_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS referrals_by_status ON referrals (status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS referral_documents (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  storage_id TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  uploaded_by_id TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_documents_by_referral ON referral_documents (referral_id);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referrals_by_submitted ON referrals (submitted_at DESC);

-- Clinical review (M5): one row per decision, plus the notes thread.
CREATE TABLE IF NOT EXISTS referral_reviews (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  priority TEXT,
  modality TEXT,
  redirect_to TEXT,
  checklist_json TEXT NOT NULL,
  note TEXT,
  reviewer_id TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_reviews_by_referral ON referral_reviews (referral_id, at DESC);

CREATE TABLE IF NOT EXISTS referral_notes (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_notes_by_referral ON referral_notes (referral_id, at ASC);

CREATE TABLE IF NOT EXISTS referral_events (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  actor_id TEXT,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_events_by_referral ON referral_events (referral_id, at ASC);

-- Urgent intussusception coordination (M4): a separate pathway, never the
-- elective booking calendar.
CREATE TABLE IF NOT EXISTS urgent_cases (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  department TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  facility_phone TEXT NOT NULL,
  clinician_name TEXT NOT NULL,
  clinician_phone TEXT NOT NULL,
  patient_json TEXT NOT NULL,
  guardian_json TEXT,
  clinical_json TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  acknowledged_by_id TEXT,
  acknowledged_at TEXT,
  decision TEXT,
  decision_note TEXT,
  decided_by_id TEXT,
  decided_at TEXT,
  scheduled_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS urgent_cases_by_status ON urgent_cases (status, created_at DESC);

CREATE TABLE IF NOT EXISTS urgent_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES urgent_cases (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  actor_id TEXT,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS urgent_events_by_case ON urgent_events (case_id, at ASC);

-- Scheduling (M6): configurable resources, durations and exceptions.
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  modality TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS resources_by_kind ON resources (kind, active);

CREATE TABLE IF NOT EXISTS procedure_settings (
  procedure TEXT PRIMARY KEY,
  duration_minutes INTEGER NOT NULL,
  buffer_minutes INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL UNIQUE REFERENCES referrals (id) ON DELETE CASCADE,
  procedure TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  room_id TEXT,
  equipment_id TEXT,
  radiologist_id TEXT,
  status TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  cancel_reason TEXT,
  reschedule_of TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS appointments_by_start ON appointments (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS appointments_by_status ON appointments (status, starts_at);

CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  resource_id TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  note TEXT,
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS schedule_exceptions_by_range ON schedule_exceptions (starts_at, ends_at);

-- Preparation and procedure day (M7).
CREATE TABLE IF NOT EXISTS preparation (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL UNIQUE REFERENCES referrals (id) ON DELETE CASCADE,
  instructions TEXT NOT NULL,
  state TEXT NOT NULL,
  issued_by_id TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  acknowledged_at TEXT,
  acknowledged_by_id TEXT,
  completed_at TEXT,
  completed_by_id TEXT,
  review_note TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  recorded_by_id TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS consent_records_by_referral ON consent_records (referral_id, at DESC);

CREATE TABLE IF NOT EXISTS procedure_steps (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL REFERENCES appointments (id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  at TEXT NOT NULL,
  by_id TEXT NOT NULL,
  note TEXT,
  UNIQUE (appointment_id, step)
);

CREATE TABLE IF NOT EXISTS specimens (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  collection_type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  containers INTEGER NOT NULL DEFAULT 1,
  destination TEXT,
  status TEXT NOT NULL,
  dispatched_at TEXT,
  responsible_id TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS specimens_by_referral ON specimens (referral_id);

CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL,
  note TEXT,
  assignee_id TEXT,
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS follow_up_tasks_by_referral ON follow_up_tasks (referral_id, status);

-- Notifications (M8): in-app rows plus a delivery log per channel.
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_by_user ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  detail TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notification_deliveries_by_notification ON notification_deliveries (notification_id);

-- Administration (M9).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS institutions_by_name ON institutions (name);
`;

/** Columns added after the first release; `CREATE TABLE IF NOT EXISTS` cannot
 * add them to an existing database, so they are applied here idempotently. */
const ADDED_COLUMNS: Array<[table: string, column: string, ddl: string]> = [
  ["referrals", "priority", "TEXT"],
  ["referrals", "review_modality", "TEXT"],
  ["referrals", "reviewed_by_id", "TEXT"],
  ["referrals", "reviewed_at", "TEXT"],
  ["referrals", "review_note", "TEXT"],
  ["referrals", "redirect_to", "TEXT"],
  ["referrals", "payment_status", "TEXT NOT NULL DEFAULT 'unset'"],
  ["referrals", "fee_cents", "INTEGER"],
  ["referrals", "payment_note", "TEXT"],
];

function migrate(db: DatabaseSync): void {
  for (const [table, column, ddl] of ADDED_COLUMNS) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name?: string;
    }>;
    if (columns.some((entry) => entry.name === column)) continue;
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    } catch {
      // A concurrent process already added it; the next start will see it.
    }
  }
}

/** Uploaded documents live beside the database, never in the database file. */
export function dataDir(): string {
  return process.env.DATA_DIR ?? resolve(process.cwd(), "data");
}

export function databasePath(): string {
  return process.env.DATABASE_PATH ?? resolve(dataDir(), "app.db");
}

export function uploadDir(): string {
  return resolve(dataDir(), "uploads");
}

export function openDatabase(path: string = databasePath()): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  seedDefaults(db);
  return db;
}

let shared: Db | undefined;

/** One connection per process; `openDatabase(":memory:")` is used by tests. */
export function getDb(): Db {
  shared ??= openDatabase();
  return shared;
}

export function newId(): string {
  return randomUUID();
}

/** Row helpers: node:sqlite returns null-prototype objects, so we cast once. */
export function getRow<T>(
  db: Db,
  sql: string,
  ...params: Array<string | number | null>
): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function allRows<T>(
  db: Db,
  sql: string,
  ...params: Array<string | number | null>
): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function run(
  db: Db,
  sql: string,
  ...params: Array<string | number | null>
): void {
  db.prepare(sql).run(...params);
}

/**
 * Runs `fn` inside one write transaction. Booking conflict checks and status
 * changes use this so a failed check rolls the whole change back.
 */
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Nothing to roll back (the statement failed before starting).
    }
    throw error;
  }
}

/**
 * Editable starting values for procedure durations. These are rows an
 * administrator can change in Admin → Procedures; they are not clinical rules
 * and the scheduling engine reads them as data.
 */
function seedDefaults(db: Db): void {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO procedure_settings (procedure, duration_minutes, buffer_minutes, active, updated_at)
     VALUES (?, ?, ?, 1, ?)`,
  );
  insert.run("biopsy-fnac", 45, 15, now);
  insert.run("abscess-drainage", 60, 15, now);
}
