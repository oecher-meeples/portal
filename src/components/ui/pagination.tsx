import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Seiten-Navigation für eine clientseitig paginierte Tabelle — Zustand
 * kommt aus `usePagination`/`useResponsivePageSize`. Rendert nichts ohne
 * Einträge; Seitenzahl und Prev/Next nur ab der zweiten Seite, das
 * Einträge-pro-Seite-Dropdown immer. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  totalItems: number;
  pageSizeOptions?: number[];
}) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <label className="text-muted-foreground flex items-center gap-2 text-sm">
        Einträge pro Seite
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Einträge pro Seite"
          className="border-input bg-background h-8 rounded-md border px-2 text-sm"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {pageCount > 1 && (
        <>
          <span className="text-muted-foreground text-sm">
            Seite {page + 1} von {pageCount}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Vorherige Seite"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Nächste Seite"
              disabled={page >= pageCount - 1}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
