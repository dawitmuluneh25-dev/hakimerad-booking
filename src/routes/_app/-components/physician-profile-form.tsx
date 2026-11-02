import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors.ts";
import { phoneSchema, requiredText } from "@/lib/form-schemas.ts";

const schema = z.object({
  fullName: requiredText("Full name", 120),
  registrationNumber: requiredText("Registration number", 60),
  licensingBody: requiredText("Licensing body", 120),
  specialty: requiredText("Specialty", 120),
  facilityName: requiredText("Facility name", 160),
  facilityAddress: requiredText("Facility address", 300),
  phone: phoneSchema,
});
type Values = z.infer<typeof schema>;

const FIELDS: Array<{ name: Exclude<keyof Values, "facilityAddress">; label: string; placeholder: string; type?: string }> = [
  { name: "fullName", label: "Full name (as registered)", placeholder: "Dr. Abebe Kebede" },
  { name: "registrationNumber", label: "Medical registration number", placeholder: "MD-012345" },
  { name: "licensingBody", label: "Licensing body", placeholder: "Ministry of Health" },
  { name: "specialty", label: "Specialty", placeholder: "Internal medicine" },
  { name: "facilityName", label: "Hospital or facility", placeholder: "St. Mary General Hospital" },
  { name: "phone", label: "Work phone", placeholder: "+251 911 234 567", type: "tel" },
];

export default function PhysicianProfileForm({
  profile,
  defaultName,
  defaultPhone,
  onDone,
}: {
  profile: Doc<"physicianProfiles"> | null;
  defaultName: string;
  defaultPhone: string;
  onDone?: () => void;
}) {
  const submit = useMutation(api.users.submitPhysicianProfile);
  const [pending, setPending] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile?.fullName ?? defaultName,
      registrationNumber: profile?.registrationNumber ?? "",
      licensingBody: profile?.licensingBody ?? "",
      specialty: profile?.specialty ?? "",
      facilityName: profile?.facilityName ?? "",
      facilityAddress: profile?.facilityAddress ?? "",
      phone: profile?.phone ?? defaultPhone,
    },
  });

  const onSubmit = async (values: Values) => {
    setPending(true);
    try {
      await submit(values);
      toast.success("Profile sent for verification");
      onDone?.();
    } catch (error) {
      toast.error(errorMessage(error, "Could not submit your profile."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    <Input placeholder={f.placeholder} type={f.type} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
        <FormField
          control={form.control}
          name="facilityAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facility address</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Street, city, region" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground">
          An administrator checks these details before you can submit referrals. Editing them later sends your profile back for verification.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {profile ? "Resubmit for verification" : "Submit for verification"}
        </Button>
      </form>
    </Form>
  );
}
