import { RuleBookLanguage } from "@prisma/client";
import { TextField, Field } from "@/components/ui/field";
import { RULE_BOOK_LANGUAGE_LABELS } from "@/lib/ludothek/language-dependence";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

const RULE_BOOK_LANGUAGE_OPTIONS = Object.values(RuleBookLanguage);

/**
 * Per-copy field(s) — Mängelvermerk/condition und die Regelheft-Sprache(n)
 * (#188, Mehrfachauswahl da eine Schachtel oft mehrere Regelhefte enthält).
 * Split out from the title fields because it belongs to one physical
 * `GameCopy`, not the shared title (see ADR 0008).
 */
export function EditBoardGameExemplar({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
}) {
  function toggleLanguage(language: RuleBookLanguage, checked: boolean) {
    const next = checked
      ? [...values.ruleBookLanguages, language]
      : values.ruleBookLanguages.filter((l) => l !== language);
    onChange({ ruleBookLanguages: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <TextField
        id={`${idPrefix}-condition`}
        label="Mängelvermerk"
        value={values.condition}
        onChange={(event) => onChange({ condition: event.target.value })}
      />
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
                checked={values.ruleBookLanguages.includes(language)}
                onChange={(event) =>
                  toggleLanguage(language, event.target.checked)
                }
              />
              {RULE_BOOK_LANGUAGE_LABELS[language]}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
