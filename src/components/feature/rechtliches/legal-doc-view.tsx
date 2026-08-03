import { PageHeading } from "@/components/ui/page-heading";
import type { LegalDoc } from "@/data/downloads";
import type { LegalSection } from "@/data/legal";

type LegalDocViewProps = {
  doc: LegalDoc;
  sections: LegalSection[];
};

export function LegalDocView({ doc, sections }: LegalDocViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Rechtliches" title={doc.title} />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-1 text-sm lg:sticky lg:top-24 lg:self-start">
          <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
            Inhaltsverzeichnis
          </p>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded px-2 py-1"
            >
              {section.heading}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-serif text-xl font-bold">
                {section.heading}
              </h2>
              <div className="text-muted-foreground mt-2 flex flex-col gap-3">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                {section.links?.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-primary hover:underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
