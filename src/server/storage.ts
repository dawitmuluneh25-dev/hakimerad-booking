import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRow, newId, run, uploadDir, type Db } from "./db.ts";
import { bad } from "./errors.ts";

export type FileMeta = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedById: string | null;
  createdAt: string;
};

type FileRow = {
  id: string;
  file_name: string;
  content_type: string;
  size: number;
  uploaded_by_id: string | null;
  created_at: string;
};

function toMeta(row: FileRow): FileMeta {
  return {
    id: row.id,
    fileName: row.file_name,
    contentType: row.content_type,
    size: row.size,
    uploadedById: row.uploaded_by_id,
    createdAt: row.created_at,
  };
}

export function filePathFor(id: string): string {
  return resolve(uploadDir(), id);
}

/** Stores bytes privately on disk and records the metadata row. */
export function storeFile(
  db: Db,
  input: { bytes: Uint8Array; fileName: string; contentType: string; uploadedById?: string },
): string {
  mkdirSync(uploadDir(), { recursive: true });
  const id = newId();
  writeFileSync(filePathFor(id), input.bytes);
  run(
    db,
    "INSERT INTO files (id, file_name, content_type, size, uploaded_by_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    input.fileName,
    input.contentType,
    input.bytes.byteLength,
    input.uploadedById ?? null,
    new Date().toISOString(),
  );
  return id;
}

export function getFileMeta(db: Db, id: string): FileMeta | null {
  const row = getRow<FileRow>(db, "SELECT * FROM files WHERE id = ?", id);
  return row ? toMeta(row) : null;
}

const STAFF_ROLES = ["receptionist", "radiologist", "coordinator", "admin"];

/**
 * Whether a signed-in user may read a stored file: the uploader, the submitter
 * of the request the file is attached to, or a staff member. Everyone else is
 * treated as if the file does not exist (the route returns 404, not 403).
 */
export function canReadFile(
  db: Db,
  user: { id: string; role: string | null },
  fileId: string,
): boolean {
  const meta = getFileMeta(db, fileId);
  if (!meta) return false;
  if (meta.uploadedById === user.id) return true;
  if (user.role && STAFF_ROLES.includes(user.role)) return true;

  const attached = getRow<{ referral_id: string }>(
    db,
    "SELECT referral_id FROM referral_documents WHERE storage_id = ?",
    meta.id,
  );
  if (!attached) return false;

  const owner = getRow<{ submitted_by_id: string }>(
    db,
    "SELECT submitted_by_id FROM referrals WHERE id = ?",
    attached.referral_id,
  );
  return owner?.submitted_by_id === user.id;
}

export function readFile(id: string): Uint8Array {
  try {
    return readFileSync(filePathFor(id));
  } catch {
    bad("The uploaded file is no longer available.");
  }
}

export function deleteFile(db: Db, id: string): void {
  run(db, "DELETE FROM files WHERE id = ?", id);
  rmSync(filePathFor(id), { force: true });
}
