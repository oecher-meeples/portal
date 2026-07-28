"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContentType } from "@/lib/content";
import {
  createPost,
  updatePost,
  type PostInput,
} from "@/app/admin/news/actions";

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
  initialValues?: Partial<PostInput>;
}) {
  const router = useRouter();
  const [type, setType] = useState<ContentType>(initialValues?.type ?? "blog");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [excerpt, setExcerpt] = useState(initialValues?.excerpt ?? "");
  const [author, setAuthor] = useState(initialValues?.author ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const input: PostInput = { type, title, date, excerpt, author, body };
    const result = postId
      ? await updatePost(postId, input)
      : await createPost(input);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/admin/news");
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
          required
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
