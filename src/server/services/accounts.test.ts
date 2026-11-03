import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../db.ts";
import { as, createTestDb, signUp } from "../testing.ts";
import * as admin from "./admin.ts";
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

let db: Db;
let dispose: () => void;

function setup() {
  signUp(db, ["admin", "doc", "pat"]);
  return {
    admin: as(db, "admin"),
    doc: as(db, "doc"),
    pat: as(db, "pat"),
    anonymous: as(db, null),
  };
}

beforeEach(() => {
  ({ db, dispose } = createTestDb());
});

afterEach(() => dispose());

describe("onboarding", () => {
  it("lets a user pick patient or physician once", () => {
    const { pat } = setup();
    users.completeOnboarding(pat, { role: "patient", fullName: "Selam T", phone: "+251 911 000 000" });
    expect(users.me(pat)?.role).toBe("patient");
    expect(() =>
      users.completeOnboarding(pat, {
        role: "physician",
        fullName: "Selam T",
        phone: "+251 911 000 000",
      }),
    ).toThrow(/already set/);
  });

  it("rejects an invalid phone number", () => {
    const { pat } = setup();
    expect(() =>
      users.completeOnboarding(pat, { role: "patient", fullName: "Selam T", phone: "abc" }),
    ).toThrow(/phone/);
  });

  it("rejects anonymous callers", () => {
    const { anonymous } = setup();
    expect(() =>
      users.completeOnboarding(anonymous, {
        role: "patient",
        fullName: "X Y",
        phone: "+251 911 000 000",
      }),
    ).toThrow(/sign in/i);
  });
});

describe("first admin", () => {
  it("only the first claim succeeds", () => {
    const { admin: adminCtx, pat } = setup();
    users.claimFirstAdmin(adminCtx);
    expect(users.me(adminCtx)?.role).toBe("admin");
    expect(() => users.claimFirstAdmin(pat)).toThrow(/already exists/);
  });
});

describe("physician verification", () => {
  it("requires the physician role to submit a profile", () => {
    const { pat } = setup();
    users.completeOnboarding(pat, { role: "patient", fullName: "Selam T", phone: "+251 911 000 000" });
    expect(() => users.submitPhysicianProfile(pat, PROFILE)).toThrow(/permission/);
  });

  it("only admins can verify, and resubmission resets to pending", () => {
    const { admin: adminCtx, doc } = setup();
    users.claimFirstAdmin(adminCtx);
    users.completeOnboarding(doc, { role: "physician", fullName: PROFILE.fullName, phone: PROFILE.phone });
    users.submitPhysicianProfile(doc, PROFILE);

    const profile = users.me(doc)?.physicianProfile;
    expect(profile?.status).toBe("pending");
    if (!profile) throw new Error("missing profile");

    expect(() =>
      admin.reviewPhysician(doc, { profileId: profile._id, decision: "verified" }),
    ).toThrow(/permission/);

    admin.reviewPhysician(adminCtx, { profileId: profile._id, decision: "verified" });
    expect(users.me(doc)?.physicianProfile?.status).toBe("verified");

    users.submitPhysicianProfile(doc, { ...PROFILE, specialty: "Surgery" });
    expect(users.me(doc)?.physicianProfile?.status).toBe("pending");
  });

  it("requires a reason when declining", () => {
    const { admin: adminCtx, doc } = setup();
    users.claimFirstAdmin(adminCtx);
    users.completeOnboarding(doc, { role: "physician", fullName: PROFILE.fullName, phone: PROFILE.phone });
    users.submitPhysicianProfile(doc, PROFILE);
    const profile = users.me(doc)?.physicianProfile;
    if (!profile) throw new Error("missing profile");
    expect(() =>
      admin.reviewPhysician(adminCtx, { profileId: profile._id, decision: "rejected" }),
    ).toThrow(/reason/);
  });

  it("hides the review queue from non-admins", () => {
    const { doc } = setup();
    const result = admin.listPhysicians(doc, {
      status: "pending",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(result.page).toHaveLength(0);
  });
});

describe("role management", () => {
  it("only admins can assign roles and the last admin cannot be removed", () => {
    const { admin: adminCtx, pat } = setup();
    users.claimFirstAdmin(adminCtx);
    const adminId = users.me(adminCtx)?.id;
    const patId = users.me(pat)?.id;
    if (!adminId || !patId) throw new Error("missing ids");

    expect(() => admin.setUserRole(pat, { userId: patId, role: "admin" })).toThrow(/permission/);

    expect(() => admin.setUserRole(adminCtx, { userId: adminId, role: "patient" })).toThrow(
      /At least one administrator/,
    );

    admin.setUserRole(adminCtx, { userId: patId, role: "radiologist" });
    expect(users.me(pat)?.role).toBe("radiologist");
  });
});
