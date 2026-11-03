import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../db.ts";
import { storeFile } from "../storage.ts";
import { as, createTestDb, signUp } from "../testing.ts";
import * as admin from "./admin.ts";
import * as referrals from "./referrals.ts";
import * as users from "./users.ts";

const PROFILE = {
  fullName: "Dr. Abebe Kebede",
  registrationNumber: "MD-012345",
  licensingBody: "Ministry of Health",
  specialty: "Internal medicine",
  facilityName: "St. Mary General Hospital",
  facilityAddress: "Main Street, Addis Ababa",
  phone: "+251 911 234 567",
};

const BASE = {
  procedure: "biopsy-fnac" as const,
  forDependent: false,
  patient: {
    fullName: "Selam Tesfaye",
    dateOfBirth: "1985-04-12",
    sex: "female" as const,
    phone: "+251 911 000 000",
  },
  referrer: { name: "Dr. Hana Girma", facility: "Bole Clinic" },
  clinical: {
    indication: "Thyroid nodule, TIRADS 4",
    site: "Right thyroid lobe",
    requestedMethod: "us_fnac",
    urgency: "routine" as const,
    bloodThinners: "no" as const,
  },
  imaging: { modality: "ultrasound" as const, pacsReference: "ACC-55512" },
  documents: [],
  confirmNotAppointment: true,
};

let db: Db;
let dispose: () => void;

function setup() {
  signUp(db, ["admin", "doc", "pat", "other"]);
  const ctx = {
    admin: as(db, "admin"),
    doc: as(db, "doc"),
    pat: as(db, "pat"),
    other: as(db, "other"),
    anonymous: as(db, null),
  };
  users.claimFirstAdmin(ctx.admin);
  users.completeOnboarding(ctx.pat, { role: "patient", fullName: "Selam T", phone: "+251 911 000 000" });
  users.completeOnboarding(ctx.other, { role: "patient", fullName: "Other P", phone: "+251 911 000 001" });
  users.completeOnboarding(ctx.doc, {
    role: "physician",
    fullName: PROFILE.fullName,
    phone: PROFILE.phone,
  });
  users.submitPhysicianProfile(ctx.doc, PROFILE);
  return ctx;
}

function verifyDoc(ctx: ReturnType<typeof setup>) {
  const profile = users.me(ctx.doc)?.physicianProfile;
  if (!profile) throw new Error("missing profile");
  admin.reviewPhysician(ctx.admin, { profileId: profile._id, decision: "verified" });
}

beforeEach(() => {
  ({ db, dispose } = createTestDb());
});

afterEach(() => dispose());

describe("referral submission", () => {
  it("creates a submitted request with a reference for a patient", () => {
    const { pat } = setup();
    const { reference } = referrals.submit(pat, BASE);
    expect(reference).toMatch(/^BX-\d{6}-[2-9A-Z]{4}$/);
    const detail = referrals.getByReference(pat, { reference });
    expect(detail?.status).toBe("submitted");
    expect(detail?.canEdit).toBe(true);
  });

  it("blocks physicians until verified, then uses their profile as referrer", () => {
    const ctx = setup();
    expect(() => referrals.submit(ctx.doc, BASE)).toThrow(/verified/);
    verifyDoc(ctx);
    const { reference } = referrals.submit(ctx.doc, { ...BASE, referrer: undefined });
    const detail = referrals.getByReference(ctx.doc, { reference });
    expect(detail?.referrer.name).toBe(PROFILE.fullName);
    expect(detail?.submitterRole).toBe("physician");
  });

  it("requires guardian details for a minor", () => {
    const { pat } = setup();
    const child = { ...BASE.patient, dateOfBirth: "2020-01-01" };
    expect(() => referrals.submit(pat, { ...BASE, patient: child })).toThrow(/Guardian/);
    const guardian = { fullName: "Selam T", relationship: "Mother", phone: "+251 911 000 000" };
    expect(referrals.submit(pat, { ...BASE, patient: child, guardian })).toBeTruthy();
  });

  it("requires the not-an-appointment confirmation and a valid method", () => {
    const { pat } = setup();
    expect(() =>
      referrals.submit(pat, { ...BASE, confirmNotAppointment: false }),
    ).toThrow(/not a confirmed appointment/);
    expect(() =>
      referrals.submit(pat, { ...BASE, clinical: { ...BASE.clinical, requestedMethod: "drain" } }),
    ).toThrow(/procedure type/);
  });

  it("rejects staff and anonymous submitters", () => {
    const { admin: adminCtx, anonymous } = setup();
    expect(() => referrals.submit(adminCtx, BASE)).toThrow(/Only patients/);
    expect(() => referrals.submit(anonymous, BASE)).toThrow();
  });
});

describe("documents", () => {
  it("accepts allowed files and rejects other types or reuse", () => {
    const { pat } = setup();
    const pdf = storeFile(db, {
      bytes: new TextEncoder().encode("%PDF"),
      fileName: "letter.pdf",
      contentType: "application/pdf",
    });
    const exe = storeFile(db, {
      bytes: new TextEncoder().encode("MZ"),
      fileName: "x.exe",
      contentType: "application/x-msdownload",
    });
    expect(() =>
      referrals.submit(pat, {
        ...BASE,
        documents: [{ storageId: exe, fileName: "x.exe", kind: "other" }],
      }),
    ).toThrow(/Only PDF/);

    const docs = [{ storageId: pdf, fileName: "letter.pdf", kind: "referral_letter" as const }];
    const { reference } = referrals.submit(pat, { ...BASE, documents: docs });
    const detail = referrals.getByReference(pat, { reference });
    expect(detail?.documents).toHaveLength(1);
    expect(() => referrals.submit(pat, { ...BASE, documents: docs })).toThrow(/already attached/);
  });
});

describe("privacy and tracking", () => {
  it("hides a request from other patients but shows it to staff", () => {
    const { pat, other, admin: adminCtx } = setup();
    const { reference } = referrals.submit(pat, BASE);
    expect(referrals.getByReference(other, { reference })).toBeNull();
    expect(referrals.getByReference(adminCtx, { reference })).not.toBeNull();
    const mine = referrals.listMine(other, { numItems: 10, cursor: null });
    expect(mine.page).toHaveLength(0);
  });

  it("lets only the submitter withdraw, once", () => {
    const { pat, other } = setup();
    const { reference } = referrals.submit(pat, BASE);
    const detail = referrals.getByReference(pat, { reference });
    if (!detail) throw new Error("missing");
    expect(() =>
      referrals.withdraw(other, { referralId: detail._id, reason: "No longer needed" }),
    ).toThrow(/not found/);
    referrals.withdraw(pat, { referralId: detail._id, reason: "No longer needed" });
    expect(referrals.getByReference(pat, { reference })?.status).toBe("withdrawn");
    expect(() =>
      referrals.withdraw(pat, { referralId: detail._id, reason: "Again" }),
    ).toThrow(/no longer be changed/);
  });
});
