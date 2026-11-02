import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

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
  patient: { fullName: "Selam Tesfaye", dateOfBirth: "1985-04-12", sex: "female" as const, phone: "+251 911 000 000" },
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

async function setup() {
  const t = convexTest(schema, modules);
  const as = (subject: string) =>
    t.withIdentity({ subject, tokenIdentifier: `test|${subject}`, email: `${subject}@example.com` });
  const admin = as("admin");
  const doc = as("doc");
  const pat = as("pat");
  const other = as("other");
  for (const u of [admin, doc, pat, other]) await u.mutation(api.users.updateCurrentUser, {});
  await admin.mutation(api.users.claimFirstAdmin, {});
  await pat.mutation(api.users.completeOnboarding, { role: "patient", fullName: "Selam T", phone: "+251 911 000 000" });
  await other.mutation(api.users.completeOnboarding, { role: "patient", fullName: "Other P", phone: "+251 911 000 001" });
  await doc.mutation(api.users.completeOnboarding, { role: "physician", fullName: PROFILE.fullName, phone: PROFILE.phone });
  await doc.mutation(api.users.submitPhysicianProfile, PROFILE);
  return { t, admin, doc, pat, other };
}

async function verifyDoc(admin: Awaited<ReturnType<typeof setup>>["admin"], doc: Awaited<ReturnType<typeof setup>>["doc"]) {
  const profile = (await doc.query(api.users.me, {}))?.physicianProfile;
  if (!profile) throw new Error("missing profile");
  await admin.mutation(api.admin.accounts.reviewPhysician, { profileId: profile._id, decision: "verified" });
}

describe("referral submission", () => {
  it("creates a submitted request with a reference for a patient", async () => {
    const { pat } = await setup();
    const { reference } = await pat.mutation(api.referrals.submit, BASE);
    expect(reference).toMatch(/^BX-\d{6}-[2-9A-Z]{4}$/);
    const detail = await pat.query(api.referrals.getByReference, { reference });
    expect(detail?.status).toBe("submitted");
    expect(detail?.canEdit).toBe(true);
  });

  it("blocks physicians until verified, then uses their profile as referrer", async () => {
    const { admin, doc } = await setup();
    await expect(doc.mutation(api.referrals.submit, BASE)).rejects.toThrow(/verified/);
    await verifyDoc(admin, doc);
    const { reference } = await doc.mutation(api.referrals.submit, { ...BASE, referrer: undefined });
    const detail = await doc.query(api.referrals.getByReference, { reference });
    expect(detail?.referrer.name).toBe(PROFILE.fullName);
    expect(detail?.submitterRole).toBe("physician");
  });

  it("requires guardian details for a minor", async () => {
    const { pat } = await setup();
    const child = { ...BASE.patient, dateOfBirth: "2020-01-01" };
    await expect(pat.mutation(api.referrals.submit, { ...BASE, patient: child })).rejects.toThrow(/Guardian/);
    const guardian = { fullName: "Selam T", relationship: "Mother", phone: "+251 911 000 000" };
    await expect(pat.mutation(api.referrals.submit, { ...BASE, patient: child, guardian })).resolves.toBeTruthy();
  });

  it("requires the not-an-appointment confirmation and a valid method", async () => {
    const { pat } = await setup();
    await expect(pat.mutation(api.referrals.submit, { ...BASE, confirmNotAppointment: false })).rejects.toThrow(/not a confirmed appointment/);
    await expect(
      pat.mutation(api.referrals.submit, { ...BASE, clinical: { ...BASE.clinical, requestedMethod: "drain" } }),
    ).rejects.toThrow(/procedure type/);
  });

  it("rejects staff and anonymous submitters", async () => {
    const { t, admin } = await setup();
    await expect(admin.mutation(api.referrals.submit, BASE)).rejects.toThrow(/Only patients/);
    await expect(t.mutation(api.referrals.submit, BASE)).rejects.toThrow();
  });
});

describe("documents", () => {
  it("accepts allowed files and rejects other types or reuse", async () => {
    const { t, pat } = await setup();
    const pdf = await t.run((ctx) => ctx.storage.store(new Blob(["%PDF"], { type: "application/pdf" })));
    const exe = await t.run((ctx) => ctx.storage.store(new Blob(["MZ"], { type: "application/x-msdownload" })));
    await expect(
      pat.mutation(api.referrals.submit, { ...BASE, documents: [{ storageId: exe, fileName: "x.exe", kind: "other" }] }),
    ).rejects.toThrow(/Only PDF/);
    const docs = [{ storageId: pdf, fileName: "letter.pdf", kind: "referral_letter" as const }];
    const { reference } = await pat.mutation(api.referrals.submit, { ...BASE, documents: docs });
    const detail = await pat.query(api.referrals.getByReference, { reference });
    expect(detail?.documents).toHaveLength(1);
    await expect(pat.mutation(api.referrals.submit, { ...BASE, documents: docs })).rejects.toThrow(/already attached/);
  });
});

describe("privacy and tracking", () => {
  it("hides a request from other patients but shows it to staff", async () => {
    const { pat, other, admin } = await setup();
    const { reference } = await pat.mutation(api.referrals.submit, BASE);
    expect(await other.query(api.referrals.getByReference, { reference })).toBeNull();
    expect(await admin.query(api.referrals.getByReference, { reference })).not.toBeNull();
    const mine = await other.query(api.referrals.listMine, { paginationOpts: { numItems: 10, cursor: null } });
    expect(mine.page).toHaveLength(0);
  });

  it("lets only the submitter withdraw, once", async () => {
    const { pat, other } = await setup();
    const { reference } = await pat.mutation(api.referrals.submit, BASE);
    const detail = await pat.query(api.referrals.getByReference, { reference });
    if (!detail) throw new Error("missing");
    await expect(other.mutation(api.referrals.withdraw, { referralId: detail._id, reason: "No longer needed" })).rejects.toThrow(/not found/);
    await pat.mutation(api.referrals.withdraw, { referralId: detail._id, reason: "No longer needed" });
    expect((await pat.query(api.referrals.getByReference, { reference }))?.status).toBe("withdrawn");
    await expect(pat.mutation(api.referrals.withdraw, { referralId: detail._id, reason: "Again" })).rejects.toThrow(/no longer be changed/);
  });
});
