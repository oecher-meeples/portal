import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Label-above-control wrapper — the form row used throughout the app. */
export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

/** Field + Input in one go, since that is the overwhelmingly common case. */
export function TextField({
  id,
  label,
  hint,
  fieldClassName,
  ...inputProps
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  fieldClassName?: string;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint} className={fieldClassName}>
      <Input id={id} {...inputProps} />
    </Field>
  );
}

/** Field + Textarea. */
export function TextAreaField({
  id,
  label,
  hint,
  fieldClassName,
  ...textareaProps
}: React.ComponentProps<typeof Textarea> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  fieldClassName?: string;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint} className={fieldClassName}>
      <Textarea id={id} {...textareaProps} />
    </Field>
  );
}
