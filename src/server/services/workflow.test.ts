import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../db.ts";
import { allRows, getRow, run } from "../db.ts";
import { as, createTestDb, signUp } from "../testing.ts";
import * as care from "./care.ts";
import * as reports from "./reports.ts";
import * as reviews from "./reviews.ts";
import * as referrals from "./referrals.ts";
import * as scheduling from "./scheduling.ts";
import * as urgent from "./urgent.ts";
import * as users from "./users.ts";
import { CHECKLIST_ITEMS } from "@/shared/workflow.ts";

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
  imaging: { modality: "ultrasound" as const },
  documents: [],
  confirmNotAppointment: true,
};

const FULL_CHECKLIST = Object.fromEntries(
  CHECKLIST_ITEMS.map((item) => [item, true]),
);

let db: Db;
let dispose: () => void;

function setRole(subject: string, role: string) {
  run(
    db,
    "UPDATE users SET role = ? WHERE token_identifier = ?",
    role,
    `test|${subject}`,
  );
}

function nextMonday(): string {
  const date = new Date();
  const delta = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function referralId(reference: string): string {
  const row = getRow<{ id: string }>(
    db,
    "SELECT id FROM referrals WHERE reference = ?",
    reference,
  );
  if (!row) throw new Error(`missing referral ${reference}`);
  return row.id;
}

function submit(patientSubject = "pat"): { reference: string; id: string } {
  const result = referrals.submit(as(db, patientSubject), BASE);
  return { reference: result.reference, id: referralId(result.reference) };
}

function approve(referral: string, reviewer = "radio"): void {
  reviews.review(as(db, reviewer), {
    referralId: referral,
    decision: "approve",
    priority: "routine",
    modality: "ultrasound",
    checklist: FULL_CHECKLIST,
  });
}

beforeEach(() => {
  const created = createTestDb();
  db = created.db;
  dispose = created.dispose;
  signUp(db, ["admin", "radio", "recep", "coord", "doc", "pat", "intruder"]);
  users.claimFirstAdmin(as(db, "admin"));
  setRole("radio", "radiologist");
  setRole("recep", "receptionist");
  setRole("coord", "coordinator");
  users.completeOnboarding(as(db, "pat"), {
    role: "patient",
    fullName: "Selam T",
    phone: "+251 911 000 000",
  });
  users.completeOnboarding(as(db, "intruder"), {
    role: "patient",
    fullName: "Other P",
    phone: "+251 911 000 001",
  });
  users.completeOnboarding(as(db, "doc"), {
    role: "physician",
    fullName: "Dr. Abebe Kebede",
    phone: "+251 911 234 567",
  });
});

afterEach(() => dispose());

describe("clinical review permissions", () => {
  it("blocks a receptionist from recording a clinical decision", () => {
    const { id } = submit();
    expect(() => approve(id, "recep")).toThrowError(/permission/i);
    expect(
      getRow<{ status: string }>(
        db,
        "SELECT status FROM referrals WHERE id = ?",
        id,
      )?.status,
    ).toBe("submitted");
  });

  it("requires the checklist and a priority before approval", () => {
    const { id } = submit();
    expect(() =>
      reviews.review(as(db, "radio"), {
        referralId: id,
        decision: "approve",
        checklist: {},
      }),
    ).toThrowError(/checklist/i);
  });

  it("approves with the full checklist and notifies the submitter", () => {
    const { id } = submit();
    approve(id);
    expect(
      getRow<{ status: string }>(
        db,
        "SELECT status FROM referrals WHERE id = ?",
        id,
      )?.status,
    ).toBe("approved");
    const notifications = allRows<{ kind: string }>(
      db,
      "SELECT kind FROM notifications WHERE kind = 'referral_approved'",
    );
    expect(notifications).toHaveLength(1);
  });

  it("cannot approve a request twice", () => {
    const { id } = submit();
    approve(id);
    expect(() => approve(id)).toThrowError(/cannot move/i);
  });
});

describe("information requests", () => {
  it("moves the request to info_requested, then back to review when the patient replies", () => {
    const { id, reference } = submit();
    reviews.review(as(db, "radio"), {
      referralId: id,
      decision: "request_info",
      checklist: {},
      note: "Please attach the previous ultrasound report.",
    });
    expect(
      getRow<{ status: string }>(
        db,
        "SELECT status FROM referrals WHERE id = ?",
        id,
      )?.status,
    ).toBe("info_requested");

    const visible = referrals.getByReference(as(db, "pat"), { reference });
    expect(visible?.notes).toHaveLength(1);

    reviews.respondToInfo(as(db, "pat"), {
      referralId: id,
      body: "Attached now.",
    });
    expect(
      getRow<{ status: string }>(
        db,
        "SELECT status FROM referrals WHERE id = ?",
        id,
      )?.status,
    ).toBe("in_review");
  });

  it("does not let another patient reply to an information request", () => {
    const { id } = submit();
    reviews.review(as(db, "radio"), {
      referralId: id,
      decision: "request_info",
      checklist: {},
      note: "Need the report.",
    });
    expect(() =>
      reviews.respondToInfo(as(db, "intruder"), {
        referralId: id,
        body: "hello",
      }),
    ).toThrowError(/not found/i);
  });
});

describe("scheduling", () => {
  it("books an approved request inside opening hours", () => {
    const { id } = submit();
    approve(id);
    const startsAt = `${nextMonday()}T09:00`;
    const { appointmentId } = scheduling.book(as(db, "recep"), {
      referralId: id,
      startsAt,
    });
    expect(appointmentId).toBeTruthy();
    expect(
      getRow<{ status: string }>(
        db,
        "SELECT status FROM referrals WHERE id = ?",
        id,
      )?.status,
    ).toBe("scheduled");
  });

  it("refuses to schedule a request that is not approved", () => {
    const { id } = submit();
    expect(() =>
      scheduling.book(as(db, "recep"), {
        referralId: id,
        startsAt: `${nextMonday()}T09:00`,
      }),
    ).toThrowError(/approved/i);
  });

  it("prevents double booking of the same room and time", () => {
    const first = submit();
    approve(first.id);
    const second = submit();
    approve(second.id);

    scheduling.saveResource(as(db, "admin"), {
      kind: "room",
      name: "IR Suite 1",
    });
    const room = getRow<{ id: string }>(
      db,
      "SELECT id FROM resources WHERE name = 'IR Suite 1'",
    );
    if (!room) throw new Error("missing room");

    const startsAt = `${nextMonday()}T10:00`;
    scheduling.book(as(db, "recep"), {
      referralId: first.id,
      startsAt,
      roomId: room.id,
    });
    expect(() =>
      scheduling.book(as(db, "recep"), {
        referralId: second.id,
        startsAt,
        roomId: room.id,
      }),
    ).toThrowError(/already taken/i);
  });

  it("refuses a booking that runs past closing time", () => {
    const { id } = submit();
    approve(id);
    expect(() =>
      scheduling.book(as(db, "recep"), {
        referralId: id,
        startsAt: `${nextMonday()}T16:45`,
      }),
    ).toThrowError(/closing time/i);
  });

  it("returns the request to approved when an appointment is cancelled", () => {
    const { id, reference } = submit();
    approve(id);
    const { appointmentId } = scheduling.book(as(db, "recep"), {
      referralId: id,
      startsAt: `${nextMonday()}T11:00`,
    });
    scheduling.cancel(as(db, "coord"), {
      appointmentId,
      reason: "Patient unwell",
    });
    expect(
      getRow<{ status: string }>(
        db,
        "SELECT status FROM referrals WHERE id = ?",
        id,
      )?.status,
    ).toBe("approved");
    expect(reference).toMatch(/^BX-/);
  });
});

describe("urgent intussusception coordination", () => {
  const CASE = {
    department: "emergency_department",
    facilityName: "St. Mary General Hospital",
    facilityPhone: "+251 911 555 000",
    clinicianName: "Dr. Hana Girma",
    clinicianPhone: "+251 911 555 001",
    patient: { fullName: "Child A", dateOfBirth: "2022-01-05" },
    clinical: {
      presentation: "Colicky pain",
      imagingAvailable: "yes" as const,
    },
    acknowledgeWarning: true,
  };

  it("blocks patients from creating an urgent case", () => {
    expect(() => urgent.create(as(db, "pat"), CASE)).toThrowError(
      /clinicians or HakimeRAD staff/i,
    );
  });

  it("blocks an unverified physician", () => {
    expect(() => urgent.create(as(db, "doc"), CASE)).toThrowError(/verified/i);
  });

  it("creates a case for staff, alerts the team and records acknowledgement and decision", () => {
    const { reference } = urgent.create(as(db, "recep"), CASE);
    expect(reference).toMatch(/^IR-/);

    const alerts = allRows<{ id: string }>(
      db,
      "SELECT id FROM notifications WHERE kind = 'urgent_case'",
    );
    expect(alerts.length).toBeGreaterThan(0);

    urgent.acknowledge(as(db, "coord"), { reference });
    expect(() =>
      urgent.decide(as(db, "recep"), {
        reference,
        decision: "accept",
        note: "no",
      }),
    ).toThrowError(/permission/i);

    expect(() =>
      urgent.scheduleSlot(as(db, "coord"), {
        reference,
        scheduledAt: `${nextMonday()}T12:00`,
      }),
    ).toThrowError(/accept/i);

    urgent.decide(as(db, "radio"), {
      reference,
      decision: "accept",
      note: "Agreed with ED consultant",
    });
    urgent.scheduleSlot(as(db, "coord"), {
      reference,
      scheduledAt: `${nextMonday()}T12:00`,
    });
    const detail = urgent.detail(as(db, "radio"), { reference });
    expect(detail?.status).toBe("scheduled");
    expect(detail?.events.length).toBeGreaterThanOrEqual(4);
    expect(
      allRows<{ id: string }>(
        db,
        "SELECT id FROM audit_logs WHERE entity_type = 'urgentCase'",
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe("preparation and procedure day", () => {
  it("only a radiologist issues instructions, and the patient can acknowledge them", () => {
    const { id } = submit();
    expect(() =>
      care.issuePreparation(as(db, "recep"), {
        referralId: id,
        instructions: "Arrive at 08:30.",
      }),
    ).toThrowError(/permission/i);

    care.issuePreparation(as(db, "radio"), {
      referralId: id,
      instructions: "Arrive at 08:30.",
    });
    care.acknowledgePreparation(as(db, "pat"), { referralId: id });
    const record = care.loadCareRecord(as(db, "radio"), id);
    expect(record.preparation?.state).toBe("acknowledged");

    care.setPreparationState(as(db, "coord"), {
      referralId: id,
      state: "completed",
    });
    expect(care.loadCareRecord(as(db, "radio"), id).preparation?.state).toBe(
      "completed",
    );
  });
});

describe("reports", () => {
  it("is admin only", () => {
    expect(() =>
      reports.metrics(as(db, "recep"), {
        from: "2026-01-01",
        to: "2026-12-31",
      }),
    ).toThrowError(/permission/i);
  });

  it("counts requests for the selected range", () => {
    submit();
    const today = new Date().toISOString().slice(0, 10);
    const metrics = reports.metrics(as(db, "admin"), {
      from: today,
      to: today,
    });
    expect(metrics.totals.requests).toBe(1);
    expect(metrics.byProcedure[0]?.procedure).toBe("biopsy-fnac");
  });
});
