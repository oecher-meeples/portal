"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NewsletterCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import {
  SurveyFields,
  usePostSurvey,
} from "@/components/feature/admin-news/survey-fields";
import {
  PostPublishingOptions,
  usePostInstagram,
} from "@/components/feature/admin-news/post-publishing-options";
import {
  PostBodyField,
  PostCoverField,
} from "@/components/feature/admin-news/post-form-sections";
import {
  CONTENT_TYPE_LABELS,
  type ContentType,
} from "@/lib/content/content-types";
import {
  createPost,
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
  umfrage: "NEWS",
};

const TYPE_OPTIONS = (
  Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]
).map(([value, label]) => ({ value, label }));

export function PostForm({
  postId,
  initialValues,
  canEditPublic = true,
  canEditInternal = true,
}: {
  postId?: string;
  initialValues?: Partial<PostInput> & {
    instagramStatus?: string | null;
    surveyDeadline?: string;
    surveyEditLink?: string;
    surveyAnalysisLink?: string;
  };
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
  const survey = usePostSurvey(initialValues ?? {});
  const instagramState = usePostInstagram(
    postId,
    initialValues?.instagramStatus,
  );
  const submit = useAction({ onSuccess: () => router.push("/admin/news") });
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      ...(type === "umfrage" ? survey.input : {}),
    };

    const saveAsCopy = isExistingDraft && copyDraft;
    await submit.run(() =>
      postId && !saveAsCopy ? updatePost(postId, input) : createPost(input),
    );
  }

  const isSubmitting = submit.pending;
  const error = submit.error ?? instagramState.error;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titel" htmlFor="title">
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>
        <Field label="Typ" htmlFor="type">
          <NativeSelect
            id="type"
            value={type}
            onChange={(event) => setType(event.target.value as ContentType)}
            size="md"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Datum" htmlFor="date">
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Autor" htmlFor="author">
          <Input
            id="author"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </Field>
      </div>

      <Field label="Excerpt" htmlFor="excerpt">
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          rows={2}
          placeholder="Leer lassen, um die ersten 130 Zeichen des Inhalts zu verwenden"
        />
      </Field>

      <PostBodyField value={body} onChange={setBody} />

      {type === "umfrage" && <SurveyFields {...survey.fieldProps} />}

      <PostCoverField value={coverImageUrl} onChange={setCoverImageUrl} />

      <PostPublishingOptions
        internal={internal}
        onInternalChange={setInternal}
        internalLocked={internalLocked}
        canEditInternal={canEditInternal}
        instagram={instagram}
        onInstagramChange={setInstagram}
        sendAsNewsletter={sendAsNewsletter}
        onSendAsNewsletterChange={setSendAsNewsletter}
        newsletterCategory={newsletterCategory}
        onNewsletterCategoryChange={setNewsletterCategory}
        isExistingDraft={isExistingDraft}
        copyDraft={copyDraft}
        onCopyDraftChange={setCopyDraft}
        instagramStatus={instagramState.status}
        isRetrying={instagramState.isRetrying}
        onRetry={instagramState.retry}
        postId={postId}
      />

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
