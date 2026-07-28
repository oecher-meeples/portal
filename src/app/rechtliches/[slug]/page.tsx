import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { LEGAL_DOCS } from "@/data/downloads";
import { LEGAL_CONTENT } from "@/data/legal";

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ slug: doc.slug }));
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  const sections = LEGAL_CONTENT[slug];
  if (!doc || !sections) notFound();

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
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
