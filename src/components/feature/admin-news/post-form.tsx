"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import type { ContentType } from "@/lib/content/content";
import {
  createPost,
  getUploadToken,
  retryInstagramPost,
  updatePost,
  type PostInput,
} from "@/components/feature/admin-news/actions";

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
}: {
  postId?: string;
  initialValues?: Partial<PostInput> & { instagramStatus?: string | null };
}) {
  const router = useRouter();
  const [type, setType] = useState<ContentType>(initialValues?.type ?? "blog");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [excerpt, setExcerpt] = useState(initialValues?.excerpt ?? "");
  const [author, setAuthor] = useState(initialValues?.author ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [instagram, setInstagram] = useState(initialValues?.instagram ?? false);
  const [internal, setInternal] = useState(initialValues?.internal ?? false);
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

  async function handleCoverImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const [url] = await uploadFiles([file]);
    if (url) setCoverImageUrl(url);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const input: PostInput = {
      type,
      title,
      date,
      excerpt,
      author,
      body,
      instagram,
      internal,
      coverImageUrl: coverImageUrl || undefined,
    };

    try {
      const result = postId
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
          <Label htmlFor="body">Inhalt (Markdown)</Label>
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
          <div className="[&_a]:text-primary min-h-64 rounded-md border p-4 text-sm leading-relaxed [&_a]:underline [&_strong]:font-semibold">
            <ReactMarkdown>{body || "*Keine Vorschau*"}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="coverImage">Cover-Bild</Label>
        <Input
          id="coverImage"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleCoverImageChange}
          disabled={isUploadingCover}
        />
        {isUploadingCover && (
          <p className="text-muted-foreground text-sm">Lade Bild hoch…</p>
        )}
        {coverUploadError && (
          <p className="text-destructive text-sm">{coverUploadError}</p>
        )}
        {coverImageUrl && !isUploadingCover && (
          <img
            src={coverImageUrl}
            alt="Cover-Bild-Vorschau"
            className="h-32 w-32 rounded-md border object-cover"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={internal}
            onChange={(event) => setInternal(event.target.checked)}
          />
          Nur intern (nur für eingeloggte Mitglieder sichtbar)
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
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting
          ? "Speichere…"
          : postId
            ? "Änderungen speichern"
            : "Beitrag erstellen"}
      </Button>
    </form>
  );
}
