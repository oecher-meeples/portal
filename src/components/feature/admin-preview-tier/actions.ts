"use server";

import { cookies } from "next/headers";
import { TIER_ORDER, type Tier } from "@/lib/utils/nav-config";
import { PREVIEW_TIER_COOKIE, getRealSessionTier } from "@/lib/auth/session";

/**
 * Admin-only, UI-preview-only — see PREVIEW_TIER_COOKIE in @/lib/session.
 * The default (no cookie) view is "mitglied", so an explicit "admin" choice
 * is stored just like any other tier instead of clearing the cookie.
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
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Called on sign-out so the next login always starts back at the default ("mitglied") preview. */
export async function clearPreviewTier() {
  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_TIER_COOKIE);
}
