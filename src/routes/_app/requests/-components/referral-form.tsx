import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { api, useMutation } from "@/lib/api.ts";
import { useOnlineStatus } from "@/hooks/use-online.ts";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  MODALITY_LABELS,
  REQUESTED_METHODS,
  SEX_LABELS,
  URGENCY_LABELS,
  YES_NO_UNKNOWN_LABELS,
  type ReferralProcedure,
} from "@/shared/referrals.ts";
import { useDocumentUploads } from "@/hooks/use-document-uploads.ts";
import type { Me } from "@/hooks/use-me.ts";
import { errorMessage } from "@/lib/errors.ts";
import {
  needsGuardian,
  referralFormSchema,
  type ReferralFormValues,
} from "../-lib/referral-schema.ts";
import DocumentPicker from "./document-picker.tsx";
import { FormSection, SelectField, TextField } from "./form-fields.tsx";

const COPY: Record<
  ReferralProcedure,
  { site: string; sitePlaceholder: string; indicationPlaceholder: string }
> = {
  "biopsy-fnac": {
    site: "Target area for sampling",
    sitePlaceholder: "Right thyroid lobe nodule",
    indicationPlaceholder:
      "Reason for referral and the clinical question to answer",
  },
  "abscess-drainage": {
    site: "Location of the collection",
    sitePlaceholder: "Right subphrenic collection",
    indicationPlaceholder: "Reason for referral, symptoms and relevant history",
  },
};

const blank = (s: string) => s.trim() || undefined;

