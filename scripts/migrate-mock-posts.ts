import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { prisma } from "../src/lib/prisma";
import { TYPE_TO_DB } from "../src/lib/content";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function loadMockPost(filename: string) {
  const slug = filename.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(POSTS_DIR, filename), "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    type: TYPE_TO_DB[data.type as keyof typeof TYPE_TO_DB],
    title: data.title as string,
    excerpt: data.excerpt as string,
    body: content.trim(),
    date: new Date(data.date as string),
    author: (data.author as string) ?? null,
    location: (data.location as string) ?? null,
    internal: (data.internal as boolean) ?? null,
    instagram: (data.instagram as boolean) ?? null,
  };
}

async function main() {
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"));

  for (const file of files) {
    const post = loadMockPost(file);
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: post,
      create: post,
    });
    console.log(`Migriert: ${post.slug}`);
  }

  console.log(`${files.length} Beiträge migriert.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
