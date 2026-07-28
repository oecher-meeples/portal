import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { LFG_REQUESTS, getLfgById } from "@/data/lfg";
import { LfgDetailMockView } from "@/components/feature/lfg/lfg-detail-mock-view";

export function generateStaticParams() {
  return LFG_REQUESTS.map((request) => ({ id: request.id }));
}

export default async function LfgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMember();
  const { id } = await params;
  const request = getLfgById(id);
  if (!request) notFound();

  return <LfgDetailMockView request={request} />;
}
