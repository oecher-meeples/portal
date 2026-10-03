import {
  isCrossSiteRequest,
  parsePageViewBeacon,
  readBeaconBody,
  recordPageView,
  visitorOptedOut,
} from "@/lib/analytics/collect";

/**
 * Beacon-Endpunkt fürs In-App-Tracking (`navigator.sendBeacon` aus
 * `components/layout/page-view-beacon.tsx`). Öffentlich, ohne Auth — die
 * gesamte Prüfung liegt in `lib/analytics/collect.ts`. Verworfene Beacons
 * (Bot, ungültiger Pfad, DNT/GPC) bekommen dieselbe neutrale 204 wie
 * gezählte, damit Aufrufer nichts über die Filterregeln lernen.
 */
export async function POST(request: Request) {
  if (isCrossSiteRequest(request.headers)) {
    return new Response(null, { status: 403 });
  }

  const body = await readBeaconBody(request);
  if (body === null) {
    return new Response(null, { status: 413 });
  }

  if (!visitorOptedOut(request.headers)) {
    const pageView = parsePageViewBeacon({
      body,
      userAgent: request.headers.get("user-agent"),
      host:
        request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    });
    if (pageView) {
      try {
        await recordPageView(pageView);
      } catch (error) {
        // Tracking darf nie laut scheitern — der Besucher merkt davon nichts.
        console.error(
          "[analytics] PageView konnte nicht gespeichert werden",
          error,
        );
      }
    }
  }

  return new Response(null, { status: 204 });
}
