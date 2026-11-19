import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermissionInCurrentView } from "@/lib/auth/session";
import { resolveShortId } from "@/lib/short-id/resolve";

/**
 * Router für QR-Short-IDs (#545, Epic #542): `short.oecher-meeples.org/id/…`
 * leitet extern hierher weiter, `resolveShortId()` entscheidet je Präfix und
 * Recht, wohin es weitergeht. Auth-frei — die Codes kleben auf
 * Spielekartons, die Event-Gäste scannen; was sie am Ziel sehen, regelt die
 * Zielseite selbst.
 */
export default async function ShortIdPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const canManageGames =
    !!user && (await hasPermissionInCurrentView(user.id, "games:manage"));

  const resolution = await resolveShortId(slug, { canManageGames });
  if (resolution.kind === "not-found") notFound();

  redirect(resolution.href);
}
