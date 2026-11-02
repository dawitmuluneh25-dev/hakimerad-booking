# MASTER AGENTIC DEVELOPMENT PROMPT
# HAKIMERAD INTERVENTIONAL RADIOLOGY PROCEDURE BOOKING & MANAGEMENT PWA

## 1. PROJECT IDENTITY AND MISSION

You are an autonomous senior healthcare software engineering team comprising:

- Senior product architect.
- Interventional radiology workflow analyst.
- Senior full-stack engineer.
- Healthcare UI/UX designer.
- Database architect.
- Healthcare cybersecurity engineer.
- QA and automation engineer.
- DevOps and deployment engineer.

Your assignment is to build a complete, modern, secure, responsive, installable Progressive Web Application (PWA) for:

**HakimeRAD Radiologic Consultancy**

The system will specialize in the referral, booking, scheduling, coordination, and administrative management of minimally invasive image-guided interventional radiology procedures.

This is a dedicated interventional radiology booking system, not a general-purpose hospital management system and not a conventional diagnostic radiology appointment application.

### Primary procedures supported

The initial application must focus on three specific interventional radiology services:

**1. Image-Guided Biopsy / Fine Needle Aspiration Cytology (FNAC)**

Support procedure requests involving:

- Ultrasound-guided biopsy.
- CT-guided biopsy.
- Ultrasound-guided FNAC.
- Other configurable image-guided sampling procedures.

Distinguish FNAC from core needle biopsy because they involve different sampling requirements.

**2. Image-Guided Abscess Drainage**

Support requests for:

- Percutaneous abscess drainage.
- Image-guided aspiration of fluid collections.
- Image-guided drainage catheter placement.
- Other configurable percutaneous drainage procedures.

**3. Hydrostatic Intussusception Reduction**

Support a dedicated hospital-based workflow for coordinating hydrostatic reduction procedures.

This workflow must prioritize urgent clinical referral and direct coordination between the referring team, radiology, and other relevant hospital teams.

It must not be presented as an ordinary elective outpatient booking service.

### Overall objective

Deliver a platform where patients, parents or guardians, and referring healthcare professionals can initiate procedure requests, submit relevant documentation, and coordinate with HakimeRAD.

The interventional radiology team must be able to review the requests, assess their suitability, approve the procedure, coordinate required resources, and assign an appropriate appointment.

The system must manage the entire booking lifecycle, from initial request to procedure completion.

Build the actual application. Do not stop at architectural descriptions, static mockups, or a frontend prototype.

---

# 2. CORE BUSINESS WORKFLOW

The fundamental operating model must be:

**Referral / Procedure Request → Clinical Review → Procedure Approval → Scheduling → Patient Preparation → Procedure Attendance → Completion → Follow-up Coordination**

The central principle is:

**A submitted procedure request is not automatically a confirmed procedure.**

The interventional radiologist or appropriately authorized clinical team must review and approve the request before a definitive appointment is confirmed.

Design the software around this principle.

### Booking types

Support three request sources:

1. Patient or caregiver request.
2. Referring physician request.
3. Internal hospital or healthcare facility referral.

Allow the administrator to control which request sources are enabled.

### Booking modes

Support:

- Routine elective booking.
- Expedited clinical review.
- Urgent hospital coordination.
- Direct staff-entered booking.
- Emergency referral coordination.

The clinical team, not an automated algorithm, determines the clinical priority and appropriateness of the requested intervention.

---

# 3. USER ROLES AND ACCESS CONTROL

Implement secure, role-based access control.

## 3.1 Public visitors

Visitors should be able to:

- Access the HakimeRAD homepage.
- Learn about the consultancy.
- Explore the three interventional services.
- Read procedure descriptions.
- Understand the referral and booking process.
- View contact information.
- Submit an eligible procedure request.
- Access emergency contact information.
- Register or sign in.
- Access privacy and booking policies.

Public visitors must not be able to access private patient requests.

## 3.2 Patients / Parents / Guardians

Provide patient and caregiver accounts.

Capabilities:

- Create an account.
- Submit a procedure request.
- Provide patient details.
- Upload referral documents.
- Upload relevant investigation reports.
- Track request status.
- View approved appointment details.
- Receive notifications.
- Request rescheduling.
- Request cancellation.
- View booking history.

For pediatric patients, support parent or guardian registration and an explicit relationship to the patient.

Never assume the person submitting a request is the patient.

## 3.3 Referring physicians

Provide a dedicated healthcare professional referral portal.

Authorized physicians should be able to:

- Register and manage a professional profile.
- Submit procedure referrals.
- Identify the patient.
- Specify the requested procedure.
- Provide relevant clinical information.
- Upload referral letters.
- Attach relevant radiology reports and investigation documents.
- Indicate the requested urgency.
- Identify the referring institution.
- Provide direct contact information.
- Track submitted referrals.
- Respond to requests for additional information.
- View confirmed appointment details.
- Review the referral history.

Require professional verification before granting elevated referral privileges.

## 3.4 Receptionist / Booking Officer

Responsibilities:

- Review incoming requests for administrative completeness.
- Register walk-in referrals.
- Verify patient contact information.
- Contact patients and referring facilities.
- Coordinate administrative appointments.
- Schedule approved procedures.
- Reschedule appointments.
- Record cancellations.
- Check patients in.
- Track arrival and attendance.
- Send notifications.
- View the daily schedule.

Receptionists must not independently approve clinical suitability.

## 3.5 Interventional Radiologist

Provide a dedicated clinical dashboard.

Capabilities:

- View incoming procedure referrals.
- Review relevant clinical information.
- Review submitted imaging reports and documents.
- Request additional information.
- Approve or decline a procedure request.
- Recommend a different procedure pathway.
- Assign clinical priority.
- Specify the appropriate procedure modality.
- Set required procedural resources.
- Approve scheduling.
- Review the assigned procedure list.
- Record procedural workflow status.
- Document operational outcomes.
- Arrange follow-up requirements.

Clinical decisions must be made by authorized practitioners.

## 3.6 Radiology Team / Procedure Coordinator

Provide appropriate operational access for radiographers, nurses, and procedure coordinators.

They should be able to:

- View assigned schedules.
- Review relevant procedural requirements.
- Confirm room and equipment readiness.
- Track patient arrival.
- Complete authorized preparation checklists.
- Update procedure progress.
- Record operational information.

Restrict clinical decision-making and sensitive records according to role permissions.

## 3.7 System Administrator

Administrators should manage:

- Users.
- Roles and permissions.
- Referring facilities.
- Physicians.
- Staff.
- Procedures.
- Availability.
- Procedure rooms.
- Equipment.
- Booking rules.
- Business settings.
- Notification settings.
- Reports.
- Audit logs.
- PWA settings.

All permissions must be enforced by the backend.

---

# 4. PROCEDURE-SPECIFIC REQUEST MODULES

This is the most important functional part of the application.

Each procedure must have a dedicated booking interface, dedicated data model where appropriate, and its own configurable workflow.

Do not use one generic appointment form for all three procedures.

## 4.1 IMAGE-GUIDED BIOPSY / FNAC MODULE

Create a specialized request form.

### A. Procedure selection

Allow the requester to select:

- Ultrasound-guided FNAC.
- Ultrasound-guided core needle biopsy.
- CT-guided biopsy.
- Other image-guided biopsy, as configured.

### B. Patient information

Collect:

- Patient full name.
- Date of birth or age, according to operational requirements.
- Sex, only where relevant.
- Phone number.
- Email, if available.
- Patient or caregiver contact.
- Guardian details for minors.

### C. Clinical referral information

Provide fields for:

- Referring physician.
- Referring institution.
- Clinical indication.
- Target organ or anatomical region.
- Target lesion description.
- Requested sampling method.
- Relevant imaging findings.
- Previous biopsy history, where applicable.
- Other information supplied by the referring physician.

### D. Imaging and documentation

Allow secure submission of:

- Referral letter.
- Ultrasound report.
- CT report.
- MRI report.
- Previous relevant radiology reports.
- Other relevant documents.

Support private file storage and controlled access.

Where available, allow recording an external PACS identifier or secure imaging reference.

Do not expose patient documents through public URLs.

### E. Procedure review

The clinical reviewer should be able to:

- Review the submitted indication.
- Assess imaging availability and quality.
- Confirm the proposed target.
- Determine the appropriate sampling method.
- Request additional imaging or documentation.
- Specify additional clinical assessment requirements.
- Approve, defer, or decline the request.

### F. Scheduling

After clinical approval, allow scheduling based on:

- Interventional radiologist availability.
- Ultrasound or CT availability.
- Procedure-room availability.
- Required equipment.
- Nursing availability.
- Patient-specific procedure duration.
- Resource buffers.

Include configurable time estimates.

Do not hardcode universal procedure durations.

### G. Specimen workflow

Where applicable, provide operational fields for:

- Specimen collection type.
- Specimen identifier.
- Number of specimens or containers.
- Destination laboratory.
- Pathology or cytology dispatch status.
- Date and time of dispatch.
- Responsible staff member.

This is specimen logistics, not a substitute for a laboratory information system or diagnostic reporting system.

---

## 4.2 IMAGE-GUIDED ABSCESS DRAINAGE MODULE

Create a dedicated abscess drainage request form.

### A. Request classification

Support:

- Image-guided abscess aspiration.
- Percutaneous abscess drainage.
- Drainage catheter placement.
- Other configured drainage-related procedures.

### B. Patient information

Collect necessary identity and contact information.

For minors, provide parent or guardian information.

### C. Referral information

Include:

- Referring physician.
- Referring institution.
- Clinical indication.
- Suspected or documented collection location.
- Anatomical site.
- Available imaging modality.
- Date of most recent imaging.
- Relevant imaging report.
- Relevant clinical information supplied by the referring team.
- Requested urgency.

