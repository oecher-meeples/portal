import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { StatusPill, type StatusTone } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import {
  GAMES,
  STATUS_LABELS,
  getGameBySlug,
  type GameStatus,
} from "@/data/games";

export function generateStaticParams() {
  return GAMES.map((game) => ({ slug: game.slug }));
}

const STATUS_TONE: Record<GameStatus, StatusTone> = {
  AVAILABLE: "positive",
  BORROWED: "warning",
  MAINTENANCE: "info",
};

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireMember();
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-4">
        <PlaceholderMedia label="COVER" aspect="aspect-[3/4]" />
        <StatusPill
          label={STATUS_LABELS[game.status]}
          tone={STATUS_TONE[game.status]}
          className="w-fit"
        />
        {game.status === "AVAILABLE" ? (
          <Button size="lg">Ausleihen</Button>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aktuell nicht verfügbar – Reservierung über die Erklärbären möglich.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            {game.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {game.players} Spieler · {game.duration} · Gewichtung{" "}
            {game.weight.toFixed(1)}/5
          </p>
        </div>

        <p className="max-w-2xl leading-relaxed">{game.description}</p>

        <div className="flex flex-wrap gap-2">
          {game.mechanics.map((mechanic) => (
            <span
              key={mechanic}
              className="bg-muted rounded-full px-3 py-1 text-xs font-medium"
            >
              {mechanic}
            </span>
          ))}
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Exemplare</h2>
          <ul className="mt-3 flex flex-col divide-y">
            {game.copies.map((copy) => (
              <li
                key={copy.code}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-mono text-sm">{copy.code}</p>
                  <p className="text-muted-foreground text-sm">
                    {copy.location}
                  </p>
                </div>
                <StatusPill
                  label={STATUS_LABELS[copy.status]}
                  tone={STATUS_TONE[copy.status]}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Erklärbären</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {game.explainers.map((explainer) => (
              <li
                key={explainer.name}
                className="flex items-center justify-between text-sm"
              >
                <span>{explainer.name}</span>
                <span aria-label={`Erfahrungsstufe ${explainer.level} von 3`}>
                  {"★".repeat(explainer.level)}
                  <span className="text-muted-foreground">
                    {"★".repeat(3 - explainer.level)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
