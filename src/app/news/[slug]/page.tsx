import { notFound } from "next/navigation";
import { Share2 } from "lucide-react";
import { CONTENT_ITEMS, getContentBySlug } from "@/data/content";
import { ContentTypeBadge } from "@/components/content/content-type-badge";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return CONTENT_ITEMS.map((item) => ({ slug: item.slug }));
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getContentBySlug(slug);
  if (!item) notFound();

  return (
    <article className="flex max-w-3xl flex-col gap-5">
      <PlaceholderMedia label="TITELBILD" className="aspect-[21/9]" />
      <div className="flex items-center gap-3">
        <ContentTypeBadge type={item.type} />
        {item.instagram && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Share2 className="size-3.5" />
            Auch auf Instagram
          </span>
        )}
      </div>
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {item.title}
      </h1>
      <p className="text-sm text-muted-foreground">
        {formatDate(item.date)}
        {item.author && <> · {item.author}</>}
        {item.location && <> · {item.location}</>}
      </p>
      <div className="flex flex-col gap-4 text-base leading-relaxed">
        {item.body.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