The requesting clinician should be able to upload relevant imaging reports and other supporting documentation.

### D. Clinical review

The interventional radiologist must be able to evaluate:

- The submitted indication.
- Imaging availability.
- Collection characteristics as described in the clinical documentation.
- Proposed image-guidance method.
- Appropriate procedural resources.
- Whether additional clinical evaluation is necessary.
- Whether the proposed intervention is appropriate.

The system must not independently decide whether a collection is suitable for drainage.

### E. Scheduling and coordination

Support:

- Priority review.
- Assigned interventional radiologist.
- Required imaging modality.
- Procedure room.
- Required drainage equipment.
- Nursing support.
- Anesthesia or sedation support where clinically determined.
- Inpatient or outpatient coordination, where supported.
- Configurable post-procedure observation arrangements.

Allow the clinical team to indicate whether the procedure needs expedited coordination.

Do not automatically convert a request marked urgent by a patient into an approved emergency procedure.

### F. Drainage follow-up coordination

Support operational follow-up records:

- Procedure completion.
- Drain insertion status.
- Drain documentation status.
- Assigned follow-up clinician.
- Follow-up appointment date.
- Follow-up imaging requirement.
- Drain management review status.

Do not automatically provide catheter-removal recommendations or patient-specific treatment instructions.

---

## 4.3 HYDROSTATIC INTUSSUSCEPTION REDUCTION MODULE

Create a separate, clearly identifiable workflow.

This service is different from elective biopsy and drainage booking.

It must be designed for urgent coordination within a hospital-based clinical workflow.

### Critical safety requirement

**Do not offer hydrostatic intussusception reduction as an ordinary self-service appointment with publicly selectable dates and time slots.**

When the procedure is selected on the public website, display a prominent message:

"This procedure requires urgent hospital-based clinical assessment and coordination. It is not a routine outpatient appointment. Do not wait for an online booking response. Contact the referring hospital or emergency department immediately using the emergency contact information provided."

The application must not diagnose intussusception, decide whether hydrostatic reduction is appropriate, or delay emergency assessment.

### A. Authorized request sources

Accept requests from:

- Emergency department.
- Pediatric department.
- Referring hospital.
- Authorized pediatrician.
- General surgeon.
- Pediatric surgeon.
- Radiology department.
- Other approved hospital clinicians.

Public visitors may view service information and emergency contact instructions, but must not place an ordinary elective appointment for this service.

### B. Pediatric patient support

Support pediatric patients and guardians.

Collect:

- Patient identity.
- Age or date of birth.
- Guardian name.
- Guardian contact details.
- Referring facility.
- Referring clinician.
- Hospital contact number.
- Referral documentation.
- Available imaging report.
- Clinically relevant documentation submitted by the treating team.

### C. Urgent referral coordination

Allow the referring hospital or authorized professional to initiate an urgent coordination request.

The system should:

1. Generate an urgent referral reference.
2. Notify designated authorized radiology personnel.
3. Notify the appropriate coordinator.
4. Display the referring facility's contact information.
5. Record the communication and acknowledgement status.
6. Allow direct communication among authorized clinical personnel.
7. Record the decision made by the responsible clinical team.
8. Allow authorized staff to arrange a procedure slot only after direct clinical coordination.
9. Record the final scheduling decision.
10. Maintain a time-stamped audit trail.

A notification must not be treated as proof that the referral has been clinically accepted.

### D. Coordination requirements

Allow authorized staff to record:

- Referring emergency department.
- Responsible treating team.
- Radiology team acknowledgement.
- Required fluoroscopy or procedural resources.
- Procedure-room availability.
- Relevant surgical-team coordination.
- Required supporting personnel.
- Planned coordination time.
- Clinical approval.
- Final scheduling status.

Exact clinical eligibility and procedural decisions must remain with the relevant healthcare professionals.

### E. Emergency fallback

If the referral cannot be acknowledged through the application, the referring institution must be directed to the configured direct emergency communication channel.

The software must never become the only channel for emergency coordination.

---

# 5. REFINED BOOKING AND REFERRAL LIFECYCLE

Implement a procedure-specific request and appointment state machine.

Suggested states:

1. Submitted.
2. Received.
3. Under administrative review.
4. Under clinical review.
5. Awaiting additional information.
6. Awaiting imaging or documentation.
7. Clinically approved.
8. Approved for scheduling.
9. Scheduled.
10. Patient notified.
11. Patient arrived.
12. Pre-procedure verification.
13. Ready for procedure.
14. In progress.
15. Completed.
16. Post-procedure observation.
17. Follow-up required.
18. Cancelled.
19. Deferred.
20. Declined.
21. Referred to another care pathway.

Not every state applies to every procedure.

Configure state transitions according to procedure type.

Maintain a complete history of all changes, including:

- Previous status.
- New status.
- Date and time.
- Responsible user.
- Reason.
- Relevant notes.

Implement backend validation to prevent unauthorized state changes.

### Important distinction

A submitted request, a clinically approved procedure, a scheduled procedure, and a completed procedure are four different things.

The user interface and all notifications must preserve this distinction.

---

# 6. PROCEDURE SCHEDULING ENGINE

Build an advanced backend scheduling system.

Scheduling must be based on actual clinical and operational resource availability.

### Scheduling resources

Consider:

- Interventional radiologist.
- Radiographer.
- Nursing personnel.
- Ultrasound equipment.
- CT equipment.
- Fluoroscopy equipment.
- Procedure room.
- Required instruments.
- Sedation or anesthesia resources when applicable.
- Supporting departments.
- Recovery or observation capacity when required.

Resources must be configurable.

### Scheduling features

- Individual staff calendars.
- Procedure-specific durations.
- Room availability.
- Equipment availability.
- Working hours.
- Breaks.
- Holidays.
- Staff leave.
- Temporary closures.
- Booking buffers.
- Priority scheduling.
- Rescheduling.
- Cancellation.
- Schedule conflict detection.
- Daily schedule.
- Weekly calendar.
- Monthly calendar.

### Booking rules

A procedure must not be scheduled unless:

1. The request has received the required clinical approval.
2. Required resources are available.
3. The selected schedule falls within configured operational rules.
4. Relevant administrative conditions are satisfied.
5. The appointment does not conflict with another resource reservation.

### Concurrency protection

Prevent double booking through database transactions and appropriate locking or database constraints.

Do not rely on frontend availability checks alone.

Hydrostatic intussusception reduction must use its dedicated urgent coordination pathway, not the standard elective booking calendar.

---

# 7. CLINICAL REVIEW AND PRE-PROCEDURE MANAGEMENT

Implement a configurable, clinician-controlled pre-procedure management module.

This module must not attempt to replace clinical assessment or issue autonomous medical instructions.

### Clinical review checklist

Provide procedure-specific checklist templates with editable fields for:

- Clinical indication reviewed.
- Referral reviewed.
- Imaging reviewed.
- Patient identity verified.
- Additional investigations reviewed, if required.
- Relevant medication history reviewed.
- Anticoagulant or antiplatelet therapy reviewed by the clinical team where relevant.
- Relevant allergies reviewed.
- Contrast-related assessment completed when applicable.
- Anesthesia or sedation requirements assessed.
- Procedure-specific requirements documented.
- Informed consent status documented.
- Procedural resources confirmed.

### Pre-procedure instructions

Allow authorized clinicians to issue patient-specific preparation instructions.

Examples of configurable instruction categories:

- Appointment arrival time.
- Fasting instructions, if required.
- Medication instructions, if clinically determined.
- Required documents.
- Required investigations.
- Accompaniment requirements.
- Admission arrangements.
- Contact information.

**Never hardcode fasting durations, anticoagulant interruption instructions, medication changes, laboratory thresholds, or other clinical preparation rules.**

These must be defined or approved by qualified clinicians according to the particular procedure, patient, and applicable local protocols.

The system should distinguish between:

- Instructions not yet issued.
- Instructions issued.
- Instructions acknowledged.
- Preparation requirements completed.
- Preparation requirements requiring further review.

Electronic acceptance of a booking policy must not be treated as informed procedural consent.

Actual consent documentation must follow the clinic's approved clinical workflow.

---

# 8. PATIENT AND REFERRAL PORTAL

Create a clean, simple patient-facing interface.

### Patient dashboard

Include:

- Welcome section.
- New procedure request.
- Active requests.
- Requests awaiting review.
- Approved procedures.
- Upcoming procedures.
- Completed procedures.
- Cancelled requests.
- Notifications.

### Request tracking

Display a simple status tracker.

For example:

Request submitted → Clinical review → Approved → Scheduled → Completed.

Explain each status in understandable language.

Do not disclose internal clinical discussions, staff-only notes, or restricted information.

### Patient appointment details

Show:

- Booking reference.
- Procedure name.
- Appointment date.
- Arrival time.
- Approved location.
- Assigned department or team, where appropriate.
- Patient-specific preparation instructions.
- Contact information.
- Relevant administrative requirements.

### Referring physician dashboard

Include:

- New referral.
- Submitted referrals.
- Pending reviews.
- Requests requiring additional information.
- Approved referrals.
- Scheduled procedures.
- Completed procedures.
- Referral history.

Allow secure communication with authorized HakimeRAD personnel.

---

# 9. ADMINISTRATIVE DASHBOARD

Build a sophisticated but user-friendly dashboard.

### Overview metrics

Display real data:

- Total procedure requests.
- New referrals.
- Requests awaiting clinical review.
- Procedures approved.
- Procedures awaiting scheduling.
- Scheduled procedures.
- Procedures completed.
- Cancelled procedures.
- Upcoming procedures.

