import { notFound } from "next/navigation";
import { LEGAL_DOCS } from "@/data/downloads";
import { LEGAL_CONTENT } from "@/data/legal";
import { LegalDocView } from "@/components/feature/rechtliches/legal-doc-view";

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

  return <LegalDocView doc={doc} sections={sections} />;
}
