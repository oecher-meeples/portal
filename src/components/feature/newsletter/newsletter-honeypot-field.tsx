import { Label } from "@/components/ui/label";

/**
 * Off-screen, not display:none, so naive bots that skip hidden fields still
 * fill it in. Shared by every public newsletter signup form.
 */
export function NewsletterHoneypotField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute top-auto -left-[9999px] h-0 w-0 overflow-hidden"
    >
      <Label htmlFor="newsletter-website">Website</Label>
      <input
        id="newsletter-website"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