Break down data by:

- Biopsy/FNAC.
- Abscess drainage.
- Hydrostatic intussusception reduction.

Provide date filters and operational summary cards.

### Procedure management

Create procedure-specific management sections.

**Biopsy/FNAC management**
- Incoming requests.
- Sampling method.
- Target anatomy.
- Referral institution.
- Clinical approval.
- Scheduling.
- Specimen dispatch tracking.

**Abscess drainage management**
- Incoming requests.
- Collection location.
- Referral institution.
- Clinical priority.
- Resource coordination.
- Scheduling.
- Follow-up coordination.

**Intussusception coordination**
- Urgent referrals.
- Referral acknowledgement.
- Hospital communication.
- Radiology coordination.
- Required resources.
- Procedure scheduling.
- Status and event history.

### Calendar dashboard

Provide:

- Daily procedure list.
- Weekly calendar.
- Monthly calendar.
- Staff-specific schedules.
- Resource-specific schedules.

Use visually distinguishable labels for:

- Biopsy/FNAC.
- Abscess drainage.
- Urgent intussusception coordination.

### Staff management

Manage:

- Interventional radiologists.
- Radiographers.
- Nurses.
- Receptionists.
- Coordinators.
- Administrators.

Support staff availability and procedure assignments.

### Referral institution management

Maintain a directory containing:

- Institution name.
- Institution type.
- Address.
- Contact information.
- Referring clinicians.
- Referral history.
- Account status.

---

# 10. NOTIFICATION AND COMMUNICATION SYSTEM

Implement a reliable notification architecture.

### Trigger events

Send notifications for:

- Referral submitted.
- Referral received.
- Additional information requested.
- Clinical approval granted.
- Procedure declined.
- Appointment scheduled.
- Appointment rescheduled.
- Appointment cancelled.
- Preparation instructions issued.
- Appointment reminder.
- Procedure completed.
- Follow-up requested.

### Notification channels

Support configurable:

- Email.
- SMS.
- WhatsApp Business API.
- In-app notifications.

Use provider adapters rather than hardcoding a messaging service.

### Notification requirements

- Notifications must contain a unique request or booking reference.
- Messages must not expose excessive sensitive clinical information.
- Staff must be able to resend failed notifications.
- Delivery attempts must be logged.
- Notifications must support retries.
- Failed external messaging must not cancel a valid booking.

For urgent intussusception referrals, provide immediate staff alerts and a direct communication fallback. Do not rely exclusively on email or background messaging.

---

# 11. DESIGN AND BRANDING

Design the application as a professional interventional radiology service platform.

### Brand identity

Organization: HakimeRAD Radiologic Consultancy.

Product: HakimeRAD IR Booking.

Design characteristics:

- Modern medical technology.
- Professional.
- Clean.
- Minimal.
- Trustworthy.
- Precise.
- Clinically oriented.
- Mobile-first.

Use a cohesive visual system.

Include:

- Configurable colors.
- Consistent typography.
- Professional iconography.
- Clear service cards.
- Distinct procedure workflow indicators.
- Accessible status colors.
- Simple forms.
- Clean dashboards.

Use a text-based HakimeRAD logo if the official logo is unavailable.

Do not invent official institutional branding.

### Public homepage

Design a homepage featuring:

1. HakimeRAD branding.
2. Clear introduction to interventional radiology services.
3. The three primary procedure categories.
4. An explanation of how referrals work.
5. A prominent procedure-request action.
6. A dedicated urgent intussusception coordination notice.
7. Referring physician access.
8. Contact details.
9. Frequently asked questions.
10. Footer with privacy and policy links.

### Procedure landing pages

Create dedicated pages for:

- Image-Guided Biopsy / FNAC.
- Image-Guided Abscess Drainage.
- Hydrostatic Intussusception Reduction.

Each page should explain:

- General purpose of the service.
- Who can submit a referral.
- What information is typically needed.
- How clinical review works.
- What happens after a request is submitted.
- How to contact HakimeRAD.

Use clinician-approved content. Do not invent claims about procedural outcomes, success rates, risks, or guaranteed availability.

### Responsive design

Optimize for:

- Mobile phones.
- Tablets.
- Desktop screens.

Target excellent accessibility and usability, following WCAG 2.2 AA where practical.

---

# 12. PROGRESSIVE WEB APPLICATION FEATURES

Build a genuine installable PWA.

Requirements:

- Web app manifest.
- Application icons.
- Service worker.
- Standalone display.
- Appropriate theme color.
- Offline fallback.
- Static asset caching.
- Versioned cache management.
- Installability.
- Update handling.

### Healthcare-specific offline policy

Users may access cached public information.

Do not cache sensitive patient information or clinical attachments in publicly accessible caches.

Do not allow procedure requests to be presented as successfully submitted when offline.

Display a clear connectivity indicator and provide a safe retry process.

Never falsely confirm a booking because the browser has stored a request locally.

---

# 13. TECHNICAL ARCHITECTURE

Inspect the current repository before choosing or replacing technologies.

Preserve a suitable existing stack.

For a greenfield implementation, use the following preferred architecture:

### Frontend

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- An accessible component system.
- React Hook Form.
- Zod.
- TanStack Query.

### Backend

- Node.js.
- TypeScript.
- NestJS or an appropriately structured Fastify/Express application.

### Database

- PostgreSQL.
- Prisma ORM.
- Database migrations.
- Transactional booking operations.
- Appropriate indexes and constraints.

### PWA

- Workbox or an actively maintained alternative.

### Testing

- Vitest or Jest.
- React Testing Library.
- Playwright.
- Backend integration testing.

### Architecture pattern

Use a modular monolith initially.

Create separate modules for:

1. Authentication.
2. Users and permissions.
3. Patients.
4. Referring physicians.
5. Referring institutions.
6. Procedure catalog.
7. Biopsy/FNAC referrals.
8. Abscess drainage referrals.
9. Intussusception coordination.
10. Clinical review.
11. Scheduling.
12. Resources and equipment.
13. Notifications.
14. Payments, if enabled.
15. Reports.
16. Audit logs.
17. System settings.

Separate business logic from presentation logic.

Do not create unnecessary microservices.

---

# 14. DATABASE DESIGN

Design a normalized, reliable relational database.

Include appropriate entities for:

### Identity

- User.
- Role.
- Permission.
- UserRole.
- Session.

### Patient and professional data

- Patient.
- Guardian.
- ReferringPhysician.
- ProfessionalVerification.
- ReferringInstitution.

### Procedure definitions

- Procedure.
- ProcedureCategory.
- ProcedureRequirement.
- ProcedureResourceRequirement.

### Referrals and requests

- ProcedureRequest.
- BiopsyRequestDetails.
- AbscessDrainageDetails.
- IntussusceptionCoordinationDetails.
- ReferralDocument.
- ClinicalReview.
- AdditionalInformationRequest.

### Scheduling

- Appointment.
- AppointmentStatusHistory.
- Staff.
- StaffAvailability.
- Room.
- Equipment.
- ResourceReservation.
- ScheduleException.

### Pre-procedure management

- PreparationChecklist.
- PreparationInstruction.
- PreparationAcknowledgement.
- ConsentStatusRecord.

### Specimen management

- Specimen.
- SpecimenDispatch.
- LaboratoryDestination.

### Follow-up

- FollowUpAppointment.
- FollowUpTask.

### Notifications

- Notification.
- NotificationTemplate.
- NotificationDeliveryAttempt.

### Security

- AuditLog.
- SecurityEvent.

Create appropriate:

- Foreign keys.
- Indexes.
- Unique constraints.
- Timestamps.
- Referential integrity.
- Data retention policies.
- Soft deletion rules where appropriate.

Use transaction-safe booking operations.

Keep medical information separate from ordinary profile and administrative information where appropriate.

Do not turn the booking platform into an unrestricted electronic medical record.

---

# 15. API REQUIREMENTS

Create a versioned API.

Suggested endpoints:

Authentication:
- /api/v1/auth

Patients:
- /api/v1/patients

Referring professionals:
- /api/v1/referring-physicians

Referring institutions:
- /api/v1/institutions

Procedures:
- /api/v1/procedures

Procedure requests:
- /api/v1/procedure-requests

Biopsy/FNAC:
- /api/v1/biopsy-requests

Abscess drainage:
- /api/v1/abscess-drainage-requests

Intussusception:
- /api/v1/intussusception-coordination

Clinical review:
- /api/v1/clinical-reviews

Scheduling:
- /api/v1/appointments

Resources:
- /api/v1/resources

Notifications:
- /api/v1/notifications

Reports:
- /api/v1/reports

Administration:
- /api/v1/admin

Audit:
- /api/v1/audit-logs

Implement validation, authorization, pagination, filtering, and consistent error handling.

Document the API through OpenAPI/Swagger.

---

# 16. SECURITY AND PATIENT CONFIDENTIALITY

Treat all patient-related information as sensitive healthcare information.

Implement:

- Secure authentication.
- Modern password hashing.
- Secure session handling.
- Role-based backend authorization.
- HTTPS in production.
- CSRF protection where applicable.
- Rate limiting.
- Secure file uploads.
- Private document storage.
- Access controls.
- Security headers.
- Audit logging.
- Database backups.
- Data retention policies.

Prevent:

- Cross-patient access.
- Unauthorized referral access.
- Privilege escalation.
- Insecure direct object references.
- SQL injection.
- Cross-site scripting.
- Sensitive information leakage.
- Unauthorized file downloads.

Never put patient details in public URLs.

Avoid unnecessary sensitive information in notifications and application logs.

Provide auditable records of important clinical and administrative workflow changes.

Do not claim regulatory compliance until applicable legal requirements have been independently verified.

---

