import { HomeView } from "@/components/feature/home/home-view";
import { getLatestPosts } from "@/lib/content/content";
import { getUpcomingEventsWithCalendar } from "@/lib/content/calendar";

export default async function HomePage() {
  const events = await getUpcomingEventsWithCalendar();
  const posts = await getLatestPosts();

  return <HomeView events={events} posts={posts} />;
}
