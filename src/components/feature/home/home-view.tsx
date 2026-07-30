import Link from "next/link";
import { Calendar, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { ContentCard } from "@/components/entities/content-card";
import { formatDate } from "@/lib/utils/format";
import type { getLatestPosts } from "@/lib/content/content";
import type { getUpcomingEventsWithCalendar } from "@/lib/content/calendar";

type HomeViewProps = {
  events: Awaited<ReturnType<typeof getUpcomingEventsWithCalendar>>;
  posts: Awaited<ReturnType<typeof getLatestPosts>>;
};

export function HomeView({ events, posts }: HomeViewProps) {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <p className="text-primary text-xs font-semibold tracking-wider uppercase">
          Willkommen bei den Oecher Meeples
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Der Brettspielverein für Aachen und Umgebung
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Spielen, leihen, treffen. Von Kennerspiel bis Familienabend – bei uns
          findest du Runde, Regelerklärung und über 600 Spiele in der
          Vereins-Ludothek.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
          <PlaceholderMedia
            label="VEREINSFOTO / SPIELEABEND"
            className="aspect-[16/9]"
          />
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/downloads">Mitglied werden</Link>} />
            <Button
              variant="outline"
              render={<Link href="/news">Nächster Spieleabend →</Link>}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-card rounded-lg border p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-lg font-bold">
                <Calendar className="text-primary size-4" />
                Nächste Termine
              </h2>
              <Link
                href="/news"
                className="text-primary text-sm hover:underline"
              >
                Kalender
              </Link>
            </div>
            <ul className="flex flex-col divide-y">
              {events.map((event) => (
                <li
                  key={event.slug}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {event.location ?? "Details folgen"}
                    </p>
                  </div>
                  <span className="bg-muted shrink-0 rounded px-2 py-1 font-mono text-xs">
                    {formatDate(event.date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-primary/10 rounded-lg border p-5">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold">
              <HeartHandshake className="size-4" />
              Unterstütze uns
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Deine Spende hält die Ludothek am Leben – neue Spiele, Etiketten,
              Eventmaterial.
            </p>
            <Button
              className="mt-3"
              render={<Link href="/spenden">Jetzt spenden (PayPal)</Link>}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold">Aus dem Newsroom</h2>
          <Link href="/news" className="text-primary text-sm hover:underline">
            Alle Beiträge →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <ContentCard key={post.slug} item={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