# 17. PAYMENT AND BILLING

Keep payment processing optional and configurable.

The initial implementation should not depend on online payment.

Allow administrators to configure:

- Procedure fees.
- Consultation fees, if applicable.
- Payment status.
- Payment method.
- Manual verification.
- Receipt references.

Support future payment-provider integrations through modular adapters.

Do not assume a payment gateway is available.

Do not allow payment processing requirements to delay urgent hospital-based procedure coordination.

---

# 18. TESTING AND QUALITY ASSURANCE

All critical workflows must be tested.

Use Playwright for end-to-end testing.

### Test 1: Image-guided biopsy/FNAC

1. Open the application.
2. Select biopsy/FNAC.
3. Choose the requested sampling method.
4. Enter patient details.
5. Enter referral information.
6. Upload a sample referral document.
7. Submit the request.
8. Verify request reference generation.
9. Sign in as a clinical reviewer.
10. Review the request.
11. Request additional information.
12. Verify the patient/referrer receives a notification.
13. Approve the request.
14. Schedule the procedure.
15. Verify the confirmed appointment is visible to authorized users.

### Test 2: Abscess drainage

1. Open the drainage request page.
2. Submit a referral.
3. Upload relevant supporting documentation.
4. Verify successful submission.
5. Review as an interventional radiologist.
6. Assign clinical priority.
7. Approve or defer the request.
8. Assign appropriate resources.
9. Schedule the procedure.
10. Verify appointment tracking and follow-up workflow.

### Test 3: Hydrostatic intussusception reduction

1. Select the intussusception service.
2. Verify the urgent hospital-based warning appears.
3. Verify ordinary public time-slot booking is unavailable.
4. Submit a referral through an authorized professional or staff account.
5. Verify an urgent reference is generated.
6. Verify the designated staff receive alerts.
7. Verify acknowledgement is logged.
8. Record the clinical coordination decision.
9. Verify authorized staff can arrange the appropriate procedure schedule.
10. Verify the complete audit trail.

### Test 4: Authorization

Verify:

- A patient cannot access another patient's requests.
- A receptionist cannot approve clinical suitability.
- A referrer cannot see unrelated referrals.
- A consultant can only access permitted operational information.
- An unauthorized user cannot access administrative routes.
- An administrator can manage configured system functions.

### Test 5: Scheduling integrity

Verify:

- Double booking prevention.
- Resource conflict detection.
- Staff availability.
- Equipment availability.
- Appointment cancellation.
- Rescheduling.
- Concurrent submissions.
- Transaction rollback on failed booking operations.

### Test 6: PWA

Verify:

- Manifest.
- Service worker.
- Installation.
- Offline behavior.
- Safe updates.
- Sensitive data caching restrictions.
- No false booking confirmation during offline operation.

Do not declare the system production-ready without passing the relevant tests.

---

# 19. DOCUMENTATION AND HANDOVER

Create:

- README.md
- ARCHITECTURE.md
- DATABASE.md
- API.md
- SECURITY.md
- DEPLOYMENT.md
- USER_GUIDE.md
- REFERRAL_WORKFLOW.md
- PROCEDURE_WORKFLOWS.md
- ASSUMPTIONS.md
- .env.example

Document:

- Installation.
- Development setup.
- Database configuration.
- Database migrations.
- Seed data.
- Administrator initialization.
- Running tests.
- Building the PWA.
- Deployment.
- Backup and restore.
- Configuring procedures.
- Configuring staff.
- Configuring referral institutions.
- Configuring booking policies.

Clearly identify business information that still requires confirmation.

---

# 20. AUTONOMOUS DEVELOPMENT EXECUTION PLAN

Execute the project in the following order.

**Phase 1: Repository inspection and requirements**

Inspect the existing project.

Understand the technology stack, existing functionality, and development environment.

Produce a technical implementation plan.

**Phase 2: Foundation**

Configure the database, authentication, roles, backend architecture, frontend architecture, and reusable UI components.

**Phase 3: Public website**

Implement HakimeRAD branding, homepage, procedure information pages, referral entry points, and contact information.

**Phase 4: Procedure-specific referral forms**

Implement biopsy/FNAC, abscess drainage, and hydrostatic intussusception request modules independently.

**Phase 5: Clinical review**

Implement the clinical review dashboard, decision workflow, additional information requests, and approval controls.

**Phase 6: Scheduling engine**

Implement appointment scheduling, staff availability, equipment and room scheduling, and concurrency protection.

**Phase 7: Patient and referrer portals**

Implement patient dashboards, referring physician dashboards, request tracking, and communication.

**Phase 8: Administrative dashboard**

Implement procedure management, staff management, resource scheduling, reports, and business settings.

**Phase 9: Notifications and PWA**

Implement notification adapters, service worker, manifest, offline functionality, and installation support.

**Phase 10: Security and testing**

Execute unit, integration, and E2E tests. Test access restrictions, clinical workflows, and scheduling integrity.

**Phase 11: Deployment readiness**

Finalize documentation, production configuration, administrator setup, and deployment preparation.

After every phase, report actual implementation results and continue to the next phase.

Do not substitute progress reporting for implementation.

---

# 21. FINAL ACCEPTANCE CRITERIA

The application is considered complete only when:

- HakimeRAD branding is implemented.
- All three procedure categories have dedicated request workflows.
- Procedure requests are stored in the database.
- Patients and referring clinicians can submit requests.
- Referral documents can be securely uploaded.
- Authorized clinicians can review requests.
- Clinical approval is separated from administrative scheduling.
- Approved procedures can be scheduled.
- Staff and resource conflicts are detected.
- Duplicate bookings are prevented.
- Urgent intussusception coordination has a dedicated workflow.
- Public intussusception time-slot booking is disabled.
- Authorized staff can manage appointments.
- Patients and referrers can track requests.
- Notifications work through configured providers.
- Administrative actions are audited.
- The PWA is installable where supported.
- Sensitive information is protected.
- Automated tests cover the critical workflows.
- The production build succeeds.
- Documentation is complete.

---

# 22. IMPORTANT IMPLEMENTATION RULES FOR THE CODING AGENT

You must:

1. Inspect the existing repository before modifying it.
2. Preserve useful existing functionality.
3. Implement complete working features.
4. Use real backend persistence.
5. Do not use hardcoded mock responses as production functionality.
6. Never fabricate clinical approvals.
7. Never allow public users to approve procedures.
8. Never confuse a request submission with a confirmed appointment.
9. Never permit double booking.
10. Never generate patient-specific medical preparation instructions autonomously.
11. Never allow the urgent intussusception workflow to depend exclusively on online booking.
12. Never expose patient information through public routes or insecure storage.
13. Maintain an auditable history of workflow changes.
14. Run tests after implementation.
15. Fix errors rather than suppressing them.
16. Never claim an integration works without testing it.
17. Keep external API credentials in environment variables.
18. Make business settings configurable.
19. Document all outstanding assumptions.
20. Continue implementing without unnecessary approval requests.

When credentials for an external integration are unavailable, implement the adapter architecture and test it using a suitable sandbox or mock provider. Clearly document what is still needed for production activation.

---

# 23. FINAL PRODUCT VISION

Build HakimeRAD IR Booking as a specialized digital service that connects patients, referring physicians, and the interventional radiology team.

The final application should provide three distinct but integrated procedural pathways:

**BIOPSY / FNAC**

A structured referral, imaging review, clinical approval, scheduling, specimen tracking, and follow-up workflow.

**ABSCESS DRAINAGE**

A structured referral, clinical priority review, resource coordination, procedure scheduling, and drainage follow-up workflow.

**HYDROSTATIC INTUSSUSCEPTION REDUCTION**

An urgent hospital-to-radiology coordination workflow with direct communication, clinical acknowledgement, and controlled scheduling.

All three pathways must operate within one secure platform with a unified user experience and administrative dashboard.

The product should be polished, practical, dependable, and suitable for real interventional radiology operations.

**Your first task is to inspect the current repository, report its existing architecture, and begin implementing the system according to this specification. Build the working application, not merely the design.**


For HakimeRAD, I would refine the system into a Specialized Interventional Radiology Procedure Booking & Referral Management PWA, rather than a general radiology appointment application.

The biggest architectural change is that patients and referring clinicians submit procedure requests, after which the interventional radiology team reviews the clinical information and approves the procedure and schedule. This is important because image-guided procedures require individual assessment, imaging review, and appropriate procedural planning.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://pmc.ncbi.nlm.nih.gov\&sz=32)

PMC+1



The three dedicated service lines will be:

