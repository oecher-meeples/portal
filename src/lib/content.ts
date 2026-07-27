import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

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

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function loadContentItem(filename: string): ContentItem {
  const slug = filename.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(POSTS_DIR, filename), "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    type: data.type,
    title: data.title,
    excerpt: data.excerpt,
    body: content.trim(),
    date: data.date,
    author: data.author,
    location: data.location,
    internal: data.internal,
    instagram: data.instagram,
  };
}

export function getAllContent(): ContentItem[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map(loadContentItem);
}

export function getContentBySlug(slug: string) {
  return getAllContent().find((item) => item.slug === slug);
}

export function getUpcomingEvents(limit = 3) {
  return getAllContent()
    .filter((item) => item.type !== "blog")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function getLatestPosts(limit = 3) {
  return getAllContent()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
