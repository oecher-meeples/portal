import type { Element, Root } from "hast";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import {
  extractPostImageIds,
  mapPostImageRefs,
} from "@/lib/content/post-images";
import { UserFacingError } from "@/lib/utils/action-result";
import { prisma } from "@/lib/utils/prisma";
import { getBlob } from "@/lib/utils/s3";

const SAFE_URL = /^(https?:|mailto:|cid:|\/|#)/i;

/** Entfernt `href`/`src` mit anderen Protokollen (z. B. `javascript:`),
 * analog zum `urlTransform` von react-markdown. */
function rehypeSafeUrls() {
  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      if (node.type === "element") {
        for (const attr of ["href", "src"]) {
          const value = node.properties?.[attr];
          if (typeof value === "string" && !SAFE_URL.test(value.trim())) {
            delete node.properties[attr];
          }
        }
      }
      for (const child of node.children) {
        if (child.type === "element") walk(child);
      }
    };
    walk(tree);
  };
}

/** Kein `react-dom/server`: Next verbietet den Import im App-Router-Graph. */
const markdownToHtml = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSafeUrls)
  .use(rehypeStringify);

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
};

export type PostEmailBody = { html: string; attachments: EmailAttachment[] };

/** Rendert den Markdown-Body eines Beitrags als Mail-HTML (#671). Bilder
 * werden als `cid:`-Anhänge eingebettet, damit sie nicht von URLs oder
 * Zugriffsrechten abhängen; Verweise auf nicht (mehr) existierende Bilder
 * fallen weg. Eine fehlende Datei im Speicher bricht den Versand ab (der
 * Job wird wiederholt), statt eine Mail mit kaputtem Bild zu verschicken. */
export async function buildPostEmailBody(post: {
  id: string;
  body: string;
}): Promise<PostEmailBody> {
  const ids = extractPostImageIds(post.body);
  const images = ids.length
    ? await prisma.postImage.findMany({
        where: { id: { in: ids }, postId: post.id },
        select: { id: true, key: true },
      })
    : [];

  const attachments: EmailAttachment[] = [];
  for (const image of images) {
    const blob = await getBlob(image.key);
    if (!blob) {
      throw new UserFacingError(`Beitragsbild ${image.id} fehlt im Speicher.`);
    }
    attachments.push({
      filename: image.key.split("/").pop() ?? image.id,
      content: Buffer.from(blob.bytes),
      cid: image.id,
      contentType: blob.contentType,
    });
  }

  const known = new Set(attachments.map((attachment) => attachment.cid));
  const markdown = mapPostImageRefs(post.body, (id, alt) =>
    known.has(id) ? `![${alt}](cid:${id})` : null,
  );
  const html = String(await markdownToHtml.process(markdown));
  return { html, attachments };
}
