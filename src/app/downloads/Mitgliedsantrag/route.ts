import { NextResponse } from "next/server";
import { findPublicDownloadByTitle } from "@/lib/downloads/downloads";

/**
 * Stabile Redirect-Route (#423) statt eines hart codierten Links auf
 * `fileUrl` — `title` ist im `Download`-Modell frei editierbar, ein fester
 * Link würde beim nächsten Admin-Reupload lautlos brechen. Leitet auf die
 * aktuelle Datei weiter, 404 wenn (noch) kein passender Download existiert.
 * `fileUrl` ist seit #112 eine frisch signierte URL; App-Pfade aus `public/`
 * (Demo-Daten) werden gegen die Request-URL aufgelöst, weil `redirect` eine
 * absolute URL verlangt.
 */
export async function GET(request: Request) {
  const download = await findPublicDownloadByTitle("Mitgliedsantrag");
  if (!download) {
    return new NextResponse("Not Found", { status: 404 });
  }
  return NextResponse.redirect(new URL(download.fileUrl, request.url));
}
