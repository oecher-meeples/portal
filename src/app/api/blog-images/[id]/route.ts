import { getCurrentUser } from "@/lib/auth/server";
import { getSessionTier } from "@/lib/auth/session";
import { resolveNewsVisibility } from "@/lib/content/news-visibility";
import { canViewPostImage } from "@/lib/content/post-images";
import {
  canManagePostType,
  getPostPermissions,
} from "@/lib/content/post-permissions";
import { prisma } from "@/lib/utils/prisma";
import { getBlob } from "@/lib/utils/s3";

const NOT_FOUND = () => new Response("Not found", { status: 404 });

/** Liefert ein Beitragsbild (#671) nur aus, wenn der Betrachter den Beitrag
 * sehen darf. Alles Nicht-Sichtbare ist ein 404 — nie 403, damit die
 * Existenz interner Bilder nicht verraten wird. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/blog-images/[id]">,
) {
  const { id } = await ctx.params;
  const image = await prisma.postImage.findUnique({
    where: { id },
    select: {
      key: true,
      post: { select: { status: true, internal: true } },
    },
  });
  if (!image) return NOT_FOUND();

  const [user, sessionTier] = await Promise.all([
    getCurrentUser(),
    getSessionTier(),
  ]);
  const [visibility, perms] = await Promise.all([
    resolveNewsVisibility(user, sessionTier),
    user ? getPostPermissions(user.id) : null,
  ]);
  const canEdit = perms
    ? image.post
      ? canManagePostType(perms, image.post.internal)
      : perms.canEditPublic || perms.canEditInternal
    : false;
  if (!canViewPostImage({ post: image.post, visibility, canEdit })) {
    return NOT_FOUND();
  }

  const blob = await getBlob(image.key);
  if (!blob) return NOT_FOUND();

  const isPublic = image.post?.status === "PUBLISHED" && !image.post.internal;
  return new Response(blob.bytes as BodyInit, {
    headers: {
      "Content-Type": blob.contentType,
      "Cache-Control": isPublic
        ? "public, max-age=3600"
        : "private, max-age=0, must-revalidate",
    },
  });
}
