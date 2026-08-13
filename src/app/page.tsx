import { HomeView } from "@/components/feature/home/home-view";
import { getLatestPosts } from "@/lib/content/content";
import { getUpcomingEventsWithCalendar } from "@/lib/content/calendar";
import { countBoardGameTitles, roundDownToHundred } from "@/lib/ludothek/query";
import { getSessionTier } from "@/lib/auth/session";
import { tierAtLeast } from "@/lib/utils/nav-config";

export default async function HomePage() {
  const events = await getUpcomingEventsWithCalendar();
  const posts = await getLatestPosts();
  const gameCount = roundDownToHundred(await countBoardGameTitles());
  const sessionTier = await getSessionTier();

  return (
    <HomeView
      events={events}
      posts={posts}
      gameCount={gameCount}
      isMember={tierAtLeast(sessionTier, "mitglied")}
    />
  );
}
