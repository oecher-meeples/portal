import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isValidEmail } from "@/lib/utils/validate-email";

/** Email field with inline format validation, shared by every newsletter signup form. */
export function NewsletterEmailField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const invalid = value !== "" && !isValidEmail(value);

  return (
    <Field
      label="E-Mail-Adresse"
      htmlFor="newsletter-email"
      hint={
        invalid && (
          <span className="text-destructive">
            Bitte eine gültige E-Mail-Adresse angeben.
          </span>
        )
      }
    >
      <Input
        id="newsletter-email"
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        required
      />
    </Field>
  );
}