export default function ReferralForm({
  procedure,
  me,
}: {
  procedure: ReferralProcedure;
  me: Me;
}) {
  const isPhysician = me.role === "physician";
  const submit = useMutation(api.referrals.submit);
  const online = useOnlineStatus();
  const uploads = useDocumentUploads();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const copy = COPY[procedure];

  const form = useForm<ReferralFormValues>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      forDependent: false,
      patient: {
        fullName: isPhysician ? "" : me.fullName,
        dateOfBirth: "",
        sex: "female",
        phone: isPhysician ? "" : me.phone,
        email: isPhysician ? "" : me.email,
        address: "",
        idNumber: "",
      },
      guardian: { fullName: "", relationship: "", phone: "" },
      referrer: { name: "", facility: "", phone: "" },
      clinical: {
        indication: "",
        site: "",
        requestedMethod: "unsure",
        urgency: "routine",
        previousBiopsy: "",
        bloodThinners: "unknown",
        allergies: "",
        otherConditions: "",
      },
      imaging: {
        modality: "ultrasound",
        studyDate: "",
        facility: "",
        pacsReference: "",
        findings: "",
      },
      needsReferrer: !isPhysician,
      confirmNotAppointment: false,
    },
  });

  const forDependent = useWatch({
    control: form.control,
    name: "forDependent",
  });
  const dateOfBirth = useWatch({
    control: form.control,
    name: "patient.dateOfBirth",
  });
  const showGuardian = needsGuardian(dateOfBirth, forDependent);

  // A patient filling in for a child or relative becomes the guardian, not the patient.
  const toggleDependent = (checked: boolean) => {
    form.setValue("forDependent", checked);
    if (checked) {
      form.setValue("patient.fullName", "");
      form.setValue("patient.phone", "");
      form.setValue("patient.email", "");
      form.setValue("guardian.fullName", me.fullName);
      form.setValue("guardian.phone", me.phone);
    } else {
      form.setValue("patient.fullName", me.fullName);
      form.setValue("patient.phone", me.phone);
      form.setValue("patient.email", me.email);
    }
  };

  const onSubmit = async (values: ReferralFormValues) => {
    if (!online) {
      toast.error(
        "You are offline. Reconnect before submitting — nothing is stored on this device.",
      );
      return;
    }
    if (uploads.isUploading) {
      toast.error("Please wait for uploads to finish.");
      return;
    }
    setSaving(true);
    try {
      const { patient, guardian, referrer, clinical, imaging } = values;
      const { reference } = await submit({
        procedure,
        forDependent: values.forDependent,
        patient: {
          fullName: patient.fullName,
          dateOfBirth: patient.dateOfBirth,
          sex: patient.sex,
          phone: patient.phone,
          email: blank(patient.email),
          address: blank(patient.address),
          idNumber: blank(patient.idNumber),
        },
        guardian: showGuardian ? guardian : undefined,
        referrer: isPhysician
          ? undefined
          : {
              name: referrer.name,
              facility: referrer.facility,
              phone: blank(referrer.phone),
            },
        clinical: {
          ...clinical,
          previousBiopsy: blank(clinical.previousBiopsy),
          allergies: blank(clinical.allergies),
          otherConditions: blank(clinical.otherConditions),
        },
        imaging: {
          modality: imaging.modality,
          studyDate: blank(imaging.studyDate),
          facility: blank(imaging.facility),
          pacsReference: blank(imaging.pacsReference),
          findings: blank(imaging.findings),
        },
        documents: uploads.ready,
        confirmNotAppointment: values.confirmNotAppointment,
      });
      uploads.clear();
      toast.success(`Request ${reference} submitted`);
      await navigate({
        to: "/requests/$reference",
        params: { reference },
        search: { submitted: true },
      });
    } catch (error) {
      toast.error(
        errorMessage(error, "Could not submit the request. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  };

  const { control } = form;
  let step = 1;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <FormSection
          step={step++}
          title="Patient"
          description={
            isPhysician
              ? "The patient you are referring."
              : "Who is this request for?"
          }
        >
          {!isPhysician ? (
            <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
              <Switch
                id="for-dependent"
                checked={forDependent}
                onCheckedChange={toggleDependent}
              />
              <Label
                htmlFor="for-dependent"
                className="cursor-pointer text-sm font-normal"
              >
                I am requesting for my child or someone I care for
              </Label>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="patient.fullName"
              label="Full name"
              placeholder="Selam Tesfaye"
            />
            <TextField
              control={control}
              name="patient.dateOfBirth"
              label="Date of birth"
              type="date"
            />
            <SelectField
              control={control}
              name="patient.sex"
              label="Sex"
              options={SEX_LABELS}
            />
            <TextField
              control={control}
              name="patient.phone"
              label="Phone"
              type="tel"
              placeholder="+251 911 234 567"
            />
            <TextField
              control={control}
              name="patient.email"
              label="Email"
              type="email"
              placeholder="selam@gmail.com"
              optional
            />
            <TextField
              control={control}
              name="patient.idNumber"
              label="ID or medical record number"
              placeholder="MRN-00421"
              optional
            />
          </div>
          <TextField
            control={control}
            name="patient.address"
            label="Address"
            placeholder="Sub-city, city"
            optional
          />
        </FormSection>

        {showGuardian ? (
          <FormSection
            step={step++}
            title="Parent or guardian"
            description="Required for patients under 18 or when requesting on someone's behalf."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                control={control}
                name="guardian.fullName"
                label="Full name"
                placeholder="Hana Bekele"
              />
              <TextField
                control={control}
                name="guardian.relationship"
                label="Relationship"
                placeholder="Mother"
              />
              <TextField
                control={control}
                name="guardian.phone"
                label="Phone"
                type="tel"
                placeholder="+251 911 234 567"
              />
            </div>
          </FormSection>
        ) : null}

        <FormSection
          step={step++}
          title="Referring doctor"
          description={
            isPhysician
              ? undefined
              : "The doctor who recommended this procedure."
          }
        >
          {isPhysician && me.physicianProfile ? (
            <div className="rounded-lg bg-muted/60 p-3 text-sm">
              <p className="font-medium">{me.physicianProfile.fullName}</p>
              <p className="text-muted-foreground">
                {me.physicianProfile.facilityName} {"·"}{" "}
                {me.physicianProfile.phone}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                control={control}
                name="referrer.name"
                label="Doctor's name"
                placeholder="Dr. Hana Girma"
              />
              <TextField
                control={control}
                name="referrer.facility"
                label="Hospital or clinic"
                placeholder="Bole Clinic"
              />
              <TextField
                control={control}
                name="referrer.phone"
                label="Phone"
                type="tel"
                placeholder="+251 911 234 567"
                optional
              />
            </div>
          )}
        </FormSection>

        <FormSection
          step={step++}
          title="Clinical details"
          description="The interventional radiologist uses these to review the request. Final decisions are made by the clinical team."
        >
          <TextField
            control={control}
            name="clinical.indication"
            label="Clinical indication"
            placeholder={copy.indicationPlaceholder}
            multiline
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="clinical.site"
              label={copy.site}
              placeholder={copy.sitePlaceholder}
            />
            <SelectField
              control={control}
              name="clinical.requestedMethod"
              label="Requested procedure type"
              options={REQUESTED_METHODS[procedure]}
            />
            <SelectField
              control={control}
              name="clinical.urgency"
              label="Requested urgency"
              options={URGENCY_LABELS}
            />
            <SelectField
              control={control}
              name="clinical.bloodThinners"
              label="Taking blood thinners?"
              options={YES_NO_UNKNOWN_LABELS}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Requested urgency is reviewed by a clinician and does not guarantee
            priority. Do not stop or change any medication unless your doctor
            tells you to.
          </p>
          {procedure === "biopsy-fnac" ? (
            <TextField
              control={control}
              name="clinical.previousBiopsy"
              label="Previous biopsy history"
              placeholder="FNAC of the same nodule in 2024, non-diagnostic"
              multiline
              optional
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="clinical.allergies"
              label="Allergies"
              placeholder="Iodinated contrast"
              optional
            />
            <TextField
              control={control}
              name="clinical.otherConditions"
              label="Other relevant conditions"
              placeholder="Type 2 diabetes"
              optional
            />
          </div>
        </FormSection>

        <FormSection
          step={step++}
          title="Imaging"
          description="The most recent imaging that shows the area of concern."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              control={control}
              name="imaging.modality"
              label="Imaging type"
              options={MODALITY_LABELS}
            />
            <TextField
              control={control}
              name="imaging.studyDate"
              label="Imaging date"
              type="date"
              optional
            />
            <TextField
              control={control}
              name="imaging.facility"
              label="Where it was done"
              placeholder="Tikur Anbessa Hospital"
              optional
            />
            <TextField
              control={control}
              name="imaging.pacsReference"
              label="PACS or accession number"
              placeholder="ACC-55512"
              optional
            />
          </div>
          <TextField
            control={control}
            name="imaging.findings"
            label="Key findings"
            placeholder="Summary from the imaging report"
            multiline
            optional
          />
        </FormSection>

        <FormSection
          step={step}
          title="Documents"
          description="Referral letter, imaging reports and relevant lab results."
        >
          <DocumentPicker uploads={uploads} />
        </FormSection>

        <section className="space-y-5 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <FormField
            control={control}
            name="confirmNotAppointment"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-start gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      className="mt-0.5"
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer text-sm leading-relaxed font-normal">
                    I understand this is a request for clinical review, not a
                    confirmed appointment. HakimeRAD will contact me after the
                    request is reviewed.
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={saving || uploads.isUploading || !online}
            >
              {saving ? <Spinner /> : null}
              Submit request
            </Button>
            {uploads.isUploading ? (
              <span className="text-sm text-muted-foreground">
                Waiting for uploads to finish
              </span>
            ) : null}
          </div>
        </section>
      </form>
    </Form>
  );
}
