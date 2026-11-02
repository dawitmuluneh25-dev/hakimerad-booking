import type { Control, FieldPathByValue } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { ReferralFormValues } from "../-lib/referral-schema.ts";

type StringPath = FieldPathByValue<ReferralFormValues, string>;

export function TextField({
  control,
  name,
  label,
  placeholder,
  type,
  multiline,
  optional,
  className,
}: {
  control: Control<ReferralFormValues>;
  name: StringPath;
  label: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  optional?: boolean;
  className?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
          </FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea rows={3} placeholder={placeholder} {...field} />
            ) : (
              <Input type={type} placeholder={placeholder} {...field} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SelectField({
  control,
  name,
  label,
  options,
  placeholder,
  className,
}: {
  control: Control<ReferralFormValues>;
  name: StringPath;
  label: string;
  options: Record<string, string>;
  placeholder?: string;
  className?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <NativeSelect className="w-full" {...field}>
              {placeholder ? (
                <NativeSelectOption value="" disabled>
                  {placeholder}
                </NativeSelectOption>
              ) : null}
              {Object.entries(options).map(([value, text]) => (
                <NativeSelectOption key={value} value={value}>
                  {text}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-background p-5 sm:p-6">
      <div className="flex gap-4 pb-5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
          {step}
        </span>
        <div className="space-y-1">
          <h2 className="font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
