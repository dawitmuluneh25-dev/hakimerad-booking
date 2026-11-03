import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, useMutation } from "@/lib/api.ts";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import AppPage from "@/components/app-page.tsx";
import PhysicianStatusBadge from "@/components/physician-status-badge.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
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
import { ROLE_LABELS } from "@/shared/roles.ts";
import { useMe, type Me } from "@/hooks/use-me.ts";
import { errorMessage } from "@/lib/errors.ts";
import { phoneSchema, requiredText } from "@/lib/form-schemas.ts";
import PhysicianProfileForm from "./-components/physician-profile-form.tsx";

export const Route = createFileRoute("/_app/account")({
  head: () => ({ meta: [{ title: "My account | HakimeRAD IR Booking" }] }),
  component: AccountPage,
});

function AccountPage() {
  const me = useMe();
  if (!me) return null;
  return (
    <AppPage title="My account" description={me.email}>
      <div className="space-y-6">
        <ContactCard me={me} />
        {me.role === "physician" ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle>Professional profile</CardTitle>
                {me.physicianProfile ? <PhysicianStatusBadge status={me.physicianProfile.status} /> : null}
              </div>
              <CardDescription>Used to verify your referral privileges.</CardDescription>
            </CardHeader>
            <CardContent>
              {me.physicianProfile?.status === "suspended" ? (
                <p className="text-sm text-muted-foreground">Your profile is suspended. Please contact HakimeRAD.</p>
              ) : (
                <PhysicianProfileForm
                  key={me.physicianProfile?.submittedAt ?? "new"}
                  profile={me.physicianProfile}
                  defaultName={me.fullName}
                  defaultPhone={me.phone}
                />
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppPage>
  );
}

const contactSchema = z.object({
  fullName: requiredText("Full name", 120),
  phone: phoneSchema,
});
type ContactValues = z.infer<typeof contactSchema>;

function ContactCard({ me }: { me: Me }) {
  const update = useMutation(api.users.updateContactDetails);
  const [pending, setPending] = useState(false);
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { fullName: me.fullName, phone: me.phone },
  });

  const onSubmit = async (values: ContactValues) => {
    setPending(true);
    try {
      await update(values);
      toast.success("Details saved");
    } catch (error) {
      toast.error(errorMessage(error, "Could not save your details."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Contact details</CardTitle>
          {me.role ? <Badge variant="secondary">{ROLE_LABELS[me.role]}</Badge> : null}
        </div>
        <CardDescription>To change your account type, contact an administrator.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Selam Tesfaye" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+251 911 234 567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Save
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
