import { headers } from "next/headers";

/** Client-IP der aktuellen Anfrage aus den Proxy-Headern (Vercel setzt
 * `x-forwarded-for`) — `null`, falls keiner gesetzt ist (z. B. lokal ohne
 * Proxy). Nutzt nur den ersten Eintrag der Kette (die tatsächliche
 * Client-IP, nicht ein zwischengeschalteter Proxy). */
export async function getRequestIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerList.get("x-real-ip");
}
