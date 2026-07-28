import { requireMember } from "@/lib/session";
import { ScanMockView } from "@/components/feature/scan/scan-mock-view";

export default async function ScanPage() {
  await requireMember();

  return <ScanMockView />;
}
