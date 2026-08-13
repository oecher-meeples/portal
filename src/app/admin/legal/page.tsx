import { requirePermission } from "@/lib/auth/permissions";
import { listAllLegalDocumentsForAdmin } from "@/lib/legal/legal";
import type { LegalSection } from "@/data/legal";
import { AdminLegalView } from "@/components/feature/admin-legal/admin-legal-view";

export default async function AdminLegalPage() {
  await requirePermission("legal:manage");

  const documents = await listAllLegalDocumentsForAdmin();

  return (
    <AdminLegalView
      documents={documents.map((doc) => ({
        slug: doc.slug,
        title: doc.title,
        sections: doc.sections as LegalSection[],
        pdfFileUrl: doc.pdfFileUrl,
      }))}
    />
  );
}
