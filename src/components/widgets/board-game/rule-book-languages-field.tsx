import { RuleBookLanguage } from "@prisma/client";
import { Field } from "@/components/ui/field";
import { RULE_BOOK_LANGUAGE_LABELS } from "@/lib/ludothek/language-dependence";

const RULE_BOOK_LANGUAGE_OPTIONS = Object.values(RuleBookLanguage);

/**
 * Regelheft-Sprache(n) eines Exemplars, Mehrfachauswahl (#188) — eine
 * Schachtel enthält oft mehrere Regelhefte. Geteilt zwischen dem
 * Exemplar-Editor und "Weiteres Exemplar anlegen" (#203-Folge), damit die
 * Sprache(n) schon beim Anlegen erfasst werden können statt nur nachträglich.
 */
export function RuleBookLanguagesField({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: RuleBookLanguage[];
  onChange: (languages: RuleBookLanguage[]) => void;
}) {
  function toggle(language: RuleBookLanguage, checked: boolean) {
    onChange(
      checked ? [...value, language] : value.filter((l) => l !== language),
    );
  }

  return (
    <Field label="Regelheft-Sprache(n)">
      <div className="flex flex-wrap gap-3">
        {RULE_BOOK_LANGUAGE_OPTIONS.map((language) => (
          <label
            key={language}
            htmlFor={`${idPrefix}-rulebook-lang-${language}`}
            className="flex items-center gap-1.5 text-sm"
          >
            <input
              type="checkbox"
              id={`${idPrefix}-rulebook-lang-${language}`}
              checked={value.includes(language)}
              onChange={(event) => toggle(language, event.target.checked)}
            />
            {RULE_BOOK_LANGUAGE_LABELS[language]}
          </label>
        ))}
      </div>
    </Field>
  );
}
