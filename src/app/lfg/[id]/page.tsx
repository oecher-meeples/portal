import { notFound } from "next/navigation";
import { RoleGate } from "@/components/shared/role-gate";
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import { LFG_REQUESTS, getLfgById } from "@/data/lfg";

export function generateStaticParams() {
  return LFG_REQUESTS.map((request) => ({ id: request.id }));
}

export default async function LfgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = getLfgById(id);
  if (!request) notFound();

  const isFull = request.status === "voll";

  return (
    <RoleGate minRole="mitglied">
      <div className="flex max-w-2xl flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold">{request.title}</h1>
            <p className="text-muted-foreground text-sm">
              {request.date}
              {request.location && ` · ${request.location}`}
              {request.game && ` · ${request.game}`}
            </p>
          </div>
          <StatusPill
            label={isFull ? "Gesuch voll" : "Offen"}
            tone={isFull ? "negative" : "positive"}
          />
        </div>

        <p className="leading-relaxed">{request.description}</p>

        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">
            Teilnehmende ({request.participants.length}/
            {request.maxParticipants})
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {request.participants.map((participant) => (
              <li
                key={participant.name}
                className="flex items-center gap-2.5 text-sm"
              >
                <span className="bg-muted flex size-8 items-center justify-center rounded-full font-semibold">
                  {participant.initial}
                </span>
                {participant.name}
                {participant.name === request.creator.name && (
                  <span className="text-muted-foreground text-xs">
                    (Ersteller)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <Button disabled={isFull}>
            {isFull ? "Gesuch voll" : "Beitreten"}
          </Button>
          <Button variant="outline">Verlassen</Button>
        </div>
      </div>
    </RoleGate>
  );
}
