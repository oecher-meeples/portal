import type { PostType } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";

export type ContentType = "termin" | "blog" | "turnier" | "umfrage";

export const CONTENT_TYPE_FILTERS: { label: string; value: ContentType | "alle" }[] = [
  { label: "Alle", value: "alle" },
  { label: "Termine", value: "termin" },
  { label: "Blog", value: "blog" },
  { label: "Turniere", value: "turnier" },
  { label: "Umfragen", value: "umfrage" },
];

export type ContentItem = {
  /** Only set for DB-backed posts — absent for ICS-sourced calendar events. */
  id?: string;
  slug: string;
  type: ContentType;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  author?: string;
  location?: string;
  internal?: boolean;
  instagram?: boolean;
  instagramPostUrl?: string;
  coverImageUrl?: string;
  /** Nur bei `type: "umfrage"` gesetzt — steuert das Deadline-Banner auf der
   * Detailseite (#2). `editLink`/`analysisLink` sind bewusst NICHT Teil von
   * `ContentItem`: sensibel, nur im Admin-Editor sichtbar (siehe
   * post-permissions.ts), nie auf `/news`. */
  surveyDeadline?: string;
};

const TYPE_TO_DB: Record<ContentType, "BLOG" | "TERMIN" | "TURNIER" | "UMFRAGE"> = {
  blog: "BLOG",
  termin: "TERMIN",
  turnier: "TURNIER",
  umfrage: "UMFRAGE",
};

const DB_TO_TYPE: Record<"BLOG" | "TERMIN" | "TURNIER" | "UMFRAGE", ContentType> = {
  BLOG: "blog",
  TERMIN: "termin",
  TURNIER: "turnier",
  UMFRAGE: "umfrage",
};

type PostWithoutBody = {
  id: string;
  slug: string;
  type: "BLOG" | "TERMIN" | "TURNIER" | "UMFRAGE";
  title: string;
  excerpt: string;
  date: Date;
  author: string | null;
  location: string | null;
  internal: boolean | null;
  instagram: boolean | null;
  instagramDetails: { postUrl: string | null } | null;
  surveyDetails: { deadline: Date | null } | null;
  coverImageUrl: string | null;
};

function toContentItemBase(post: PostWithoutBody): Omit<ContentItem, "body"> {
  return {
    id: post.id,
    slug: post.slug,
    type: DB_TO_TYPE[post.type],
    title: post.title,
    excerpt: post.excerpt,
    date: post.date.toISOString().slice(0, 10),
    author: post.author ?? undefined,
    location: post.location ?? undefined,
    internal: post.internal ?? undefined,
    instagram: post.instagram ?? undefined,
    instagramPostUrl: post.instagramDetails?.postUrl ?? undefined,
    coverImageUrl: post.coverImageUrl ?? undefined,
    surveyDeadline:
      post.surveyDetails?.deadline?.toISOString().slice(0, 10) ?? undefined,
  };
}

function toContentItem(post: PostWithoutBody & { body: string }): ContentItem {
  return { ...toContentItemBase(post), body: post.body };
}

const INSTAGRAM_DETAILS_SELECT = { select: { postUrl: true } } as const;
const SURVEY_DETAILS_SELECT = { select: { deadline: true } } as const;
const POST_RELATIONS_INCLUDE = {
  instagramDetails: INSTAGRAM_DETAILS_SELECT,
  surveyDetails: SURVEY_DETAILS_SELECT,
} as const;

const POST_WITHOUT_BODY_SELECT = {
  id: true,
  slug: true,
  type: true,
  title: true,
  excerpt: true,
  date: true,
  author: true,
  location: true,
  internal: true,
  instagram: true,
  instagramDetails: INSTAGRAM_DETAILS_SELECT,
  surveyDetails: SURVEY_DETAILS_SELECT,
  coverImageUrl: true,
} as const;

/** Includes `body` — `/news` renders it eagerly for the preview/full-view toggle (#135), no lazy per-post fetch. */
export async function getAllContent(): Promise<ContentItem[]> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "desc" },
    include: POST_RELATIONS_INCLUDE,
  });
  return posts.map(toContentItem);
}

/** Interne Beiträge, neueste zuerst — für den internen Newsroom und das Dashboard. */
export async function getInternalContent(
  limit?: number,
): Promise<Omit<ContentItem, "body">[]> {
  const posts = await prisma.post.findMany({
    where: { internal: true, status: "PUBLISHED" },
    orderBy: { date: "desc" },
    take: limit,
    select: POST_WITHOUT_BODY_SELECT,
  });
  return posts.map(toContentItemBase);
}

export async function getContentBySlug(slug: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: POST_RELATIONS_INCLUDE,
  });
  return post && post.status === "PUBLISHED" ? toContentItem(post) : undefined;
}

/** Kalender-Termine — bewusst `TERMIN`/`TURNIER` statt `type: { not: "BLOG" }`:
 * `UMFRAGE` ist ein Content-Typ wie Blog, kein Kalendereintrag (#2). */
const EVENT_TYPES: PostType[] = ["TERMIN", "TURNIER"];

/** Public-facing by default — never surfaces internal posts (homepage preview, public calendar). */
export async function getUpcomingEvents(limit = 3) {
  const posts = await prisma.post.findMany({
    where: {
      type: { in: EVENT_TYPES },
      OR: [{ internal: null }, { internal: false }],
      status: "PUBLISHED",
    },
    orderBy: { date: "asc" },
    take: limit,
    include: POST_RELATIONS_INCLUDE,
  });
  return posts.map(toContentItem);
}

/** Public-facing by default — never surfaces internal posts (homepage
 * preview). `includeSurveys` defaults to false: für Gäste gibt es keine
 * öffentlichen Umfragen (#424), nur Meeple sind abstimmungsberechtigt —
 * sonst tauchte auf der Startseite eine Umfrage auf, die auf `/news` für
 * denselben Gast bereits ausgeblendet ist. */
export async function getLatestPosts(limit = 3, includeSurveys = false) {
  const posts = await prisma.post.findMany({
    where: {
      OR: [{ internal: null }, { internal: false }],
      status: "PUBLISHED",
      ...(includeSurveys ? {} : { type: { not: "UMFRAGE" } }),
    },
    orderBy: { date: "desc" },
    take: limit,
    include: POST_RELATIONS_INCLUDE,
  });
  return posts.map(toContentItem);
}

/** Same as `getUpcomingEvents`, but includes internal Termine — for the internal calendar. */
export async function getUpcomingEventsIncludingInternal(limit = 3) {
  const posts = await prisma.post.findMany({
    where: { type: { in: EVENT_TYPES }, status: "PUBLISHED" },
    orderBy: { date: "asc" },
    take: limit,
    include: POST_RELATIONS_INCLUDE,
  });
  return posts.map(toContentItem);
}

/** Interne Beiträge brauchen news:internal:view (nicht nur eine Session) — used to gate the detail page. */
export function canViewContentItem(
  item: Pick<ContentItem, "internal">,
  canViewInternal: boolean,
) {
  return !item.internal || canViewInternal;
}

export { TYPE_TO_DB, DB_TO_TYPE };
