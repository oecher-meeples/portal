import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildExportDays } from "./shift-plan-export";
import { renderShiftPlanPdf } from "./shift-plan-pdf";

function days(count: number) {
  const eventDays = Array.from({ length: count }, (_, i) => ({
    id: `d${i}`,
    date: new Date(2026, 11, 4 + i),
  }));
  const shifts = eventDays.map((d) => ({
    dayId: d.id,
    roleId: "kueche",
    roleName: "Küche",
    capacity: 2,
    targetStartsAt: new Date(2026, 11, 4 + eventDays.indexOf(d), 10),
    targetEndsAt: new Date(2026, 11, 4 + eventDays.indexOf(d), 18),
  }));
  const bookings = eventDays.map((d, i) => ({
    dayId: d.id,
    roleId: "kueche",
    helperId: "m1",
    name: "Zoë Müller – 日本",
    startsAt: new Date(2026, 11, 4 + i, 10),
    endsAt: new Date(2026, 11, 4 + i, 14),
    slotIndex: null,
  }));
  return buildExportDays(eventDays, shifts, bookings);
}

async function load(bytes: Uint8Array) {
  return PDFDocument.load(bytes);
}

describe("renderShiftPlanPdf", () => {
  it("puts a few days on one landscape page", async () => {
    const pdf = await load(await renderShiftPlanPdf(days(2)));
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
  });

  it("breaks between days when they do not fit", async () => {
    const pdf = await load(await renderShiftPlanPdf(days(12)));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
