import { DOWNLOADS, LEGAL_DOCS } from "@/data/downloads";
import { DownloadsView } from "@/components/feature/downloads/downloads-view";

export default function DownloadsPage() {
  return <DownloadsView downloads={DOWNLOADS} legalDocs={LEGAL_DOCS} />;
}
