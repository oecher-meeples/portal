import { headers } from "next/headers";

/** Ermittelt den Origin (Schema + Host) der aktuellen Anfrage aus den
 * Request-Headern – funktioniert unabhängig davon, unter welcher Domain
 * die Instanz gerade erreichbar ist (Preview-Deployments, mehrere Hosts). */
export async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return "";
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
