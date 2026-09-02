"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NewsletterCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileField } from "@/components/ui/file-field";
import { Textarea } from "@/components/ui/textarea";
import { CoverMedia } from "@/components/ui/cover-media";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { compressImage } from "@/lib/utils/compress-image";
import type { ContentType } from "@/lib/content/content";
import {
  NEWSLETTER_CATEGORIES,
  NEWSLETTER_CATEGORY_LABELS,
} from "@/lib/newsletter/labels";
import {
  createPost,
  getUploadToken,
  retryInstagramPost,
  updatePost,
  type PostInput,
} from "@/components/feature/admin-news/actions";

/** Default-Kategorie je Post-Typ — im Formular weiter überschreibbar. */
const DEFAULT_NEWSLETTER_CATEGORY_BY_TYPE: Record<
  ContentType,
  NewsletterCategory
> = {
  blog: "NEWS",
  termin: "TERMINE",
  turnier: "TURNIERE",
};

const INSTAGRAM_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  QUEUED: "In Warteschlange",
  POSTED: "Erfolgreich gepostet",
  FAILED: "Fehlgeschlagen",
};

const TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "blog", label: "Blog" },
  { value: "termin", label: "Termin" },
  { value: "turnier", label: "Turnier" },
];

export function PostForm({
  postId,
  initialValues,
  canEditPublic = true,
  canEditInternal = true,
}: {
  postId?: string;
  initialValues?: Partial<PostInput> & { instagramStatus?: string | null };
  /** Wer nur eines der beiden Rechte hat, bekommt die Checkbox "Nur intern"
   * fest auf den erlaubten Wert gesperrt statt frei wählbar (#321). */
  canEditPublic?: boolean;
  canEditInternal?: boolean;
}) {
  const isExistingDraft = Boolean(postId) && initialValues?.status === "DRAFT";
  const router = useRouter();
  const internalLocked = canEditPublic !== canEditInternal;
  const [type, setType] = useState<ContentType>(initialValues?.type ?? "blog");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [excerpt, setExcerpt] = useState(initialValues?.excerpt ?? "");
  const [author, setAuthor] = useState(initialValues?.author ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [instagram, setInstagram] = useState(initialValues?.instagram ?? false);
  const [internal, setInternal] = useState(
    internalLocked ? canEditInternal : (initialValues?.internal ?? false),
  );
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialValues?.coverImageUrl ?? "",
  );
  const {
    uploadFiles,
    isUploading: isUploadingCover,
    error: coverUploadError,
  } = useBlobUpload("instagram-covers", getUploadToken);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instagramStatus, setInstagramStatus] = useState(
    initialValues?.instagramStatus,
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    "DRAFT" | "PUBLISHED" | null
  >(null);
  const [copyDraft, setCopyDraft] = useState(false);
  const [sendAsNewsletter, setSendAsNewsletter] = useState(
    initialValues?.sendAsNewsletter ?? false,
  );
  const [newsletterCategory, setNewsletterCategory] =
    useState<NewsletterCategory>(
      initialValues?.newsletterCategory ??
        DEFAULT_NEWSLETTER_CATEGORY_BY_TYPE[type],
    );

  async function handleRetry() {
    if (!postId) return;
    setIsRetrying(true);
    setError(null);
    const result = await retryInstagramPost(postId);
    setIsRetrying(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setInstagramStatus(result.posted ? "POSTED" : "PENDING");
  }

  async function handleCoverImageChange(files: File[]) {
    const file = files[0];
    if (!file) return;

    const compressed = await compressImage(file);
    const [url] = await uploadFiles([compressed]);
    if (url) setCoverImageUrl(url);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const status =
      submitter?.value === "DRAFT" ? "DRAFT" : ("PUBLISHED" as const);
    setPendingStatus(status);
    const input: PostInput = {
      type,
      title,
      date,
      excerpt,
      author,
      body,
      instagram,
      internal,
      status,
      sendAsNewsletter,
      newsletterCategory: sendAsNewsletter ? newsletterCategory : null,
      coverImageUrl: coverImageUrl || undefined,
    };

    try {
      const saveAsCopy = isExistingDraft && copyDraft;
      const result =
        postId && !saveAsCopy
          ? await updatePost(postId, input)
          : await createPost(input);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/admin/news");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Beitrag konnte nicht gespeichert werden. Bitte erneut versuchen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Titel</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Typ</Label>
          <select
            id="type"
            value={type}
            onChange={(event) => setType(event.target.value as ContentType)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Datum</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="author">Autor</Label>
          <Input
            id="author"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          rows={2}
          placeholder="Leer lassen, um die ersten 130 Zeichen des Inhalts zu verwenden"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="body">Inhalt (Markdown)</Label>
            <a
              href="https://de.wikipedia.org/wiki/Markdown"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground text-xs underline underline-offset-2"
            >
              Was ist Markdown?
            </a>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={activeTab === "editor" ? "default" : "outline"}
              onClick={() => setActiveTab("editor")}
            >
              Editor
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "preview" ? "default" : "outline"}
              onClick={() => setActiveTab("preview")}
            >
              Vorschau
            </Button>
          </div>
        </div>
        {activeTab === "editor" ? (
          <Textarea
            id="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={12}
            className="font-mono text-sm"
            required
          />
        ) : (
          <MarkdownContent
            body={body || "*Keine Vorschau*"}
            className="min-h-64 rounded-md border p-4 text-sm"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <FileField
          id="coverImage"
          label="Cover-Bild"
          accept="image/png,image/jpeg,image/webp"
          disabled={isUploadingCover}
          onFilesSelected={(files) => void handleCoverImageChange(files)}
        />
        {isUploadingCover && (
          <p className="text-muted-foreground text-sm">Lade Bild hoch…</p>
        )}
        {coverUploadError && (
          <p className="text-destructive text-sm">{coverUploadError}</p>
        )}
        {coverImageUrl && !isUploadingCover && (
          <CoverMedia
            imageUrl={coverImageUrl}
            alt="Cover-Bild-Vorschau"
            aspect="aspect-square"
            className="w-32"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={internal}
            disabled={internalLocked}
            onChange={(event) => setInternal(event.target.checked)}
          />
          Nur intern (nur für eingeloggte Mitglieder sichtbar)
          {internalLocked && (
            <span className="text-muted-foreground text-xs">
              (nur {canEditInternal ? "interne" : "öffentliche"} Beiträge
              erlaubt)
            </span>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={instagram}
            disabled={internal}
            onChange={(event) => setInstagram(event.target.checked)}
          />
          Auch auf Instagram teilen
          {internal && (
            <span className="text-muted-foreground text-xs">
              (nicht möglich für interne Beiträge)
            </span>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sendAsNewsletter}
            onChange={(event) => setSendAsNewsletter(event.target.checked)}
          />
          Als Newsletter versenden in
          {sendAsNewsletter && (
            <select
              value={newsletterCategory}
              onChange={(event) =>
                setNewsletterCategory(event.target.value as NewsletterCategory)
              }
              className="border-primary bg-background h-9 w-fit rounded-md border-2 px-3 text-sm"
            >
              {NEWSLETTER_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {NEWSLETTER_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          )}
        </label>
        {isExistingDraft && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyDraft}
              onChange={(event) => setCopyDraft(event.target.checked)}
            />
            Entwurf kopieren?
            <span className="text-muted-foreground text-xs">
              (legt beim Speichern einen neuen Beitrag an, der bestehende
              Entwurf bleibt unverändert)
            </span>
          </label>
        )}
        {instagramStatus && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="self-start">
              {INSTAGRAM_STATUS_LABELS[instagramStatus] ?? instagramStatus}
            </Badge>
            {instagramStatus === "FAILED" && postId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRetrying}
                onClick={handleRetry}
              >
                {isRetrying ? "Wird erneut versucht…" : "Erneut versuchen"}
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="outline"
          value="DRAFT"
          disabled={isSubmitting}
        >
          {isSubmitting && pendingStatus === "DRAFT"
            ? "Speichere…"
            : "Als Entwurf speichern"}
        </Button>
        <Button type="submit" value="PUBLISHED" disabled={isSubmitting}>
          {isSubmitting && pendingStatus === "PUBLISHED"
            ? "Speichere…"
            : isExistingDraft
              ? "Entwurf veröffentlichen"
              : postId
                ? "Änderungen speichern"
                : "Absenden"}
        </Button>
      </div>
    </form>
  );
}
