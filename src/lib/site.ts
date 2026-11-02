import type { RoutePath } from "@/router.tsx";

type Site = {
  name: string;
  organization: string;
  tagline: string;
  nav: Array<{ label: string; to: RoutePath }>;
  contact: {
    phone: string;
    email: string;
    address: string;
    hours: string;
    emergencyPhone: string;
    emergencyNote: string;
  };
};

// Contact values are placeholders until HakimeRAD confirms them; they will
// move to admin-editable settings in a later milestone.
export const PLACEHOLDER_MARK = "(to be confirmed)";

export const site: Site = {
  name: "HakimeRAD IR Booking",
  organization: "HakimeRAD Radiologic Consultancy",
  tagline:
    "Referral, review and scheduling for image-guided interventional radiology procedures.",
  nav: [
    { label: "Procedures", to: "/procedures" },
    { label: "How referrals work", to: "/how-it-works" },
    { label: "For referring doctors", to: "/referrers" },
    { label: "Contact", to: "/contact" },
  ],
  contact: {
    phone: `+000 000 000 000 ${PLACEHOLDER_MARK}`,
    email: `bookings@hakimerad.example ${PLACEHOLDER_MARK}`,
    address: `Clinic address ${PLACEHOLDER_MARK}`,
    hours: `Monday to Friday, hours ${PLACEHOLDER_MARK}`,
    emergencyPhone: `+000 000 000 000 ${PLACEHOLDER_MARK}`,
    emergencyNote:
      "For any suspected emergency, go to the nearest emergency department or contact your treating hospital immediately.",
  },
};

export const INTUSSUSCEPTION_WARNING =
  "This procedure requires urgent hospital-based clinical assessment and coordination. It is not a routine outpatient appointment. Do not wait for an online booking response. Contact the referring hospital or emergency department immediately using the emergency contact information provided.";
