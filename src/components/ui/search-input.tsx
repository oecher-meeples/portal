import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/**
 * Suchfeld mit Lupe-Icon links und einem "×"-Button rechts zum Zurücksetzen,
 * sobald ein Wert eingetragen ist — Duplikat aus `mitglieder-table.tsx` und
 * `vereinsmitglieder-table.tsx` extrahiert (identisches Icon+Input-Markup,
 * beide ohne Möglichkeit die Eingabe zu leeren). Layout/Icon-Klassen analog
 * `TextField`s `onClear`-Variante (`ui/field.tsx`).
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        placeholder={placeholder}
        className={cn("pl-9", value && "pr-7")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Suche zurücksetzen"
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1.5 flex items-center"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
