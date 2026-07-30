"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  paginateLabels,
  selectLabels,
  type LabelSelection,
  type LabelUnit,
} from "@/lib/inventory/labels";
import { Button } from "@/components/ui/button";

function Label({
  unit,
  qrDataUrl,
}: {
  unit: LabelUnit;
  qrDataUrl: string | null;
}) {
  return (
    <div className="flex h-[3.2cm] w-[5.4cm] break-inside-avoid flex-col items-center justify-center gap-1 border border-dashed border-black/40 p-2">
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt={unit.code} className="h-[1.8cm] w-[1.8cm]" />
      ) : (
        <div className="h-[1.8cm] w-[1.8cm] bg-black/5" />
      )}
      <p className="text-center text-[10px] leading-tight font-medium">
        {unit.label}
      </p>
      <p className="font-mono text-[9px]">{unit.code}</p>
    </div>
  );
}

export function UnitLabelSheet({ units }: { units: LabelUnit[] }) {
  const [selection, setSelection] = useState<LabelSelection>("all");
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  const selected = selectLabels(units, selection);
  const pages = paginateLabels(selected);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      selected.map(async (unit) => {
        const dataUrl = await QRCode.toDataURL(unit.code, {
          margin: 0,
          width: 200,
        });
        return [unit.id, dataUrl] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setQrCodes(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {(
          [
            ["all", "Alle"],
            ["boxes", "Nur Kartons"],
            ["shelves", "Nur Regale"],
          ] as const
        ).map(([value, text]) => (
          <Button
            key={value}
            size="sm"
            variant={selection === value ? "default" : "outline"}
            onClick={() => setSelection(value)}
          >
            {text}
          </Button>
        ))}
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          Drucken
        </Button>
      </div>

      {pages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="grid grid-cols-3 justify-items-center gap-3 print:break-after-page"
        >
          {page.map((unit) => (
            <Label
              key={unit.id}
              unit={unit}
              qrDataUrl={qrCodes[unit.id] ?? null}
            />
          ))}
        </div>
      ))}

      <style>{`
        @media print {
          nav, header, aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}
