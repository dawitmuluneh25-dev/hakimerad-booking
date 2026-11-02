import {
  Crosshair,
  Droplets,
  Siren,
  type LucideIcon,
} from "lucide-react";

export type ProcedureSlug = "biopsy-fnac" | "abscess-drainage" | "intussusception";

export type ProcedureInfo = {
  slug: ProcedureSlug;
  code: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  urgent: boolean;
  summary: string;
  purpose: string;
  variants: string[];
  whoCanRefer: string[];
  infoNeeded: string[];
  review: string;
  afterSubmit: string[];
};

// General service descriptions only: no outcome, risk, or availability claims.
// Final wording must be approved by HakimeRAD clinicians.
export const PROCEDURES: ProcedureInfo[] = [
  {
    slug: "biopsy-fnac",
    code: "BX",
    name: "Image-Guided Biopsy / FNAC",
    shortName: "Biopsy / FNAC",
    icon: Crosshair,
    urgent: false,
    summary:
      "Ultrasound- or CT-guided tissue sampling, including fine needle aspiration cytology and core needle biopsy.",
    purpose:
      "Image guidance is used to direct a needle to a target area so that a tissue or cell sample can be obtained for laboratory examination. Fine needle aspiration cytology (FNAC) and core needle biopsy are different sampling methods; the interventional radiologist confirms which is appropriate after reviewing the referral.",
    variants: [
      "Ultrasound-guided FNAC",
      "Ultrasound-guided core needle biopsy",
      "CT-guided biopsy",
      "Other image-guided sampling, as configured",
    ],
    whoCanRefer: [
      "Referring physicians and specialists",
      "Hospitals and healthcare facilities",
      "Patients or guardians with a referral letter",
    ],
    infoNeeded: [
      "Patient identity and contact details (guardian details for minors)",
      "Referring doctor and institution",
      "Clinical indication and target area",
      "Relevant imaging reports (ultrasound, CT, MRI)",
      "Previous biopsy history, if any",
    ],
    review:
      "An interventional radiologist reviews the indication and imaging, confirms the target and sampling method, and may request further imaging or documents before approving, deferring or declining the request.",
    afterSubmit: [
      "You receive a request reference",
      "The team checks the request is complete",
      "A radiologist carries out a clinical review",
      "If approved, an appointment is scheduled and you are notified",
      "Preparation instructions are issued by the clinical team",
    ],
  },
  {
    slug: "abscess-drainage",
    code: "DR",
    name: "Image-Guided Abscess Drainage",
    shortName: "Abscess drainage",
    icon: Droplets,
    urgent: false,
    summary:
      "Image-guided aspiration of fluid collections and percutaneous drainage catheter placement.",
    purpose:
      "Image guidance is used to reach a fluid collection through the skin so it can be aspirated or drained, sometimes with a drainage catheter left in place. Whether drainage is appropriate is decided by the interventional radiologist together with the referring team.",
    variants: [
      "Image-guided abscess aspiration",
      "Percutaneous abscess drainage",
      "Drainage catheter placement",
      "Other drainage procedures, as configured",
    ],
    whoCanRefer: [
      "Referring physicians and surgical teams",
      "Hospitals and healthcare facilities",
      "Patients or guardians with a referral letter",
    ],
    infoNeeded: [
      "Patient identity and contact details (guardian details for minors)",
      "Referring doctor and institution",
      "Clinical indication and location of the collection",
      "Most recent imaging and its date",
      "Requested urgency",
    ],
    review:
      "An interventional radiologist evaluates the indication and imaging, sets the clinical priority, and determines the guidance method and resources needed. A request marked urgent is not automatically treated as an emergency.",
    afterSubmit: [
      "You receive a request reference",
      "The request is reviewed and given a clinical priority",
      "Rooms, equipment and staff are coordinated",
      "If approved, an appointment is scheduled and you are notified",
      "Follow-up is arranged by the clinical team where needed",
    ],
  },
  {
    slug: "intussusception",
    code: "IR",
    name: "Hydrostatic Intussusception Reduction",
    shortName: "Intussusception reduction",
    icon: Siren,
    urgent: true,
    summary:
      "An urgent, hospital-coordinated pediatric procedure. Not available as an online appointment.",
    purpose:
      "Hydrostatic reduction is performed in a hospital setting as part of urgent care coordinated between the treating team and radiology. This service is coordinated directly between clinicians and cannot be booked online by the public.",
    variants: ["Hospital-based urgent coordination only"],
    whoCanRefer: [
      "Emergency departments",
      "Pediatric and surgical teams",
      "Referring hospitals and radiology departments",
      "Other approved hospital clinicians",
    ],
    infoNeeded: [
      "Patient identity, age and guardian contact details",
      "Referring facility, clinician and direct hospital phone number",
      "Referral documentation and available imaging report",
    ],
    review:
      "Authorized hospital clinicians send an urgent coordination request. Designated radiology staff are alerted, acknowledgement is recorded, and the responsible clinical team makes every decision through direct communication.",
    afterSubmit: [
      "An urgent referral reference is generated",
      "Designated radiology staff are alerted immediately",
      "Clinicians coordinate directly by phone",
      "A procedure slot is arranged only after direct clinical agreement",
    ],
  },
];

export function getProcedure(slug: string): ProcedureInfo | undefined {
  return PROCEDURES.find((p) => p.slug === slug);
}

export const REFERRAL_STEPS = [
  {
    title: "Request submitted",
    body: "A patient, guardian or referring doctor sends a procedure request with supporting documents. This is not yet a confirmed appointment.",
  },
  {
    title: "Clinical review",
    body: "An interventional radiologist reviews the referral and imaging, and may ask for more information.",
  },
  {
    title: "Approved",
    body: "If the procedure is appropriate, it is clinically approved and the resources it needs are planned.",
  },
  {
    title: "Scheduled",
    body: "The booking team assigns a date and time and sends you preparation instructions from the clinical team.",
  },
  {
    title: "Completed",
    body: "The procedure takes place and any follow-up is coordinated with you and your referring doctor.",
  },
];

export const FAQS = [
  {
    q: "Is my request a confirmed appointment?",
    a: "No. Every request is reviewed by an interventional radiologist first. You will only receive an appointment once the procedure has been clinically approved and scheduled.",
  },
  {
    q: "Do I need a referral from a doctor?",
    a: "A referral letter and relevant imaging reports help the clinical team review your request. Patients and guardians can start a request, and the team will tell you if anything else is needed.",
  },
  {
    q: "Can I book a hydrostatic intussusception reduction online?",
    a: "No. This is an urgent hospital-based procedure. If you are worried about a child, go to the nearest emergency department immediately. Hospitals coordinate this procedure with us directly.",
  },
  {
    q: "Who will see my documents?",
    a: "Your documents are stored privately and are only available to the authorized HakimeRAD staff involved in your request.",
  },
  {
    q: "How will I receive preparation instructions?",
    a: "Preparation instructions are written for you by the clinical team after your procedure is approved. Please do not change any medication unless your doctor tells you to.",
  },
  {
    q: "Can I reschedule or cancel?",
    a: "Yes. Once you have an appointment, you can request a change from your account or by contacting the booking team.",
  },
];
