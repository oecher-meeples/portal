import type { PostType } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  DB_TO_TYPE,
  type ContentItem,
  type PaginatedContent,
} from "@/lib/content/content-types";

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
  sourceIcsUid: true,
  sourceEventId: true,
} as const;

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
  sourceIcsUid: string | null;
  sourceEventId: string | null;
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
    hasEventSource:
      post.sourceIcsUid !== null || post.sourceEventId !== null,
  };
}

function toContentItem(post: PostWithoutBody & { body: string }): ContentItem {
  return { ...toContentItemBase(post), body: post.body };
}

/** Includes `body` — `/news` renders it eagerly for the preview/full-view
 * toggle (#135), no lazy per-post fetch. `take`/`cursor` (#469, Hybrid-
 * Pagination aus #462): ohne Angabe unverändert alle Posts auf einmal, wie
 * bisher. `orderBy` bekommt `id` als zweites Sortierkriterium — ohne das
 * wäre die Reihenfolge bei gleichem `date` nicht deterministisch, Cursor-
 * Pagination könnte Zeilen doppelt liefern oder überspringen. */
export async function getAllContent(options?: {
  take?: number;
  cursor?: string;
}): Promise<PaginatedContent> {
  const { take, cursor } = options ?? {};
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    include: POST_RELATIONS_INCLUDE,
    ...(take !== undefined ? { take: take + 1 } : {}),
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  if (take !== undefined && posts.length > take) {
    const page = posts.slice(0, take);
    return {
      items: page.map(toContentItem),
      nextCursor: page[page.length - 1].id,
    };
  }
  return { items: posts.map(toContentItem), nextCursor: null };
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

/** #463: ein Termin-Slug (`kalender-*`/`event-*`) ohne bisherigen `Post`
 * bekommt hier lazy einen `DRAFT`-Post erzeugt, statt 404 zurückzugeben —
 * dessen Inhalt wird direkt beim ersten Aufruf gezeigt (unabhängig vom
 * Status), ein normaler `Post` bleibt beim bisherigen Publish-Gate. */
export async function getContentBySlug(slug: string) {
  const post = await prisma.post.findUnique({
    where: { slug },
    include: POST_RELATIONS_INCLUDE,
  });
  if (post) {
    return post.status === "PUBLISHED" ? toContentItem(post) : undefined;
  }

  const { getOrCreateTerminPost } = await import(
    "@/lib/content/termin-posts"
  );
  const created = await getOrCreateTerminPost(slug);
  if (!created) return undefined;
  const full = await prisma.post.findUniqueOrThrow({
    where: { id: created.id },
    include: POST_RELATIONS_INCLUDE,
  });
  return toContentItem(full);
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
