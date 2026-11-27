import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import type { ExportDay } from "@/lib/events/shift-plan-export";
import { formatTimePlain, formatWeekdayDate } from "@/lib/utils/format";

const PAGE_WIDTH = 841.89; // A4 quer
const PAGE_HEIGHT = 595.28;
const MARGIN = 28;
const TIME_COLUMN_WIDTH = 42;
const TITLE_HEIGHT = 20;
const HEADER_HEIGHT = 16;
const DAY_GAP = 14;
const LIST_LINE_HEIGHT = 11;
const MAX_ROW_HEIGHT = 18;
const MIN_ROW_HEIGHT = 8;
const GREY = rgb(0.85, 0.85, 0.85);
const BORDER = rgb(0.2, 0.2, 0.2);
const LIGHT_BORDER = rgb(0.75, 0.75, 0.75);

/** Standard-Helvetica kann nur WinAnsi (hier: Latin-1) — alles andere wird "?". */
function sanitize(text: string): string {
  return text.replace(/[^ -~ -ÿ]/g, "?");
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Größte Schrift (<= `max`), mit der `text` in die Box passt, nie unter `min`. */
function fitFontSize(
  text: string,
  font: PDFFont,
  maxWidth: number,
  maxHeight: number,
  max = 9,
  min = 4.5,
): number {
  const byHeight = Math.min(max, maxHeight * 0.75);
  const byWidth = (maxWidth / font.widthOfTextAtSize(text, 1)) * 0.95;
  return Math.max(min, Math.min(byHeight, byWidth));
}

type Layout = { rowHeight: number; height: number; listLines: string[][] };

function dayLayout(
  day: ExportDay,
  rowHeight: number,
  font: PDFFont,
  contentWidth: number,
): Layout {
  const listLines = day.lists.map((list) =>
    wrapText(
      sanitize(`${list.roleName} (${list.count} P.): ${list.names.join(", ")}`),
      font,
      8,
      contentWidth,
    ),
  );
  const listHeight = listLines.reduce(
    (sum, lines) => sum + lines.length * LIST_LINE_HEIGHT + 3,
    0,
  );
  const grid =
    day.columns.length > 0
      ? HEADER_HEIGHT + day.timeSlots.length * rowHeight
      : 0;
  return {
    rowHeight,
    height: TITLE_HEIGHT + grid + (listHeight > 0 ? listHeight + 4 : 0),
    listLines,
  };
}

function drawDay(
  page: PDFPage,
  day: ExportDay,
  layout: Layout,
  top: number,
  font: PDFFont,
  bold: PDFFont,
) {
  const contentWidth = PAGE_WIDTH - 2 * MARGIN;
  const { rowHeight } = layout;
  page.drawText(sanitize(formatWeekdayDate(day.date)), {
    x: MARGIN,
    y: top - 13,
    size: 12,
    font: bold,
  });
  let y = top - TITLE_HEIGHT;

  if (day.columns.length > 0) {
    const columnWidth = (contentWidth - TIME_COLUMN_WIDTH) / day.columnCount;
    const x0 = MARGIN + TIME_COLUMN_WIDTH;
    const gridTop = y - HEADER_HEIGHT;
    const gridHeight = day.timeSlots.length * rowHeight;
    const rowY = (row: number) => gridTop - (row + 1) * rowHeight;

    for (const group of day.columns) {
      const x = x0 + group.startColumn * columnWidth;
      const width = group.capacity * columnWidth;
      page.drawRectangle({
        x,
        y: gridTop,
        width,
        height: HEADER_HEIGHT,
        borderColor: BORDER,
        borderWidth: 0.7,
      });
      const label = sanitize(group.roleName);
      const size = fitFontSize(label, bold, width - 4, HEADER_HEIGHT, 9, 5);
      page.drawText(label, {
        x: x + (width - bold.widthOfTextAtSize(label, size)) / 2,
        y: gridTop + (HEADER_HEIGHT - size) / 2 + 1,
        size,
        font: bold,
      });
    }

    day.timeSlots.forEach((slot, row) => {
      if (rowHeight >= 9 || row % 2 === 0) {
        page.drawText(formatTimePlain(slot), {
          x: MARGIN + 2,
          y: rowY(row) + rowHeight / 2 - 3,
          size: 7,
          font,
        });
      }
      page.drawLine({
        start: { x: x0, y: rowY(row) },
        end: { x: x0 + day.columnCount * columnWidth, y: rowY(row) },
        thickness: 0.3,
        color: LIGHT_BORDER,
      });
    });

    for (const cell of day.greyCells) {
      page.drawRectangle({
        x: x0 + cell.column * columnWidth,
        y: rowY(cell.startRow + cell.rowSpan - 1),
        width: columnWidth,
        height: cell.rowSpan * rowHeight,
        color: GREY,
      });
    }
    for (const group of day.columns) {
      const x = x0 + group.startColumn * columnWidth;
      page.drawLine({
        start: { x, y: gridTop },
        end: { x, y: gridTop - gridHeight },
        thickness: 0.7,
        color: BORDER,
      });
    }
    page.drawRectangle({
      x: x0,
      y: gridTop - gridHeight,
      width: day.columnCount * columnWidth,
      height: gridHeight,
      borderColor: BORDER,
      borderWidth: 0.7,
    });

    for (const block of day.blocks) {
      const x = x0 + block.column * columnWidth;
      const height = block.rowSpan * rowHeight;
      const yBottom = rowY(block.startRow + block.rowSpan - 1);
      page.drawRectangle({
        x,
        y: yBottom,
        width: columnWidth,
        height,
        color: rgb(1, 1, 1),
        borderColor: BORDER,
        borderWidth: 0.9,
      });
      const label = sanitize(block.label);
      const size = fitFontSize(label, font, columnWidth - 4, height);
      page.drawText(label, {
        x: x + (columnWidth - font.widthOfTextAtSize(label, size)) / 2,
        y: yBottom + (height - size) / 2 + size * 0.2,
        size,
        font,
      });
    }
    y = gridTop - gridHeight;
  }

  y -= 4;
  for (const lines of layout.listLines) {
    for (const line of lines) {
      y -= LIST_LINE_HEIGHT;
      page.drawText(line, { x: MARGIN, y: y + 2, size: 8, font });
    }
    y -= 3;
  }
}

/**
 * Rendert den Schichtplan als PDF (#697), A4 quer: Tage untereinander,
 * Zeilenhöhe so skaliert, dass möglichst alle Tage auf eine Seite passen;
 * sonst Umbruch an Tagesgrenzen. Gibt die PDF-Bytes zurück.
 */
export async function renderShiftPlanPdf(
  days: ExportDay[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE_WIDTH - 2 * MARGIN;
  const available = PAGE_HEIGHT - 2 * MARGIN;

  const layoutAt = (rowHeight: number) =>
    days.map((day) => dayLayout(day, rowHeight, font, contentWidth));
  const totalHeight = (layouts: Layout[]) =>
    layouts.reduce((sum, l) => sum + l.height, 0) +
    DAY_GAP * Math.max(0, layouts.length - 1);

  // Größte einheitliche Zeilenhöhe, mit der alle Tage auf eine Seite passen.
  let rowHeight = MAX_ROW_HEIGHT;
  let layouts = layoutAt(rowHeight);
  while (totalHeight(layouts) > available && rowHeight > MIN_ROW_HEIGHT) {
    rowHeight -= 0.5;
    layouts = layoutAt(rowHeight);
  }

  // Reicht auch die Mindesthöhe nicht: Seitenumbruch an Tagesgrenzen.
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  layouts.forEach((layout, index) => {
    const gap = current.length > 0 ? DAY_GAP : 0;
    if (current.length > 0 && used + gap + layout.height > available) {
      pages.push(current);
      current = [];
      used = 0;
    }
    used += (current.length > 0 ? DAY_GAP : 0) + layout.height;
    current.push(index);
  });
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);

  for (const indices of pages) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let top = PAGE_HEIGHT - MARGIN;
    for (const index of indices) {
      let layout = layouts[index];
      if (layout.height > available) {
        // Ein einzelner zu hoher Tag wird auf die Seite gestaucht.
        const rows = Math.max(1, days[index].timeSlots.length);
        layout = dayLayout(
          days[index],
          Math.max(3, layout.rowHeight - (layout.height - available) / rows),
          font,
          contentWidth,
        );
      }
      drawDay(page, days[index], layout, top, font, bold);
      top -= layout.height + DAY_GAP;
    }
  }

  return pdf.save();
}
