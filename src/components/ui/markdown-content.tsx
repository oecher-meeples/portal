import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/cn";

/** Gemeinsame Formatierung für gerenderten Markdown-Content (Blogbeiträge,
 * Editor-Vorschau) — GFM-Support (Tabellen, Strikethrough, Task-Listen) plus
 * sichtbares Styling für alle Standard-Elemente. Ein Ort statt Duplikaten in
 * post-detail-view.tsx / post-form.tsx / content-timeline-entry.tsx (#319). */
const MARKDOWN_CLASSES = cn(
  "flex flex-col gap-4 text-base leading-relaxed",
  "[&_a]:text-primary [&_a]:underline",
  "[&_strong]:font-semibold",
  "[&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight",
  "[&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight",
  "[&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-bold [&_h3]:tracking-tight",
  "[&_h4]:text-base [&_h4]:font-bold",
  "[&_h5]:text-sm [&_h5]:font-bold",
  "[&_h6]:text-muted-foreground [&_h6]:text-sm [&_h6]:font-bold",
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1",
  "[&_blockquote]:border-l-primary [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic",
  "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm",
  "[&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:p-2",
  "[&_hr]:border-border [&_hr]:my-4",
  "[&_img]:max-w-full [&_img]:rounded-md",
);

export function MarkdownContent({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  return (
    <div className={cn(MARKDOWN_CLASSES, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
