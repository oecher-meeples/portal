import { prisma } from "@/lib/utils/prisma";

export type ContentType = "termin" | "blog" | "turnier";

export const CONTENT_TYPE_FILTERS: { label: string; value: ContentType | "alle" }[] = [
  { label: "Alle", value: "alle" },
  { label: "Termine", value: "termin" },
  { label: "Blog", value: "blog" },
  { label: "Turniere", value: "turnier" },
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
};

const TYPE_TO_DB: Record<ContentType, "BLOG" | "TERMIN" | "TURNIER"> = {
  blog: "BLOG",
  termin: "TERMIN",
  turnier: "TURNIER",
};

const DB_TO_TYPE: Record<"BLOG" | "TERMIN" | "TURNIER", ContentType> = {
  BLOG: "blog",
  TERMIN: "termin",
  TURNIER: "turnier",
};

type PostWithoutBody = {
  id: string;
  slug: string;
  type: "BLOG" | "TERMIN" | "TURNIER";
  title: string;
  excerpt: string;
  date: Date;
  author: string | null;
  location: string | null;
  internal: boolean | null;
  instagram: boolean | null;
  instagramPostUrl: string | null;
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
    instagramPostUrl: post.instagramPostUrl ?? undefined,
    coverImageUrl: post.coverImageUrl ?? undefined,
  };
}

function toContentItem(post: PostWithoutBody & { body: string }): ContentItem {
  return { ...toContentItemBase(post), body: post.body };
}

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
  instagramPostUrl: true,
  coverImageUrl: true,
} as const;

/** Includes `body` — `/news` renders it eagerly for the preview/full-view toggle (#135), no lazy per-post fetch. */
export async function getAllContent(): Promise<ContentItem[]> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "desc" },
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
  const post = await prisma.post.findUnique({ where: { slug } });
  return post && post.status === "PUBLISHED" ? toContentItem(post) : undefined;
}

/** Public-facing by default — never surfaces internal posts (homepage preview, public calendar). */
export async function getUpcomingEvents(limit = 3) {
  const posts = await prisma.post.findMany({
    where: {
      type: { not: "BLOG" },
      OR: [{ internal: null }, { internal: false }],
      status: "PUBLISHED",
    },
    orderBy: { date: "asc" },
    take: limit,
  });
  return posts.map(toContentItem);
}

/** Public-facing by default — never surfaces internal posts (homepage preview). */
export async function getLatestPosts(limit = 3) {
  const posts = await prisma.post.findMany({
    where: { OR: [{ internal: null }, { internal: false }], status: "PUBLISHED" },
    orderBy: { date: "desc" },
    take: limit,
  });
  return posts.map(toContentItem);
}

/** Same as `getUpcomingEvents`, but includes internal Termine — for the internal calendar. */
export async function getUpcomingEventsIncludingInternal(limit = 3) {
  const posts = await prisma.post.findMany({
    where: { type: { not: "BLOG" }, status: "PUBLISHED" },
    orderBy: { date: "asc" },
    take: limit,
  });
  return posts.map(toContentItem);
}

/** Interne Beiträge sind nur mit Session sichtbar — used to gate the detail page. */
export function canViewContentItem(
  item: Pick<ContentItem, "internal">,
  hasSession: boolean,
) {
  return !item.internal || hasSession;
}

export { TYPE_TO_DB, DB_TO_TYPE };