1. Image-guided biopsy / FNAC — requests for image-guided tissue or cytology sampling.
2. Image-guided abscess drainage — requests for percutaneous drainage of abscesses or fluid collections.
3. Hydrostatic intussusception reduction — a hospital-based, urgent coordination pathway, not an ordinary public appointment calendar.&#x20;

   [image](https://www.google.com/s2/favicons?domain=https://www.cirse.org\&sz=32)

   CIRSE+2



Below is the refined master prompt, ready to give to an autonomous coding agent.

# MASTER AGENTIC DEVELOPMENT PROMPT

# HAKIMERAD INTERVENTIONAL RADIOLOGY PROCEDURE BOOKING & MANAGEMENT PWA

## 1. PROJECT IDENTITY AND MISSION

You are an autonomous senior healthcare software engineering team comprising:

- Senior product architect.
- Interventional radiology workflow analyst.
- Senior full-stack engineer.
- Healthcare UI/UX designer.
- Database architect.
- Healthcare cybersecurity engineer.
- QA and automation engineer.
- DevOps and deployment engineer.

Your assignment is to build a complete, modern, secure, responsive, installable Progressive Web Application (PWA) for:

**HakimeRAD Radiologic Consultancy**

The system will specialize in the referral, booking, scheduling, coordination, and administrative management of minimally invasive image-guided interventional radiology procedures.

This is a dedicated interventional radiology booking system, not a general-purpose hospital management system and not a conventional diagnostic radiology appointment application.

### Primary procedures supported

The initial application must focus on three specific interventional radiology services:

**1. Image-Guided Biopsy / Fine Needle Aspiration Cytology (FNAC)**

Support procedure requests involving:

- Ultrasound-guided biopsy.
- CT-guided biopsy.
- Ultrasound-guided FNAC.
- Other configurable image-guided sampling procedures.

Distinguish FNAC from core needle biopsy because they involve different sampling requirements.

**2. Image-Guided Abscess Drainage**

Support requests for:

- Percutaneous abscess drainage.
- Image-guided aspiration of fluid collections.
- Image-guided drainage catheter placement.
- Other configurable percutaneous drainage procedures.

**3. Hydrostatic Intussusception Reduction**

Support a dedicated hospital-based workflow for coordinating hydrostatic reduction procedures.

This workflow must prioritize urgent clinical referral and direct coordination between the referring team, radiology, and other relevant hospital teams.

It must not be presented as an ordinary elective outpatient booking service.

### Overall objective

Deliver a platform where patients, parents or guardians, and referring healthcare professionals can initiate procedure requests, submit relevant documentation, and coordinate with HakimeRAD.

The interventional radiology team must be able to review the requests, assess their suitability, approve the procedure, coordinate required resources, and assign an appropriate appointment.

The system must manage the entire booking lifecycle, from initial request to procedure completion.

Build the actual application. Do not stop at architectural descriptions, static mockups, or a frontend prototype.

---

# 2. CORE BUSINESS WORKFLOW

The fundamental operating model must be:

**Referral / Procedure Request → Clinical Review → Procedure Approval → Scheduling → Patient Preparation → Procedure Attendance → Completion → Follow-up Coordination**

The central principle is:

**A submitted procedure request is not automatically a confirmed procedure.**

The interventional radiologist or appropriately authorized clinical team must review and approve the request before a definitive appointment is confirmed.

Design the software around this principle.

### Booking types

Support three request sources:

1. Patient or caregiver request.
2. Referring physician request.
3. Internal hospital or healthcare facility referral.

Allow the administrator to control which request sources are enabled.

### Booking modes

Support:

- Routine elective booking.
- Expedited clinical review.
- Urgent hospital coordination.
- Direct staff-entered booking.
- Emergency referral coordination.

The clinical team, not an automated algorithm, determines the clinical priority and appropriateness of the requested intervention.

---

# 3. USER ROLES AND ACCESS CONTROL

Implement secure, role-based access control.

## 3.1 Public visitors

Visitors should be able to:

- Access the HakimeRAD homepage.
- Learn about the consultancy.
- Explore the three interventional services.
- Read procedure descriptions.
- Understand the referral and booking process.
- View contact information.
- Submit an eligible procedure request.
- Access emergency contact information.
- Register or sign in.
- Access privacy and booking policies.

Public visitors must not be able to access private patient requests.

## 3.2 Patients / Parents / Guardians

Provide patient and caregiver accounts.

Capabilities:

- Create an account.
- Submit a procedure request.
- Provide patient details.
- Upload referral documents.
- Upload relevant investigation reports.
- Track request status.
- View approved appointment details.
- Receive notifications.
- Request rescheduling.
- Request cancellation.
- View booking history.

For pediatric patients, support parent or guardian registration and an explicit relationship to the patient.

Never assume the person submitting a request is the patient.

## 3.3 Referring physicians

Provide a dedicated healthcare professional referral portal.

Authorized physicians should be able to:

- Register and manage a professional profile.
- Submit procedure referrals.
- Identify the patient.
- Specify the requested procedure.
- Provide relevant clinical information.
- Upload referral letters.
- Attach relevant radiology reports and investigation documents.
- Indicate the requested urgency.
- Identify the referring institution.
- Provide direct contact information.
- Track submitted referrals.
- Respond to requests for additional information.
- View confirmed appointment details.
- Review the referral history.

Require professional verification before granting elevated referral privileges.

## 3.4 Receptionist / Booking Officer

Responsibilities:

- Review incoming requests for administrative completeness.
- Register walk-in referrals.
- Verify patient contact information.
- Contact patients and referring facilities.
- Coordinate administrative appointments.
- Schedule approved procedures.
- Reschedule appointments.
- Record cancellations.
- Check patients in.
- Track arrival and attendance.
- Send notifications.
- View the daily schedule.

Receptionists must not independently approve clinical suitability.

## 3.5 Interventional Radiologist

Provide a dedicated clinical dashboard.

Capabilities:

- View incoming procedure referrals.
- Review relevant clinical information.
- Review submitted imaging reports and documents.
- Request additional information.
- Approve or decline a procedure request.
- Recommend a different procedure pathway.
- Assign clinical priority.
- Specify the appropriate procedure modality.
- Set required procedural resources.
- Approve scheduling.
- Review the assigned procedure list.
- Record procedural workflow status.
- Document operational outcomes.
- Arrange follow-up requirements.

Clinical decisions must be made by authorized practitioners.

## 3.6 Radiology Team / Procedure Coordinator

Provide appropriate operational access for radiographers, nurses, and procedure coordinators.

They should be able to:

- View assigned schedules.
- Review relevant procedural requirements.
- Confirm room and equipment readiness.
- Track patient arrival.
- Complete authorized preparation checklists.
- Update procedure progress.
- Record operational information.

Restrict clinical decision-making and sensitive records according to role permissions.

## 3.7 System Administrator

Administrators should manage:

- Users.
- Roles and permissions.
- Referring facilities.
- Physicians.
- Staff.
- Procedures.
- Availability.
- Procedure rooms.
- Equipment.
- Booking rules.
- Business settings.
- Notification settings.
- Reports.
- Audit logs.
- PWA settings.

All permissions must be enforced by the backend.

---

# 4. PROCEDURE-SPECIFIC REQUEST MODULES

This is the most important functional part of the application.

Each procedure must have a dedicated booking interface, dedicated data model where appropriate, and its own configurable workflow.

Do not use one generic appointment form for all three procedures.

## 4.1 IMAGE-GUIDED BIOPSY / FNAC MODULE

Create a specialized request form.

### A. Procedure selection

Allow the requester to select:

- Ultrasound-guided FNAC.
- Ultrasound-guided core needle biopsy.
- CT-guided biopsy.
- Other image-guided biopsy, as configured.

### B. Patient information

Collect:

- Patient full name.
- Date of birth or age, according to operational requirements.
- Sex, only where relevant.
- Phone number.
- Email, if available.
- Patient or caregiver contact.
- Guardian details for minors.

### C. Clinical referral information

Provide fields for:

- Referring physician.
- Referring institution.
- Clinical indication.
- Target organ or anatomical region.
- Target lesion description.
- Requested sampling method.
- Relevant imaging findings.
- Previous biopsy history, where applicable.
- Other information supplied by the referring physician.

### D. Imaging and documentation

Allow secure submission of:

- Referral letter.
- Ultrasound report.
- CT report.
- MRI report.
- Previous relevant radiology reports.
- Other relevant documents.

Support private file storage and controlled access.

Where available, allow recording an external PACS identifier or secure imaging reference.

Do not expose patient documents through public URLs.

### E. Procedure review

The clinical reviewer should be able to:

- Review the submitted indication.
- Assess imaging availability and quality.
- Confirm the proposed target.
- Determine the appropriate sampling method.
- Request additional imaging or documentation.
- Specify additional clinical assessment requirements.
- Approve, defer, or decline the request.

### F. Scheduling

After clinical approval, allow scheduling based on:

- Interventional radiologist availability.
- Ultrasound or CT availability.
- Procedure-room availability.
- Required equipment.
- Nursing availability.
- Patient-specific procedure duration.
- Resource buffers.

Include configurable time estimates.

Do not hardcode universal procedure durations.

### G. Specimen workflow

Where applicable, provide operational fields for:

- Specimen collection type.
- Specimen identifier.
- Number of specimens or containers.
- Destination laboratory.
- Pathology or cytology dispatch status.
- Date and time of dispatch.
- Responsible staff member.

This is specimen logistics, not a substitute for a laboratory information system or diagnostic reporting system.

---

## 4.2 IMAGE-GUIDED ABSCESS DRAINAGE MODULE

Create a dedicated abscess drainage request form.

### A. Request classification

Support:

- Image-guided abscess aspiration.
- Percutaneous abscess drainage.
- Drainage catheter placement.
- Other configured drainage-related procedures.

### B. Patient information

Collect necessary identity and contact information.

For minors, provide parent or guardian information.

### C. Referral information

Include:

- Referring physician.
- Referring institution.
- Clinical indication.
- Suspected or documented collection location.
- Anatomical site.
- Available imaging modality.
- Date of most recent imaging.
- Relevant imaging report.
- Relevant clinical information supplied by the referring team.
- Requested urgency.

The requesting clinician should be able to upload relevant imaging reports and other supporting documentation.

### D. Clinical review

The interventional radiologist must be able to evaluate:

- The submitted indication.
- Imaging availability.
- Collection characteristics as described in the clinical documentation.
- Proposed image-guidance method.
- Appropriate procedural resources.
- Whether additional clinical evaluation is necessary.
- Whether the proposed intervention is appropriate.

The system must not independently decide whether a collection is suitable for drainage.

### E. Scheduling and coordination

Support:

- Priority review.
- Assigned interventional radiologist.
- Required imaging modality.
- Procedure room.
- Required drainage equipment.
- Nursing support.
- Anesthesia or sedation support where clinically determined.
- Inpatient or outpatient coordination, where supported.
- Configurable post-procedure observation arrangements.

Allow the clinical team to indicate whether the procedure needs expedited coordination.

Do not automatically convert a request marked urgent by a patient into an approved emergency procedure.

### F. Drainage follow-up coordination

Support operational follow-up records:

- Procedure completion.
- Drain insertion status.
- Drain documentation status.
- Assigned follow-up clinician.
- Follow-up appointment date.
- Follow-up imaging requirement.
- Drain management review status.

Do not automatically provide catheter-removal recommendations or patient-specific treatment instructions.

---

## 4.3 HYDROSTATIC INTUSSUSCEPTION REDUCTION MODULE

Create a separate, clearly identifiable workflow.

This service is different from elective biopsy and drainage booking.

It must be designed for urgent coordination within a hospital-based clinical workflow.

### Critical safety requirement

**Do not offer hydrostatic intussusception reduction as an ordinary self-service appointment with publicly selectable dates and time slots.**

When the procedure is selected on the public website, display a prominent message:

"This procedure requires urgent hospital-based clinical assessment and coordination. It is not a routine outpatient appointment. Do not wait for an online booking response. Contact the referring hospital or emergency department immediately using the emergency contact information provided."

The application must not diagnose intussusception, decide whether hydrostatic reduction is appropriate, or delay emergency assessment.

### A. Authorized request sources

Accept requests from:

- Emergency department.
- Pediatric department.
- Referring hospital.
- Authorized pediatrician.
- General surgeon.
- Pediatric surgeon.
- Radiology department.
- Other approved hospital clinicians.

Public visitors may view service information and emergency contact instructions, but must not place an ordinary elective appointment for this service.

### B. Pediatric patient support

Support pediatric patients and guardians.

Collect:

- Patient identity.
- Age or date of birth.
- Guardian name.
- Guardian contact details.
- Referring facility.
- Referring clinician.
- Hospital contact number.
- Referral documentation.
- Available imaging report.
- Clinically relevant documentation submitted by the treating team.

### C. Urgent referral coordination

Allow the referring hospital or authorized professional to initiate an urgent coordination request.

The system should:

1. Generate an urgent referral reference.
2. Notify designated authorized radiology personnel.
3. Notify the appropriate coordinator.
4. Display the referring facility's contact information.
5. Record the communication and acknowledgement status.
6. Allow direct communication among authorized clinical personnel.
7. Record the decision made by the responsible clinical team.
8. Allow authorized staff to arrange a procedure slot only after direct clinical coordination.
9. Record the final scheduling decision.
10. Maintain a time-stamped audit trail.

A notification must not be treated as proof that the referral has been clinically accepted.

### D. Coordination requirements

Allow authorized staff to record:

- Referring emergency department.
- Responsible treating team.
- Radiology team acknowledgement.
- Required fluoroscopy or procedural resources.
- Procedure-room availability.
- Relevant surgical-team coordination.
- Required supporting personnel.
- Planned coordination time.
- Clinical approval.
- Final scheduling status.

Exact clinical eligibility and procedural decisions must remain with the relevant healthcare professionals.

### E. Emergency fallback

If the referral cannot be acknowledged through the application, the referring institution must be directed to the configured direct emergency communication channel.

The software must never become the only channel for emergency coordination.

---

# 5. REFINED BOOKING AND REFERRAL LIFECYCLE

Implement a procedure-specific request and appointment state machine.

Suggested states:

1. Submitted.
2. Received.
3. Under administrative review.
4. Under clinical review.
5. Awaiting additional information.
6. Awaiting imaging or documentation.
7. Clinically approved.
8. Approved for scheduling.
9. Scheduled.
10. Patient notified.
11. Patient arrived.
12. Pre-procedure verification.
13. Ready for procedure.
14. In progress.
15. Completed.
16. Post-procedure observation.
17. Follow-up required.
18. Cancelled.
19. Deferred.
20. Declined.
21. Referred to another care pathway.

Not every state applies to every procedure.

Configure state transitions according to procedure type.

Maintain a complete history of all changes, including:

- Previous status.
- New status.
- Date and time.
- Responsible user.
- Reason.
- Relevant notes.

Implement backend validation to prevent unauthorized state changes.

### Important distinction

A submitted request, a clinically approved procedure, a scheduled procedure, and a completed procedure are four different things.

The user interface and all notifications must preserve this distinction.

---

# 6. PROCEDURE SCHEDULING ENGINE

Build an advanced backend scheduling system.

Scheduling must be based on actual clinical and operational resource availability.

### Scheduling resources

Consider:

- Interventional radiologist.
- Radiographer.
- Nursing personnel.
- Ultrasound equipment.
- CT equipment.
- Fluoroscopy equipment.
- Procedure room.
- Required instruments.
- Sedation or anesthesia resources when applicable.
- Supporting departments.
- Recovery or observation capacity when required.

Resources must be configurable.

### Scheduling features

- Individual staff calendars.
- Procedure-specific durations.
- Room availability.
- Equipment availability.
- Working hours.
- Breaks.
- Holidays.
- Staff leave.
- Temporary closures.
- Booking buffers.
- Priority scheduling.
- Rescheduling.
- Cancellation.
- Schedule conflict detection.
- Daily schedule.
- Weekly calendar.
- Monthly calendar.

### Booking rules

A procedure must not be scheduled unless:

1. The request has received the required clinical approval.
2. Required resources are available.
3. The selected schedule falls within configured operational rules.
4. Relevant administrative conditions are satisfied.
5. The appointment does not conflict with another resource reservation.

### Concurrency protection

Prevent double booking through database transactions and appropriate locking or database constraints.

Do not rely on frontend availability checks alone.

Hydrostatic intussusception reduction must use its dedicated urgent coordination pathway, not the standard elective booking calendar.

---

# 7. CLINICAL REVIEW AND PRE-PROCEDURE MANAGEMENT

Implement a configurable, clinician-controlled pre-procedure management module.

This module must not attempt to replace clinical assessment or issue autonomous medical instructions.

### Clinical review checklist

Provide procedure-specific checklist templates with editable fields for:

- Clinical indication reviewed.
- Referral reviewed.
- Imaging reviewed.
- Patient identity verified.
- Additional investigations reviewed, if required.
- Relevant medication history reviewed.
- Anticoagulant or antiplatelet therapy reviewed by the clinical team where relevant.
- Relevant allergies reviewed.
- Contrast-related assessment completed when applicable.
- Anesthesia or sedation requirements assessed.
- Procedure-specific requirements documented.
- Informed consent status documented.
- Procedural resources confirmed.

### Pre-procedure instructions

Allow authorized clinicians to issue patient-specific preparation instructions.

Examples of configurable instruction categories:

- Appointment arrival time.
- Fasting instructions, if required.
- Medication instructions, if clinically determined.
- Required documents.
- Required investigations.
- Accompaniment requirements.
- Admission arrangements.
- Contact information.

**Never hardcode fasting durations, anticoagulant interruption instructions, medication changes, laboratory thresholds, or other clinical preparation rules.**

These must be defined or approved by qualified clinicians according to the particular procedure, patient, and applicable local protocols.

The system should distinguish between:

- Instructions not yet issued.
- Instructions issued.
- Instructions acknowledged.
- Preparation requirements completed.
- Preparation requirements requiring further review.

Electronic acceptance of a booking policy must not be treated as informed procedural consent.

Actual consent documentation must follow the clinic's approved clinical workflow.

---

# 8. PATIENT AND REFERRAL PORTAL

Create a clean, simple patient-facing interface.

### Patient dashboard

Include:

- Welcome section.
- New procedure request.
- Active requests.
- Requests awaiting review.
- Approved procedures.
- Upcoming procedures.
- Completed procedures.
- Cancelled requests.
- Notifications.

### Request tracking

Display a simple status tracker.

For example:

Request submitted → Clinical review → Approved → Scheduled → Completed.

Explain each status in understandable language.

Do not disclose internal clinical discussions, staff-only notes, or restricted information.

### Patient appointment details

Show:

- Booking reference.
- Procedure name.
- Appointment date.
- Arrival time.
- Approved location.
- Assigned department or team, where appropriate.
- Patient-specific preparation instructions.
- Contact information.
- Relevant administrative requirements.

### Referring physician dashboard

Include:

- New referral.
- Submitted referrals.
- Pending reviews.
- Requests requiring additional information.
- Approved referrals.
- Scheduled procedures.
- Completed procedures.
- Referral history.

Allow secure communication with authorized HakimeRAD personnel.

---

# 9. ADMINISTRATIVE DASHBOARD

Build a sophisticated but user-friendly dashboard.

### Overview metrics

Display real data:

- Total procedure requests.
- New referrals.
- Requests awaiting clinical review.
- Procedures approved.
- Procedures awaiting scheduling.
- Scheduled procedures.
- Procedures completed.
- Cancelled procedures.
- Upcoming procedures.

Break down data by:

- Biopsy/FNAC.
- Abscess drainage.
- Hydrostatic intussusception reduction.

Provide date filters and operational summary cards.

### Procedure management

Create procedure-specific management sections.

**Biopsy/FNAC management**

- Incoming requests.
- Sampling method.
- Target anatomy.
- Referral institution.
- Clinical approval.
- Scheduling.
- Specimen dispatch tracking.

**Abscess drainage management**

- Incoming requests.
- Collection location.
- Referral institution.
- Clinical priority.
- Resource coordination.
- Scheduling.
- Follow-up coordination.

**Intussusception coordination**

- Urgent referrals.
- Referral acknowledgement.
- Hospital communication.
- Radiology coordination.
- Required resources.
- Procedure scheduling.
- Status and event history.

### Calendar dashboard

Provide:

- Daily procedure list.
- Weekly calendar.
- Monthly calendar.
- Staff-specific schedules.
- Resource-specific schedules.

Use visually distinguishable labels for:

- Biopsy/FNAC.
- Abscess drainage.
- Urgent intussusception coordination.

### Staff management

Manage:

- Interventional radiologists.
- Radiographers.
- Nurses.
- Receptionists.
- Coordinators.
- Administrators.

Support staff availability and procedure assignments.

### Referral institution management

Maintain a directory containing:

- Institution name.
- Institution type.
- Address.
- Contact information.
- Referring clinicians.
- Referral history.
- Account status.

---

# 10. NOTIFICATION AND COMMUNICATION SYSTEM

Implement a reliable notification architecture.

### Trigger events

Send notifications for:

- Referral submitted.
- Referral received.
- Additional information requested.
- Clinical approval granted.
- Procedure declined.
- Appointment scheduled.
- Appointment rescheduled.
- Appointment cancelled.
- Preparation instructions issued.
- Appointment reminder.
- Procedure completed.
- Follow-up requested.

### Notification channels

Support configurable:

- Email.
- SMS.
- WhatsApp Business API.
- In-app notifications.

Use provider adapters rather than hardcoding a messaging service.

### Notification requirements

- Notifications must contain a unique request or booking reference.
- Messages must not expose excessive sensitive clinical information.
- Staff must be able to resend failed notifications.
- Delivery attempts must be logged.
- Notifications must support retries.
- Failed external messaging must not cancel a valid booking.

For urgent intussusception referrals, provide immediate staff alerts and a direct communication fallback. Do not rely exclusively on email or background messaging.

---

# 11. DESIGN AND BRANDING

Design the application as a professional interventional radiology service platform.

### Brand identity

Organization: HakimeRAD Radiologic Consultancy.

Product: HakimeRAD IR Booking.

Design characteristics:

- Modern medical technology.
- Professional.
- Clean.
- Minimal.
- Trustworthy.
- Precise.
- Clinically oriented.
- Mobile-first.

Use a cohesive visual system.

Include:

- Configurable colors.
- Consistent typography.
- Professional iconography.
- Clear service cards.
- Distinct procedure workflow indicators.
- Accessible status colors.
- Simple forms.
- Clean dashboards.

Use a text-based HakimeRAD logo if the official logo is unavailable.

Do not invent official institutional branding.

### Public homepage

Design a homepage featuring:

1. HakimeRAD branding.
2. Clear introduction to interventional radiology services.
3. The three primary procedure categories.
4. An explanation of how referrals work.
5. A prominent procedure-request action.
6. A dedicated urgent intussusception coordination notice.
7. Referring physician access.
8. Contact details.
9. Frequently asked questions.
10. Footer with privacy and policy links.

### Procedure landing pages

Create dedicated pages for:

- Image-Guided Biopsy / FNAC.
- Image-Guided Abscess Drainage.
- Hydrostatic Intussusception Reduction.

Each page should explain:

- General purpose of the service.
- Who can submit a referral.
- What information is typically needed.
- How clinical review works.
- What happens after a request is submitted.
- How to contact HakimeRAD.

Use clinician-approved content. Do not invent claims about procedural outcomes, success rates, risks, or guaranteed availability.

### Responsive design

Optimize for:

- Mobile phones.
- Tablets.
- Desktop screens.

Target excellent accessibility and usability, following WCAG 2.2 AA where practical.

---

# 12. PROGRESSIVE WEB APPLICATION FEATURES

Build a genuine installable PWA.

Requirements:

- Web app manifest.
- Application icons.
- Service worker.
- Standalone display.
- Appropriate theme color.
- Offline fallback.
- Static asset caching.
- Versioned cache management.
- Installability.
- Update handling.

### Healthcare-specific offline policy

Users may access cached public information.

Do not cache sensitive patient information or clinical attachments in publicly accessible caches.

Do not allow procedure requests to be presented as successfully submitted when offline.

Display a clear connectivity indicator and provide a safe retry process.

Never falsely confirm a booking because the browser has stored a request locally.

---

# 13. TECHNICAL ARCHITECTURE

Inspect the current repository before choosing or replacing technologies.

Preserve a suitable existing stack.

For a greenfield implementation, use the following preferred architecture:

### Frontend

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- An accessible component system.
- React Hook Form.
- Zod.
- TanStack Query.

### Backend

- Node.js.
- TypeScript.
- NestJS or an appropriately structured Fastify/Express application.

### Database

- PostgreSQL.
- Prisma ORM.
- Database migrations.
- Transactional booking operations.
- Appropriate indexes and constraints.

### PWA

- Workbox or an actively maintained alternative.

### Testing

- Vitest or Jest.
- React Testing Library.
- Playwright.
- Backend integration testing.

### Architecture pattern

Use a modular monolith initially.

Create separate modules for:

1. Authentication.
2. Users and permissions.
3. Patients.
4. Referring physicians.
5. Referring institutions.
6. Procedure catalog.
7. Biopsy/FNAC referrals.
8. Abscess drainage referrals.
9. Intussusception coordination.
10. Clinical review.
11. Scheduling.
12. Resources and equipment.
13. Notifications.
14. Payments, if enabled.
15. Reports.
16. Audit logs.
17. System settings.

Separate business logic from presentation logic.

Do not create unnecessary microservices.

---

# 14. DATABASE DESIGN

Design a normalized, reliable relational database.

Include appropriate entities for:

### Identity

- User.
- Role.
- Permission.
- UserRole.
- Session.

### Patient and professional data

- Patient.
- Guardian.
- ReferringPhysician.
- ProfessionalVerification.
- ReferringInstitution.

### Procedure definitions

- Procedure.
- ProcedureCategory.
- ProcedureRequirement.
- ProcedureResourceRequirement.

### Referrals and requests

- ProcedureRequest.
- BiopsyRequestDetails.
- AbscessDrainageDetails.
- IntussusceptionCoordinationDetails.
- ReferralDocument.
- ClinicalReview.
- AdditionalInformationRequest.

### Scheduling

- Appointment.
- AppointmentStatusHistory.
- Staff.
- StaffAvailability.
- Room.
- Equipment.
- ResourceReservation.
- ScheduleException.

### Pre-procedure management

- PreparationChecklist.
- PreparationInstruction.
- PreparationAcknowledgement.
- ConsentStatusRecord.

### Specimen management

- Specimen.
- SpecimenDispatch.
- LaboratoryDestination.

### Follow-up

- FollowUpAppointment.
- FollowUpTask.

### Notifications

- Notification.
- NotificationTemplate.
- NotificationDeliveryAttempt.

### Security

- AuditLog.
- SecurityEvent.

Create appropriate:

- Foreign keys.
- Indexes.
- Unique constraints.
- Timestamps.
- Referential integrity.
- Data retention policies.
- Soft deletion rules where appropriate.

Use transaction-safe booking operations.

Keep medical information separate from ordinary profile and administrative information where appropriate.

Do not turn the booking platform into an unrestricted electronic medical record.

---

# 15. API REQUIREMENTS

Create a versioned API.

Suggested endpoints:

Authentication:

- /api/v1/auth

Patients:

- /api/v1/patients

Referring professionals:

- /api/v1/referring-physicians

Referring institutions:

- /api/v1/institutions

Procedures:

- /api/v1/procedures

Procedure requests:

- /api/v1/procedure-requests

Biopsy/FNAC:

- /api/v1/biopsy-requests

Abscess drainage:

- /api/v1/abscess-drainage-requests

Intussusception:

- /api/v1/intussusception-coordination

Clinical review:

- /api/v1/clinical-reviews

Scheduling:

- /api/v1/appointments

Resources:

- /api/v1/resources

Notifications:

- /api/v1/notifications

Reports:

- /api/v1/reports

Administration:

- /api/v1/admin

Audit:

- /api/v1/audit-logs

Implement validation, authorization, pagination, filtering, and consistent error handling.

Document the API through OpenAPI/Swagger.

---

# 16. SECURITY AND PATIENT CONFIDENTIALITY

Treat all patient-related information as sensitive healthcare information.

Implement:

- Secure authentication.
- Modern password hashing.
- Secure session handling.
- Role-based backend authorization.
- HTTPS in production.
- CSRF protection where applicable.
- Rate limiting.
- Secure file uploads.
- Private document storage.
- Access controls.
- Security headers.
- Audit logging.
- Database backups.
- Data retention policies.

Prevent:

- Cross-patient access.
- Unauthorized referral access.
- Privilege escalation.
- Insecure direct object references.
- SQL injection.
- Cross-site scripting.
- Sensitive information leakage.
- Unauthorized file downloads.

Never put patient details in public URLs.

Avoid unnecessary sensitive information in notifications and application logs.

Provide auditable records of important clinical and administrative workflow changes.

Do not claim regulatory compliance until applicable legal requirements have been independently verified.

---

# 17. PAYMENT AND BILLING

Keep payment processing optional and configurable.

The initial implementation should not depend on online payment.

Allow administrators to configure:

- Procedure fees.
- Consultation fees, if applicable.
- Payment status.
- Payment method.
- Manual verification.
- Receipt references.

Support future payment-provider integrations through modular adapters.

Do not assume a payment gateway is available.

Do not allow payment processing requirements to delay urgent hospital-based procedure coordination.

---

# 18. TESTING AND QUALITY ASSURANCE

All critical workflows must be tested.

Use Playwright for end-to-end testing.

### Test 1: Image-guided biopsy/FNAC

1. Open the application.
2. Select biopsy/FNAC.
3. Choose the requested sampling method.
4. Enter patient details.
5. Enter referral information.
6. Upload a sample referral document.
7. Submit the request.
8. Verify request reference generation.
9. Sign in as a clinical reviewer.
10. Review the request.
11. Request additional information.
12. Verify the patient/referrer receives a notification.
13. Approve the request.
14. Schedule the procedure.
15. Verify the confirmed appointment is visible to authorized users.

### Test 2: Abscess drainage

1. Open the drainage request page.
2. Submit a referral.
3. Upload relevant supporting documentation.
4. Verify successful submission.
5. Review as an interventional radiologist.
6. Assign clinical priority.
7. Approve or defer the request.
8. Assign appropriate resources.
9. Schedule the procedure.
10. Verify appointment tracking and follow-up workflow.

### Test 3: Hydrostatic intussusception reduction

1. Select the intussusception service.
2. Verify the urgent hospital-based warning appears.
3. Verify ordinary public time-slot booking is unavailable.
4. Submit a referral through an authorized professional or staff account.
5. Verify an urgent reference is generated.
6. Verify the designated staff receive alerts.
7. Verify acknowledgement is logged.
8. Record the clinical coordination decision.
9. Verify authorized staff can arrange the appropriate procedure schedule.
10. Verify the complete audit trail.

### Test 4: Authorization

Verify:

- A patient cannot access another patient's requests.
- A receptionist cannot approve clinical suitability.
- A referrer cannot see unrelated referrals.
- A consultant can only access permitted operational information.
- An unauthorized user cannot access administrative routes.
- An administrator can manage configured system functions.

### Test 5: Scheduling integrity

Verify:

- Double booking prevention.
- Resource conflict detection.
- Staff availability.
- Equipment availability.
- Appointment cancellation.
- Rescheduling.
- Concurrent submissions.
- Transaction rollback on failed booking operations.

### Test 6: PWA

Verify:

- Manifest.
- Service worker.
- Installation.
- Offline behavior.
- Safe updates.
- Sensitive data caching restrictions.
- No false booking confirmation during offline operation.

Do not declare the system production-ready without passing the relevant tests.

---

# 19. DOCUMENTATION AND HANDOVER

Create:

- README.md
- ARCHITECTURE.md
- DATABASE.md
- API.md
- SECURITY.md
- DEPLOYMENT.md
- USER_GUIDE.md
- REFERRAL_WORKFLOW\.md
- PROCEDURE_WORKFLOWS.md
- ASSUMPTIONS.md
- .env.example

Document:

- Installation.
- Development setup.
- Database configuration.
- Database migrations.
- Seed data.
- Administrator initialization.
- Running tests.
- Building the PWA.
- Deployment.
- Backup and restore.
- Configuring procedures.
- Configuring staff.
- Configuring referral institutions.
- Configuring booking policies.

Clearly identify business information that still requires confirmation.

---

# 20. AUTONOMOUS DEVELOPMENT EXECUTION PLAN

Execute the project in the following order.

**Phase 1: Repository inspection and requirements**

Inspect the existing project.

Understand the technology stack, existing functionality, and development environment.

Produce a technical implementation plan.

**Phase 2: Foundation**

Configure the database, authentication, roles, backend architecture, frontend architecture, and reusable UI components.

**Phase 3: Public website**

Implement HakimeRAD branding, homepage, procedure information pages, referral entry points, and contact information.

**Phase 4: Procedure-specific referral forms**

Implement biopsy/FNAC, abscess drainage, and hydrostatic intussusception request modules independently.

**Phase 5: Clinical review**

Implement the clinical review dashboard, decision workflow, additional information requests, and approval controls.

**Phase 6: Scheduling engine**

Implement appointment scheduling, staff availability, equipment and room scheduling, and concurrency protection.

**Phase 7: Patient and referrer portals**

Implement patient dashboards, referring physician dashboards, request tracking, and communication.

**Phase 8: Administrative dashboard**

Implement procedure management, staff management, resource scheduling, reports, and business settings.

**Phase 9: Notifications and PWA**

Implement notification adapters, service worker, manifest, offline functionality, and installation support.

**Phase 10: Security and testing**

Execute unit, integration, and E2E tests. Test access restrictions, clinical workflows, and scheduling integrity.

**Phase 11: Deployment readiness**

Finalize documentation, production configuration, administrator setup, and deployment preparation.

After every phase, report actual implementation results and continue to the next phase.

Do not substitute progress reporting for implementation.

---

# 21. FINAL ACCEPTANCE CRITERIA

The application is considered complete only when:

- HakimeRAD branding is implemented.
- All three procedure categories have dedicated request workflows.
- Procedure requests are stored in the database.
- Patients and referring clinicians can submit requests.
- Referral documents can be securely uploaded.
- Authorized clinicians can review requests.
- Clinical approval is separated from administrative scheduling.
- Approved procedures can be scheduled.
- Staff and resource conflicts are detected.
- Duplicate bookings are prevented.
- Urgent intussusception coordination has a dedicated workflow.
- Public intussusception time-slot booking is disabled.
- Authorized staff can manage appointments.
- Patients and referrers can track requests.
- Notifications work through configured providers.
- Administrative actions are audited.
- The PWA is installable where supported.
- Sensitive information is protected.
- Automated tests cover the critical workflows.
- The production build succeeds.
- Documentation is complete.

---

# 22. IMPORTANT IMPLEMENTATION RULES FOR THE CODING AGENT

You must:

1. Inspect the existing repository before modifying it.
2. Preserve useful existing functionality.
3. Implement complete working features.
4. Use real backend persistence.
5. Do not use hardcoded mock responses as production functionality.
6. Never fabricate clinical approvals.
7. Never allow public users to approve procedures.
8. Never confuse a request submission with a confirmed appointment.
9. Never permit double booking.
10. Never generate patient-specific medical preparation instructions autonomously.
11. Never allow the urgent intussusception workflow to depend exclusively on online booking.
12. Never expose patient information through public routes or insecure storage.
13. Maintain an auditable history of workflow changes.
14. Run tests after implementation.
15. Fix errors rather than suppressing them.
16. Never claim an integration works without testing it.
17. Keep external API credentials in environment variables.
18. Make business settings configurable.
19. Document all outstanding assumptions.
20. Continue implementing without unnecessary approval requests.

When credentials for an external integration are unavailable, implement the adapter architecture and test it using a suitable sandbox or mock provider. Clearly document what is still needed for production activation.

---

# 23. FINAL PRODUCT VISION

Build HakimeRAD IR Booking as a specialized digital service that connects patients, referring physicians, and the interventional radiology team.

The final application should provide three distinct but integrated procedural pathways:

**BIOPSY / FNAC**

A structured referral, imaging review, clinical approval, scheduling, specimen tracking, and follow-up workflow.

**ABSCESS DRAINAGE**

A structured referral, clinical priority review, resource coordination, procedure scheduling, and drainage follow-up workflow.

**HYDROSTATIC INTUSSUSCEPTION REDUCTION**

An urgent hospital-to-radiology coordination workflow with direct communication, clinical acknowledgement, and controlled scheduling.

All three pathways must operate within one secure platform with a unified user experience and administrative dashboard.

The product should be polished, practical, dependable, and suitable for real interventional radiology operations.

**Your first task is to inspect the current repository, report its existing architecture, and begin implementing the system according to this specification. Build the working application, not merely the design.**

## Important design decisions embedded in this prompt

[Radiologie interventionnelle : Thyroïde | Imagerie Duroc](https://images.openai.com/static-rsc-4/sxr5l8an-SJtBU4t_JMNh4KV2YXQG6eZ-BA60RRSqr2RC4keFAolU5MPYMDEx5nRFfrKiEc8Fl-YAvbiHxCvCqbqGQP6IPlzny9XmTmtZ9tKwMIOP8oSaPzLda46gptLqM_EpwIJSIaHOgb2NeihkbKySPrLAhm2HlVxefD2m4o?purpose=inline)

Biopsy / FNAC

Structured elective or expedited referral, imaging review, clinical approval, resource allocation, and specimen tracking.

[Trường hợp cần dẫn lưu áp xe và biến chứng có thể gặp phải](https://images.openai.com/static-rsc-4/Sto7ByvGGFjWMwpccUPhDUguQ88uV4JNIWXDc3myLfJtL4LFo1bicu011XbstYMioRWoTfgeGMYSAO3wJOyq6GEPOTdr5SxxwoJrkB6GoYS9sbhN3D2fh7Vv_8HXP3DGp68UZ9RvheOIdWk8gSFt-LGL4IRqbNO1SxNlnrpuy7Q?purpose=inline)

Abscess drainage

Priority assessment, imaging review, drainage resource coordination, appointment scheduling, and follow-up.

[Ileocolic Intussusception | Pediatric Radiology Reference Article | Pediatric Imaging | @pedsimaging](https://images.openai.com/static-rsc-4/Y7ynex-2HIm77c-aiBrq4E-1M-UTOqYcLFS3GAzv2aks0SI9SlaPY42lhVrVEre6IFWGOKSf8kkAEkk6R_s8cDdLdE6e2TuA7Zt1ghufnxZHw7HqrSwh2l9RGt4F0z95ibcDssAkrthGHJJdBlTYJ_-5Qy8-J1-IT86_wv-DIMY?purpose=inline)

Hydrostatic intussusception reduction

Urgent hospital-based referral and direct clinical coordination, not public self-service appointment booking.

My strongest recommendation: Make the referring physician portal a first-class feature, not an afterthought. For this particular service, it will be especially valuable to receive referrals, imaging reports, and supporting information directly from the referring facility.

The remaining operational details—actual procedure fees, staffing, contact numbers, facility details, and clinical preparation protocols—should be configurable by HakimeRAD administrators rather than invented by the coding agent.