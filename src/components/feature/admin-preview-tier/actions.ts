"use server";

import { cookies } from "next/headers";
import { TIER_ORDER, type Tier } from "@/lib/utils/nav-config";
import { PREVIEW_TIER_COOKIE, getRealSessionTier } from "@/lib/auth/session";

/**
 * Admin-only, UI-preview-only — see PREVIEW_TIER_COOKIE in @/lib/session.
 * The default (no cookie) view is "admin"; every choice, "admin" included,
 * is stored so the switcher and the pages read the same value.
 * Survives sign-out on purpose: the next login on this device starts in the
 * last chosen view. Harmless for anyone else on the device — the cookie is
 * only ever read for real admins.
 */
export async function setPreviewTier(tier: Tier) {
  const realTier = await getRealSessionTier();
  if (realTier !== "admin" || !(TIER_ORDER as string[]).includes(tier)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_TIER_COOKIE, tier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
