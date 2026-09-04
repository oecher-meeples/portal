import { NextResponse } from "next/server";
import { findPublicDownloadByTitle } from "@/lib/downloads/downloads";

/**
 * Stabile Redirect-Route (#423) statt eines hart codierten Links auf
 * `fileUrl` — `title` ist im `Download`-Modell frei editierbar, ein fester
 * Link würde beim nächsten Admin-Reupload lautlos brechen. Leitet auf die
 * aktuelle Datei weiter, 404 wenn (noch) kein passender Download existiert.
 */
export async function GET() {
  const download = await findPublicDownloadByTitle("Mitgliedsantrag");
  if (!download) {
    return new NextResponse("Not Found", { status: 404 });
  }
  return NextResponse.redirect(download.fileUrl);
}
