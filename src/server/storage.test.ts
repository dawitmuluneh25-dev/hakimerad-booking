import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./db.ts";
import { run } from "./db.ts";
import { canReadFile, getFileMeta, storeFile } from "./storage.ts";
import { as, createTestDb, signUp } from "./testing.ts";
import * as referrals from "./services/referrals.ts";
import * as users from "./services/users.ts";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

let db: Db;
let dispose: () => void;
let ownerFileId: string;
let orphanFileId: string;

function setRole(subject: string, role: string) {
  run(db, "UPDATE users SET role = ? WHERE token_identifier = ?", role, `test|${subject}`);
}

function userId(subject: string): string {
  const row = db.prepare("SELECT id FROM users WHERE token_identifier = ?").get(`test|${subject}`) as
    | { id: string }
    | undefined;
  if (!row) throw new Error(`missing user ${subject}`);
  return row.id;
}

beforeEach(() => {
  const created = createTestDb();
  db = created.db;
  dispose = created.dispose;
  signUp(db, ["pat", "other", "radio", "admin"]);
  users.claimFirstAdmin(as(db, "admin"));
  setRole("radio", "radiologist");
  users.completeOnboarding(as(db, "pat"), {
    role: "patient",
    fullName: "Selam T",
    phone: "+251 911 000 000",
  });
  users.completeOnboarding(as(db, "other"), {
    role: "patient",
    fullName: "Other P",
    phone: "+251 911 000 001",
  });

  ownerFileId = storeFile(db, {
    bytes: PDF,
    fileName: "referral.pdf",
    contentType: "application/pdf",
    uploadedById: userId("pat"),
  });
  orphanFileId = storeFile(db, {
    bytes: PDF,
    fileName: "xray.png",
    contentType: "image/png",
    uploadedById: userId("other"),
  });

  referrals.submit(as(db, "pat"), {
    procedure: "biopsy-fnac",
    forDependent: false,
    patient: {
      fullName: "Selam Tesfaye",
      dateOfBirth: "1985-04-12",
      sex: "female",
      phone: "+251 911 000 000",
    },
    referrer: { name: "Dr. Hana Girma", facility: "Bole Clinic" },
    clinical: {
      indication: "Thyroid nodule",
      site: "Right lobe",
      requestedMethod: "us_fnac",
      urgency: "routine",
      bloodThinners: "no",
    },
    imaging: { modality: "ultrasound" },
    documents: [{ storageId: ownerFileId, fileName: "referral.pdf", kind: "referral_letter" }],
    confirmNotAppointment: true,
  });
});

afterEach(() => dispose());

describe("private document access", () => {
  it("lets the uploader read the file", () => {
    expect(canReadFile(db, { id: userId("pat"), role: "patient" }, ownerFileId)).toBe(true);
  });

  it("refuses an unrelated patient", () => {
    expect(canReadFile(db, { id: userId("other"), role: "patient" }, ownerFileId)).toBe(false);
  });

  it("lets staff read any document", () => {
    expect(canReadFile(db, { id: userId("radio"), role: "radiologist" }, ownerFileId)).toBe(true);
    expect(canReadFile(db, { id: userId("admin"), role: "admin" }, orphanFileId)).toBe(true);
  });

  it("treats unknown files as absent", () => {
    expect(canReadFile(db, { id: userId("admin"), role: "admin" }, "does-not-exist")).toBe(false);
  });
});

describe("attaching uploads", () => {
  it("stores the metadata the download route needs", () => {
    const meta = getFileMeta(db, ownerFileId);
    expect(meta?.contentType).toBe("application/pdf");
    expect(meta?.size).toBe(PDF.byteLength);
  });

  it("refuses to attach another account's upload", () => {
    expect(() =>
      referrals.submit(as(db, "pat"), {
        procedure: "biopsy-fnac",
        forDependent: false,
        patient: {
          fullName: "Selam Tesfaye",
          dateOfBirth: "1985-04-12",
          sex: "female",
          phone: "+251 911 000 000",
        },
        referrer: { name: "Dr. Hana Girma", facility: "Bole Clinic" },
        clinical: {
          indication: "Thyroid nodule",
          site: "Right lobe",
          requestedMethod: "us_fnac",
          urgency: "routine",
          bloodThinners: "no",
        },
        imaging: { modality: "ultrasound" },
        documents: [{ storageId: orphanFileId, fileName: "xray.png", kind: "imaging_report" }],
        confirmNotAppointment: true,
      }),
    ).toThrowError(/could not be found/i);
  });
});
