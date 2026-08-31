import { redirect } from "next/navigation";

/** Ersetzt durch den Popup-Dialog auf /admin/einstellungen (#350) — die
 * eigene Seite ist keine Route mehr, nur ein Redirect für alte Links. */
export default function AdminInviteSettingsRedirectPage() {
  redirect("/admin/einstellungen");
}
