/**
 * Strips the common Markdown syntax the post editor supports (#448) — for
 * plain, human-readable text where full Markdown-to-plain-text conversion
 * (a real parser) would be overkill, e.g. a body-derived excerpt preview.
 * Order matters: links and inline code first, so their delimiters don't
 * interfere with the simpler emphasis patterns; heading markers last, since
 * they're anchored to the line start and unaffected by the others.
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links: [text](url)
    .replace(/`([^`]*)`/g, "$1") // inline code: `code`
    .replace(/~~([^~]*)~~/g, "$1") // strikethrough: ~~text~~
    .replace(/\*\*([^*]*)\*\*/g, "$1") // bold: **text**
    .replace(/__([^_]*)__/g, "$1") // bold: __text__
    .replace(/\*([^*]*)\*/g, "$1") // italic: *text*
    .replace(/_([^_]*)_/g, "$1") // italic: _text_
    .replace(/^#{1,6}\s+/gm, ""); // headings: # / ## / … at line start
}
