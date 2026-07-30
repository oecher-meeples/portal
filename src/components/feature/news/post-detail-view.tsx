import { Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ContentTypeBadge } from "@/components/domain/content-type-badge";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { formatDate } from "@/lib/format";
import type { getContentBySlug } from "@/lib/content";

type PostDetailViewProps = {
  item: NonNullable<Awaited<ReturnType<typeof getContentBySlug>>>;
};

export function PostDetailView({ item }: PostDetailViewProps) {
  return (
    <article className="flex max-w-3xl flex-col gap-5">
      <PlaceholderMedia label="TITELBILD" className="aspect-[21/9]" />
      <div className="flex items-center gap-3">
        <ContentTypeBadge type={item.type} />
        {item.instagram && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Share2 className="size-3.5" />
            Auch auf Instagram
          </span>
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
      <div className="[&_a]:text-primary flex flex-col gap-4 text-base leading-relaxed [&_a]:underline [&_strong]:font-semibold">
        <ReactMarkdown>{item.body}</ReactMarkdown>
      </div>
    </article>
  );
}
