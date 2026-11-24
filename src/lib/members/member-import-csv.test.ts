import { describe, expect, it } from "vitest";
import {
  decodeMemberCsv,
  groupByEmail,
  parseMemberImportCsv,
} from "./member-import-csv";

const HEADER = "mitglied_email;mitglied_name;mitglied_vorname;mitglied_nr";

function csv(...lines: string[]) {
  return [HEADER, ...lines].join("\r\n") + "\r\n";
}

/** Windows-1252 kodiert: ü = 0xFC, ö = 0xF6 — kein gültiges UTF-8. */
function windows1252(text: string): ArrayBuffer {
  const bytes = Uint8Array.from(text, (char) => {
    const code = char.charCodeAt(0);
    if (code > 0xff) throw new Error("not latin-1");
    return code;
  });
  return bytes.buffer;
}

describe("decodeMemberCsv", () => {
  it("decodes Windows-1252 umlauts", () => {
    expect(decodeMemberCsv(windows1252("Müller;Jörg"))).toBe("Müller;Jörg");
  });

  it("decodes UTF-8 and strips a BOM", () => {
    const buffer = new TextEncoder().encode(
      `${String.fromCharCode(0xfeff)}Müller;Jörg`,
    ).buffer;
    expect(decodeMemberCsv(buffer)).toBe("Müller;Jörg");
  });
});

describe("parseMemberImportCsv", () => {
  it("parses member number, trims names and lowercases the email (CRLF)", () => {
    const result = parseMemberImportCsv(
      csv(" Erika@Example.com ;Musterfrau  ;Erika ;OEMe.V.076"),
    );

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        line: 2,
        memberNumber: 76,
        firstName: "Erika",
        lastName: "Musterfrau",
        email: "erika@example.com",
      },
    ]);
  });

  it("parses a Windows-1252 file end to end", () => {
    const text = decodeMemberCsv(
      windows1252(csv("jo@example.com;Müller;Jörg;OEMe.V.001")),
    );

    expect(parseMemberImportCsv(text).rows[0]).toMatchObject({
      lastName: "Müller",
      firstName: "Jörg",
    });
  });

  it("keeps an empty email as null", () => {
    const result = parseMemberImportCsv(csv(";Muster;Mia;OEMe.V.002"));

    expect(result.rows[0].email).toBeNull();
  });

  it("accepts a header in different case and with surrounding spaces", () => {
    const text = [
      HEADER.toUpperCase().replace(/;/g, " ; "),
      ";A;B;OEMe.V.3",
    ].join("\n");

    expect(parseMemberImportCsv(text).rows).toHaveLength(1);
  });

  it("rejects a wrong header in line 1 and imports nothing", () => {
    const result = parseMemberImportCsv(
      "email;name;vorname;nr\na@example.com;A;B;OEMe.V.1\n",
    );

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([expect.objectContaining({ line: 1 })]);
  });

  it("marks an invalid member number or email, keeps the other rows", () => {
    const result = parseMemberImportCsv(
      csv(
        "a@example.com;A;A;76",
        "kein-at;B;B;OEMe.V.2",
        "c@example.com;C;C;OEMe.V.3",
      ),
    );

    expect(result.rows.map((row) => row.line)).toEqual([4]);
    expect(result.errors).toEqual([
      { line: 2, message: "Zeile 2: mitglied_nr ungültig." },
      { line: 3, message: "Zeile 3: mitglied_email ungültig." },
    ]);
  });

  it("marks every row whose member number occurs more than once", () => {
    const result = parseMemberImportCsv(
      csv(
        "a@example.com;A;A;OEMe.V.5",
        "b@example.com;B;B;OEMe.V.6",
        "c@example.com;C;C;OEMe.V.005",
      ),
    );

    expect(result.rows.map((row) => row.line)).toEqual([3]);
    expect(result.errors.map((error) => error.line)).toEqual([2, 4]);
  });

  it("never puts row contents into messages", () => {
    const result = parseMemberImportCsv(csv("geheim;Geheim;Geheim;geheim"));

    expect(JSON.stringify(result.errors)).not.toMatch(/geheim/i);
  });

  it("skips blank lines but keeps the file's line numbers", () => {
    const result = parseMemberImportCsv(
      [HEADER, "", "a@example.com;A;A;OEMe.V.1", ";;;"].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.rows.map((row) => row.line)).toEqual([3]);
  });
});

describe("groupByEmail", () => {
  it("groups rows with the same email case-insensitively, only from two rows", () => {
    const { rows } = parseMemberImportCsv(
      csv(
        "Fam@Example.com;M;Mutter;OEMe.V.1",
        "fam@example.com;M;Kind;OEMe.V.2",
        "solo@example.com;S;Solo;OEMe.V.3",
        ";K;Ohne;OEMe.V.4",
        ";K;Ohne2;OEMe.V.5",
      ),
    );

    const groups = groupByEmail(rows);

    expect([...groups.keys()]).toEqual(["fam@example.com"]);
    expect(groups.get("fam@example.com")?.map((row) => row.line)).toEqual([
      2, 3,
    ]);
  });
});
