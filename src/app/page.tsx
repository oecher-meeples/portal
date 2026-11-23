import { HomeView } from "@/components/feature/home/home-view";
import { getLatestPosts } from "@/lib/content/content";
import { getUpcomingEventsWithCalendar } from "@/lib/content/calendar";
import { countBoardGameTitles, roundDownToHundred } from "@/lib/ludothek/query";
import { getSessionTier } from "@/lib/auth/session";
import { tierAtLeast } from "@/lib/utils/nav-config";

export default async function HomePage() {
  const sessionTier = await getSessionTier();
  const isMember = tierAtLeast(sessionTier, "mitglied");
  // #424: keine öffentlichen Umfragen in der Startseiten-Vorschau — nur
  // Meeple sind abstimmungsberechtigt (analog getAllContent()-Filter auf /news).
  const [posts, gameCount] = await Promise.all([
    getLatestPosts(3, isMember),
    countBoardGameTitles().then(roundDownToHundred),
  ]);
  // #420: die Spenden-Sperre aus #96 ist aufgehoben — der Spenden-Callout
  // steht jetzt für alle neben dem Kalender, also immer dieselbe Event-Zahl.
  const events = await getUpcomingEventsWithCalendar(3);

  return <HomeView events={events} posts={posts} gameCount={gameCount} />;
}
