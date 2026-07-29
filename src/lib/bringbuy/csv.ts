const EXPECTED_HEADER = ["title", "price", "description"];

export type ParsedFleaMarketCsvItem = {
  title: string;
  priceEuros: number;
  description?: string;
};

export type FleaMarketCsvError = {
  line: number;
  message: string;
};

export type ParsedFleaMarketCsv = {
  items: ParsedFleaMarketCsvItem[];
  errors: FleaMarketCsvError[];
};

/**
 * Splits a single CSV line on commas, honouring simple double-quote-escaped
 * fields (so a description containing a comma can be quoted, e.g.
 * `"Catan, Seefahrer"`). Deliberately small and hand-written — no CSV library,
 * same style as the EAN/ICS parsers in `src/lib/inventory/ean.ts` and
 * `src/lib/calendar.ts`.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      fields.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

/**
 * Parses the flea market bulk-import CSV format (`title,price,description`).
 * `description` is optional. An invalid price is a per-row error, collected
 * alongside the still-valid rows rather than aborting the whole import — one
 * bad row must not block the good ones.
 */
export function parseFleaMarketCsv(raw: string): ParsedFleaMarketCsv {
  const lines = raw
    .split(/\r\n|\n/)
    .filter((line, index, all) => line.trim() !== "" || index < all.length - 1);

  // Drop a single trailing blank line left by editors/exports, but keep an
  // otherwise-empty file (no rows at all) working below.
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  if (lines.length === 0) {
    return { items: [], errors: [] };
  }

  const header = splitCsvLine(lines[0]).map((field) => field.toLowerCase());
  const headerMatches =
    header.length === EXPECTED_HEADER.length &&
    header.every((field, index) => field === EXPECTED_HEADER[index]);

  if (!headerMatches) {
    return {
      items: [],
      errors: [
        {
          line: 1,
          message:
            "Ungültige Kopfzeile. Erwartet wird: title,price,description",
        },
      ],
    };
  }

  const items: ParsedFleaMarketCsvItem[] = [];
  const errors: FleaMarketCsvError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];
    if (rawLine.trim() === "") continue;

    const [title, price, description] = splitCsvLine(rawLine);

    if (!title || !title.trim()) {
      errors.push({
        line: lineNumber,
        message: `Fehler in Zeile ${lineNumber}: Titel fehlt`,
      });
      continue;
    }

    const priceEuros = Number(price);
    if (!price || !Number.isInteger(priceEuros) || priceEuros < 0) {
      errors.push({
        line: lineNumber,
        message: `Fehler in Zeile ${lineNumber}: Preis ungültig`,
      });
      continue;
    }

    items.push({
      title: title.trim(),
      priceEuros,
      description: description?.trim() ? description.trim() : undefined,
    });
  }

  return { items, errors };
}
