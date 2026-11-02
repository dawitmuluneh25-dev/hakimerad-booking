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

async function setup() {
  const t = convexTest(schema, modules);
  const as = (subject: string) => {
    const user = t.withIdentity({ subject, tokenIdentifier: `test|${subject}`, email: `${subject}@example.com` });
    return user;
  };
  const admin = as("admin");
  const doc = as("doc");
  const pat = as("pat");
  for (const u of [admin, doc, pat]) await u.mutation(api.users.updateCurrentUser, {});
  return { t, admin, doc, pat };
}

describe("onboarding", () => {
  it("lets a user pick patient or physician once", async () => {
    const { pat } = await setup();
    await pat.mutation(api.users.completeOnboarding, { role: "patient", fullName: "Selam T", phone: "+251 911 000 000" });
    expect((await pat.query(api.users.me, {}))?.role).toBe("patient");
    await expect(
      pat.mutation(api.users.completeOnboarding, { role: "physician", fullName: "Selam T", phone: "+251 911 000 000" }),
    ).rejects.toThrow(/already set/);
  });

  it("rejects an invalid phone number", async () => {
    const { pat } = await setup();
    await expect(
      pat.mutation(api.users.completeOnboarding, { role: "patient", fullName: "Selam T", phone: "abc" }),
    ).rejects.toThrow(/phone/);
  });

  it("rejects anonymous callers", async () => {
    const { t } = await setup();
    await expect(
      t.mutation(api.users.completeOnboarding, { role: "patient", fullName: "X Y", phone: "+251 911 000 000" }),
    ).rejects.toThrow();
  });
});

describe("first admin", () => {
  it("only the first claim succeeds", async () => {
    const { admin, pat } = await setup();
    await admin.mutation(api.users.claimFirstAdmin, {});
    expect((await admin.query(api.users.me, {}))?.role).toBe("admin");
    await expect(pat.mutation(api.users.claimFirstAdmin, {})).rejects.toThrow(/already exists/);
  });
});

describe("physician verification", () => {
  it("requires the physician role to submit a profile", async () => {
    const { pat } = await setup();
    await pat.mutation(api.users.completeOnboarding, { role: "patient", fullName: "Selam T", phone: "+251 911 000 000" });
    await expect(pat.mutation(api.users.submitPhysicianProfile, PROFILE)).rejects.toThrow(/permission/);
  });

  it("only admins can verify, and resubmission resets to pending", async () => {
    const { admin, doc } = await setup();
    await admin.mutation(api.users.claimFirstAdmin, {});
    await doc.mutation(api.users.completeOnboarding, { role: "physician", fullName: PROFILE.fullName, phone: PROFILE.phone });
    await doc.mutation(api.users.submitPhysicianProfile, PROFILE);

    const profile = (await doc.query(api.users.me, {}))?.physicianProfile;
    expect(profile?.status).toBe("pending");
    if (!profile) throw new Error("missing profile");

    await expect(
      doc.mutation(api.admin.accounts.reviewPhysician, { profileId: profile._id, decision: "verified" }),
    ).rejects.toThrow(/permission/);

    await admin.mutation(api.admin.accounts.reviewPhysician, { profileId: profile._id, decision: "verified" });
    expect((await doc.query(api.users.me, {}))?.physicianProfile?.status).toBe("verified");

    await doc.mutation(api.users.submitPhysicianProfile, { ...PROFILE, specialty: "Surgery" });
    expect((await doc.query(api.users.me, {}))?.physicianProfile?.status).toBe("pending");
  });

  it("requires a reason when declining", async () => {
    const { admin, doc } = await setup();
    await admin.mutation(api.users.claimFirstAdmin, {});
    await doc.mutation(api.users.completeOnboarding, { role: "physician", fullName: PROFILE.fullName, phone: PROFILE.phone });
    await doc.mutation(api.users.submitPhysicianProfile, PROFILE);
    const profile = (await doc.query(api.users.me, {}))?.physicianProfile;
    if (!profile) throw new Error("missing profile");
    await expect(
      admin.mutation(api.admin.accounts.reviewPhysician, { profileId: profile._id, decision: "rejected" }),
    ).rejects.toThrow(/reason/);
  });

  it("hides the review queue from non-admins", async () => {
    const { doc } = await setup();
    const result = await doc.query(api.admin.accounts.listPhysicians, {
      status: "pending",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(result.page).toHaveLength(0);
  });
});

describe("role management", () => {
  it("only admins can assign roles and the last admin cannot be removed", async () => {
    const { admin, pat } = await setup();
    await admin.mutation(api.users.claimFirstAdmin, {});
    const adminId = (await admin.query(api.users.me, {}))?.id;
    const patId = (await pat.query(api.users.me, {}))?.id;
    if (!adminId || !patId) throw new Error("missing ids");

    await expect(
      pat.mutation(api.admin.accounts.setUserRole, { userId: patId, role: "admin" }),
    ).rejects.toThrow(/permission/);

    await expect(
      admin.mutation(api.admin.accounts.setUserRole, { userId: adminId, role: "patient" }),
    ).rejects.toThrow(/At least one administrator/);

    await admin.mutation(api.admin.accounts.setUserRole, { userId: patId, role: "radiologist" });
    expect((await pat.query(api.users.me, {}))?.role).toBe("radiologist");
  });
});
