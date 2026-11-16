import {
  BG,
  CN,
  CZ,
  DK,
  EE,
  ES,
  FI,
  FR,
  GB,
  GR,
  HR,
  HU,
  IL,
  IT,
  JP,
  KR,
  LT,
  LV,
  NL,
  NO,
  PL,
  PT,
  RO,
  RS,
  RU,
  SE,
  SI,
  SK,
  TH,
  TR,
  UA,
  VN,
} from "country-flag-icons/react/3x2";
import { editionFlagCountry } from "@/lib/ludothek/edition-language";

const FLAGS: Record<
  string,
  (props: { className?: string }) => React.JSX.Element
> = {
  BG,
  CN,
  CZ,
  DK,
  EE,
  ES,
  FI,
  FR,
  GB,
  GR,
  HR,
  HU,
  IL,
  IT,
  JP,
  KR,
  LT,
  LV,
  NL,
  NO,
  PL,
  PT,
  RO,
  RS,
  RU,
  SE,
  SI,
  SK,
  TH,
  TR,
  UA,
  VN,
};

/** Kleine Länderflagge hinter dem Spielnamen, wenn die Vereinsedition nicht
 * deutsch ist. SVG statt Emoji — Windows rendert Flaggen-Emojis nur als
 * Buchstaben. Rendert nichts bei deutscher/unbekannter Edition. */
export function EditionFlag({
  languages,
  className,
}: {
  languages: string[];
  className?: string;
}) {
  const country = editionFlagCountry(languages);
  const Flag = country ? FLAGS[country] : undefined;
  if (!Flag) return null;

  return (
    <span
      role="img"
      aria-label={`Edition: ${languages.join(", ")}`}
      title={`Edition: ${languages.join(", ")}`}
      className={className}
    >
      <Flag className="inline-block h-3.5 w-auto rounded-[2px] align-baseline" />
    </span>
  );
}
