import type { NewsVisibility } from "@/lib/content/news-visibility";

/** Privates S3-Präfix für Beitragsbilder (#671) — bewusst nicht in
 * `PUBLIC_BLOB_PREFIXES`, Auslieferung nur über `/api/blog-images/<id>`. */
export const POST_IMAGE_PREFIX = "blog-images";

export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const POST_IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const URL_PATH = "/api/blog-images/";
const IMAGE_REF = /!\[[^\]]*\]\(\/api\/blog-images\/([A-Za-z0-9_-]+)\)/g;

export function postImageUrl(id: string): string {
  return `${URL_PATH}${id}`;
}

/** IDs aller per Markdown-Bildsyntax eingebetteten Beitragsbilder —
 * dedupliziert, in Reihenfolge des ersten Auftretens. */
export function extractPostImageIds(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(IMAGE_REF)) ids.add(match[1]);
  return [...ids];
}

/** Verknüpfte Bild-IDs, die im Body nicht mehr vorkommen. */
export function findRemovedImageIds(
  linkedIds: string[],
  body: string,
): string[] {
  const used = new Set(extractPostImageIds(body));
  return linkedIds.filter((id) => !used.has(id));
}

export type PostImageViewContext = {
  /** `null` = Bild noch keinem Beitrag zugeordnet. */
  post: { status: "DRAFT" | "PUBLISHED"; internal: boolean | null } | null;
  visibility: NewsVisibility;
  /** Betrachter darf diesen Beitrag (bzw. bei unverknüpften Bildern
   * irgendeinen) bearbeiten. */
  canEdit: boolean;
};

/** Sichtbarkeitsregel der Auslieferungsroute: Bearbeiter sehen alles, alle
 * anderen nur Bilder veröffentlichter Beiträge — interne nur mit
 * `news:internal:view`. */
export function canViewPostImage({
  post,
  visibility,
  canEdit,
}: PostImageViewContext): boolean {
  if (canEdit) return true;
  if (!post || post.status !== "PUBLISHED") return false;
  return post.internal ? visibility.canSeeInternal : true;
}

/** Alt-Text-Vorbelegung aus dem Dateinamen: ohne Endung, Trenner als Leerzeichen. */
export function altTextFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/[[\]()]/g, "")
    .trim();
}

export function postImageMarkdown(alt: string, id: string): string {
  return `![${alt.replace(/[[\]]/g, "")}](${postImageUrl(id)})`;
}
