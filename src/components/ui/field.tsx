import type { ReactNode } from "react";
import { X } from "lucide-react";
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

/** Field + Input in one go, since that is the overwhelmingly common case.
 * Pass `onClear` to show an "×"-Button while the field has a value, statt
 * dich auf die (browser- und typabhängige) native Clear-Anzeige zu verlassen. */
export function TextField({
  id,
  label,
  hint,
  fieldClassName,
  onClear,
  ...inputProps
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  fieldClassName?: string;
  onClear?: () => void;
}) {
  const showClear = Boolean(onClear && inputProps.value);
  return (
    <Field label={label} htmlFor={id} hint={hint} className={fieldClassName}>
      <div className="relative">
        <Input
          id={id}
          {...inputProps}
          className={cn(showClear && "pr-7", inputProps.className)}
        />
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Eingabe löschen"
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1.5 flex items-center"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
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
