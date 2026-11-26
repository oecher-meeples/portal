import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  extractPostImageIds,
  mapPostImageRefs,
} from "@/lib/content/post-images";
import { UserFacingError } from "@/lib/utils/action-result";
import { prisma } from "@/lib/utils/prisma";
import { getBlob } from "@/lib/utils/s3";

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
  const html = renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm],
        urlTransform: (url: string) =>
          url.startsWith("cid:") ? url : defaultUrlTransform(url),
      },
      markdown,
    ),
  );
  return { html, attachments };
}
