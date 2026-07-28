import { requireMember } from "@/lib/session";
import { HELFER_EVENT, HELFER_SHIFTS } from "@/data/helferplan";
import { HelferMockView } from "@/components/feature/helfer/helfer-mock-view";

export default async function HelferPage() {
  await requireMember();

  return (
    <HelferMockView eventTitle={HELFER_EVENT.title} shifts={HELFER_SHIFTS} />
  );
}
