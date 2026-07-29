import { prisma } from "@/lib/prisma";

export type ContentType = "termin" | "blog" | "turnier";

export type ContentItem = {
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

function toContentItem(post: {
  slug: string;
  type: "BLOG" | "TERMIN" | "TURNIER";
  title: string;
  excerpt: string;
  body: string;
  date: Date;
  author: string | null;
  location: string | null;
  internal: boolean | null;
  instagram: boolean | null;
}): ContentItem {
  return {
    slug: post.slug,
    type: DB_TO_TYPE[post.type],
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    date: post.date.toISOString().slice(0, 10),
    author: post.author ?? undefined,
    location: post.location ?? undefined,
    internal: post.internal ?? undefined,
    instagram: post.instagram ?? undefined,
  };
}

export async function getAllContent(): Promise<ContentItem[]> {
  const posts = await prisma.post.findMany();
  return posts.map(toContentItem);
}

export async function getContentBySlug(slug: string) {
  const post = await prisma.post.findUnique({ where: { slug } });
  return post ? toContentItem(post) : undefined;
}

/** Public-facing by default — never surfaces internal posts (homepage preview, public calendar). */
export async function getUpcomingEvents(limit = 3) {
  const posts = await prisma.post.findMany({
    where: { type: { not: "BLOG" }, internal: { not: true } },
    orderBy: { date: "asc" },
    take: limit,
  });
  return posts.map(toContentItem);
}

/** Public-facing by default — never surfaces internal posts (homepage preview). */
export async function getLatestPosts(limit = 3) {
  const posts = await prisma.post.findMany({
    where: { internal: { not: true } },
    orderBy: { date: "desc" },
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

export { TYPE_TO_DB };
