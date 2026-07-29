import Link from "next/link";
import { requireMember } from "@/lib/session";
import { getAllContent } from "@/lib/content";
import { PageHeading } from "@/components/ui/page-heading";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export default async function InternalNewsPage() {
  await requireMember();

  const internalPosts = (await getAllContent())
    .filter((item) => item.internal)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Mitgliederbereich"
        title="Interner Newsroom"
        description="Beiträge, die nur eingeloggte Mitglieder sehen."
      />
      <div className="flex flex-col divide-y rounded-lg border">
        {internalPosts.map((item) => (
          <Link
            key={item.slug}
            href={`/news/${item.slug}`}
            className="hover:bg-muted/50 flex items-center justify-between gap-3 p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-serif font-semibold">{item.title}</p>
                <Badge variant="secondary">nur intern</Badge>
              </div>
              <p className="text-muted-foreground text-sm">{item.excerpt}</p>
            </div>
            <span className="text-muted-foreground shrink-0 font-mono text-xs">
              {formatDate(item.date)}
            </span>
          </Link>
        ))}
        {internalPosts.length === 0 && (
          <p className="text-muted-foreground p-4 text-sm">
            Noch keine internen Beiträge.
          </p>
        )}
      </div>
    </div>
  );
}
