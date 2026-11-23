import { NextResponse } from "next/server";
import { resolveMemberByCalendarToken } from "@/lib/members/calendar-token";
import { fetchRawIcsText } from "@/lib/content/calendar";

/**
 * Personalisierter Abo-Feed für den internen Kalender (#438) — keine
 * Session/Cookie nötig oder möglich, der Abruf kommt von der Kalender-App
 * selbst im Hintergrund. Die URL trägt bewusst ein `.ics`-Suffix (für
 * Kalender-Apps, die das für die Erkennung brauchen), Next.js liefert es als
 * Teil des `[token]`-Segments — hier abgeschnitten, bevor der Token gegen
 * die DB aufgelöst wird.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: rawParam } = await params;
  const token = rawParam.replace(/\.ics$/, "");

  const member = await resolveMemberByCalendarToken(token);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const icsText = await fetchRawIcsText(process.env.ICS_FEED_URL_INTERNAL);
  if (icsText === null) {
    return NextResponse.json(
      { error: "Kalender-Feed aktuell nicht verfügbar." },
      { status: 502 },
    );
  }

  return new NextResponse(icsText, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="kalender-intern.ics"',
    },
  });
}
