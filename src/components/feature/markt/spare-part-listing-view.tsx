import type { SparePartListingView } from "@/lib/inventory/spare-parts";

export function SparePartListingCard({ part }: { part: SparePartListingView }) {
  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
      <h3 className="font-serif font-semibold">{part.title}</h3>
      <p className="text-muted-foreground text-xs">
        Zustand: {part.condition}
      </p>
      {part.description && <p className="text-sm">{part.description}</p>}
      <p className="text-muted-foreground text-xs">
        Abzuholen bei {part.keeperDisplayName}
      </p>
    </div>
  );
}
