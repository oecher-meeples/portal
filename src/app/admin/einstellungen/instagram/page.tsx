import { redirect } from "next/navigation";

/** Ersetzt durch den Popup-Dialog auf /admin/einstellungen (#351) — die
 * eigene Seite ist keine Route mehr, nur ein Redirect für alte Links. */
export default function AdminInstagramSettingsRedirectPage() {
  redirect("/admin/einstellungen");
}
