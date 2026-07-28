import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { hasRole } from "@/lib/permissions";
import type { Tier } from "@/lib/nav-config";

export async function getSessionTier(): Promise<Tier> {
  const user = await getCurrentUser();
  if (!user) return "gast";
  if (await hasRole(user.id, "admin")) return "admin";
  return "mitglied";
}

export async function requireMember() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireMember();
  if (!(await hasRole(user.id, "admin"))) {
    redirect("/403");
  }
  return user;
}
