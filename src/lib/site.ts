import type { RoutePath } from "@/router.tsx";

type Site = {
  name: string;
  organization: string;
  tagline: string;
  nav: Array<{ label: string; to: RoutePath }>;
  contact: {
    phone: string;
    email: string;
    website: string;
    whatsapp: string;
    address: string;
    hours: string;
    emergencyPhone: string;
    emergencyNote: string;
  };
};

// Contact values taken from hakimerad.com (contact page + MedicalBusiness
// structured data). They are the published institutional enquiry details; the
// company does not publish a walk-in address. Administrators can override the
// same values in Admin -> Settings, which is what the server reads.
export const site: Site = {
  name: "HakimeRAD IR Booking",
  organization: "Hakimerad Medical Consultancy",
  tagline:
    "Referral, review and scheduling for image-guided interventional radiology procedures.",
  nav: [
    { label: "Procedures", to: "/procedures" },
    { label: "How referrals work", to: "/how-it-works" },
    { label: "For referring doctors", to: "/referrers" },
    { label: "Contact", to: "/contact" },
  ],
  contact: {
    phone: "+251 906 373154",
    email: "enquiry@hakimerad.com",
    website: "https://hakimerad.com",
    whatsapp: "https://wa.me/251906373154",
    address: "Remote reporting across Ethiopia — no walk-in address is published.",
    hours: "24/7 platform access, with after-hours and emergency cover.",
    emergencyPhone: "+251 906 373154",
    emergencyNote:
      "For any suspected emergency, go to the nearest emergency department or contact your treating hospital immediately.",
  },
};

export const INTUSSUSCEPTION_WARNING =
  "This procedure requires urgent hospital-based clinical assessment and coordination. It is not a routine outpatient appointment. Do not wait for an online booking response. Contact the referring hospital or emergency department immediately using the emergency contact information provided.";
