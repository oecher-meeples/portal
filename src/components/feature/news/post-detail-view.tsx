import Link from "next/link";
import { Pencil, Share2 } from "lucide-react";
import { ContentTypeBadge } from "@/components/entities/content-type-badge";
import { CoverMedia } from "@/components/ui/cover-media";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ShareButton } from "@/components/ui/share-button";
import { formatDate } from "@/lib/utils/format";
import { getRequestOrigin } from "@/lib/utils/request-origin";
import type { getContentBySlug } from "@/lib/content/content";

type PostDetailViewProps = {
  item: NonNullable<Awaited<ReturnType<typeof getContentBySlug>>>;
  canEdit?: boolean;
};

export async function PostDetailView({ item, canEdit }: PostDetailViewProps) {
  const origin = await getRequestOrigin();
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <CoverMedia
        imageUrl={item.coverImageUrl}
        alt={item.title}
        label="TITELBILD"
        sizing="natural"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ContentTypeBadge type={item.type} />
          {item.instagram && item.instagramPostUrl && (
            <a
              href={item.instagramPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs hover:underline"
            >
              <Share2 className="size-3.5" />
              Auch auf Instagram
            </a>
          )}
          {item.instagram && !item.instagramPostUrl && (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Share2 className="size-3.5" />
              Auch auf Instagram
            </span>
          )}
        </div>
        {canEdit && item.id && (
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/admin/news/${item.id}/edit`}>
                <Pencil className="size-3.5" />
                Bearbeiten
              </Link>
            }
          />
        )}
      </div>
      <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {item.title}
      </h1>
      <p className="text-muted-foreground text-sm">
        {formatDate(item.date)}
        {item.author && <> · {item.author}</>}
        {item.location && <> · {item.location}</>}
      </p>
      <MarkdownContent body={item.body} />
      <ShareButton url={`${origin}/news/${item.slug}`} title={item.title} />
    </article>
  );
}
