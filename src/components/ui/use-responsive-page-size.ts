import { useMediaQuery } from "@/components/ui/use-media-query";
import { useLocalStorageState } from "@/components/ui/use-local-storage-state";

/** Tailwinds `md`-Breakpoint (siehe `tailwind.config`/Standardwerte). */
const MD_QUERY = "(min-width: 768px)";

/** Eine Speicherung für alle paginierten Tabellen (Mitglieder, Meeple, …) —
 * eine manuelle Wahl im Dropdown gilt geräteweit für jede von ihnen, nicht
 * nur für die Tabelle, in der gewählt wurde. */
const PAGE_SIZE_STORAGE_KEY = "table-page-size";

/**
 * Einträge pro Seite: `smallPageSize` unterhalb von `md` (mobil und `sm`)
 * bzw. `mdPageSize` ab `md`, solange niemand manuell etwas anderes gewählt
 * hat. Eine manuelle Wahl (Dropdown in `Pagination`) wird in `localStorage`
 * persistiert und gilt fortan geräteweit, auch über einen Breakpoint-Wechsel
 * hinweg — bis sie dort wieder gelöscht wird.
 */
export function useResponsivePageSize(
  smallPageSize: number,
  mdPageSize: number,
): [number, (next: number) => void] {
  const isMdUp = useMediaQuery(MD_QUERY);
  const defaultPageSize = isMdUp ? mdPageSize : smallPageSize;

  const [storedPageSize, setStoredPageSize] = useLocalStorageState<
    number | null
  >(PAGE_SIZE_STORAGE_KEY, null);

  return [storedPageSize ?? defaultPageSize, setStoredPageSize];
}
