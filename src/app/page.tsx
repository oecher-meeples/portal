import { HomeView } from "@/components/feature/home/home-view";
import { getLatestPosts } from "@/lib/content/content";
import { getUpcomingEventsWithCalendar } from "@/lib/content/calendar";
import { countBoardGameTitles, roundDownToHundred } from "@/lib/ludothek/query";
import { getSessionTier } from "@/lib/auth/session";
import { tierAtLeast } from "@/lib/utils/nav-config";

export default async function HomePage() {
  const [posts, gameCount, sessionTier] = await Promise.all([
    getLatestPosts(),
    countBoardGameTitles().then(roundDownToHundred),
    getSessionTier(),
  ]);
  const isMember = tierAtLeast(sessionTier, "mitglied");
  // Non-members don't see the donation callout next to the calendar (#96) —
  // let the calendar use that freed space by showing more events instead.
  const events = await getUpcomingEventsWithCalendar(isMember ? 3 : 6);

  return (
    <HomeView
      events={events}
      posts={posts}
      gameCount={gameCount}
      isMember={isMember}
    />
  );
}
