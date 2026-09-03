import fs from "node:fs";
import path from "node:path";
import { PageHeading } from "@/components/ui/page-heading";
import { PageContainer } from "@/components/ui/page-container";
import { MarkdownContent } from "@/components/ui/markdown-content";

/** (#117) Lesbares Rendering von `THIRD-PARTY-LICENSES.md` — bewusst
 * außerhalb von `app/rechtliches/[slug]`: die Datei ist vollautomatisch
 * generiert (`pnpm run licenses:generate`), kein `LegalDocument` und nicht
 * über den Rechtliches-Editor bearbeitbar. Die rohe Datei bleibt unter
 * `/THIRD-PARTY-LICENSES.md` weiterhin erreichbar — diese Route ist ein
 * zusätzlicher, lesbarer Einstieg, kein Ersatz. */
export default function VerwendeteBibliothekenPage() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "THIRD-PARTY-LICENSES.md",
  );
  const content = fs.readFileSync(filePath, "utf-8");

  return (
    <PageContainer className="gap-6">
      <PageHeading eyebrow="Rechtliches" title="Verwendete Bibliotheken" />
      <MarkdownContent body={content} />
    </PageContainer>
  );
}
