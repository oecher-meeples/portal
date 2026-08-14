import { extractText } from "unpdf";

/**
 * Downloads a PDF from a Vercel Blob URL and returns its raw text — no
 * heading/paragraph parsing, no heuristics. The admin copy-pastes the result
 * into the sections editor by hand (see the plan's "keine automatische
 * KI-Gliederung"-Entscheidung).
 */
export async function extractPdfText(fileUrl: string): Promise<string> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(
      `PDF konnte nicht geladen werden (Status ${response.status}).`,
    );
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const { text } = await extractText(buffer, { mergePages: true });

  if (!text.trim()) {
    throw new Error("PDF enthält keinen extrahierbaren Text.");
  }

  return text;
}
