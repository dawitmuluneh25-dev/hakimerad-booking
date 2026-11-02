import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { HeartHandshakeIcon, StethoscopeIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Logo from "@/components/logo.tsx";
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
import { SignInButton } from "@/components/ui/signin.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { api } from "@/convex/_generated/api.js";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type SelfServiceRole } from "@/convex/shared/roles.ts";
import type { Me } from "@/hooks/use-me.ts";
import { errorMessage } from "@/lib/errors.ts";
import { phoneSchema, requiredText } from "@/lib/form-schemas.ts";
import { cn } from "@/lib/utils.ts";
import FirstAdminCard from "./first-admin-card.tsx";

const CHOICES: Array<{ role: SelfServiceRole; icon: typeof StethoscopeIcon }> = [
  { role: "patient", icon: HeartHandshakeIcon },
  { role: "physician", icon: StethoscopeIcon },
];

const schema = z.object({
  role: z.enum(["patient", "physician"], { message: "Choose an account type" }),
  fullName: requiredText("Full name", 120),
  phone: phoneSchema,
});
type Values = z.infer<typeof schema>;

export default function Onboarding({ me }: { me: Me }) {
  const complete = useMutation(api.users.completeOnboarding);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: undefined, fullName: me.fullName, phone: me.phone },
  });

  const onSubmit = async (values: Values) => {
    setSubmitting(true);
    try {
      await complete(values);
      toast.success("Welcome to HakimeRAD IR Booking");
    } catch (error) {
      toast.error(errorMessage(error, "Could not save your details. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
        <Logo />
        <SignInButton variant="ghost" size="sm" />
      </header>
      <main id="main" className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:py-14">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Step 1 of 1</p>
          <h1 className="text-3xl font-semibold tracking-tight">Set up your account</h1>
          <p className="text-muted-foreground">
            Tell us how you will use HakimeRAD. Staff accounts are set up by an administrator.
          </p>
        </div>

        {!me.adminExists ? <FirstAdminCard /> : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 rounded-xl border bg-background p-6">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>I am a</FormLabel>
                  <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                    {CHOICES.map(({ role, icon: Icon }) => {
                      const selected = field.value === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(role)}
                          className={cn(
                            "flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary/60",
                            selected && "border-primary bg-primary/5 ring-2 ring-primary/30",
                          )}
                        >
                          <Icon className="size-5 text-primary" />
                          <span className="font-medium">{ROLE_LABELS[role]}</span>
                          <span className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Selam Tesfaye" autoComplete="name" {...field} />
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
                      <Input placeholder="+251 911 234 567" type="tel" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? <Spinner /> : null}
              Continue
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
