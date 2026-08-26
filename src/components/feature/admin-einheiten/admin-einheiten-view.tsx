import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateStorageUnitDialog } from "@/components/feature/admin-einheiten/create-storage-unit-dialog";
import {
  AssignKeeperDialog,
  type KeeperOption,
} from "@/components/feature/admin-einheiten/assign-keeper-dialog";

export type StorageUnitRow = {
  id: string;
  code: string;
  kind: "BOX" | "SHELF";
  label: string;
  locationChain: string;
  keeperMeepleId: string | null;
  keeperName: string | null;
  gameCount: number;
  retired: boolean;
};

export type ResignedHolderRow = {
  meepleName: string;
  gameCount: number;
  unitCount: number;
};

export function AdminEinheitenView({
  units,
  resignedHolders,
  isAdmin,
  selfMeepleId,
  keeperOptions,
}: {
  units: StorageUnitRow[];
  resignedHolders: ResignedHolderRow[];
  isAdmin: boolean;
  selfMeepleId: string;
  keeperOptions: KeeperOption[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Ludothek"
        title="Aufbewahrungseinheiten"
        description="Aufbewahrungseinheiten sind die Kartons/Regal mit QR-Codes, welche für die Einlagerung oder Events verwendet werden."
        action={isAdmin ? <CreateStorageUnitDialog /> : undefined}
      />

      {isAdmin && resignedHolders.length > 0 && (
        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">
            Bestände bei ausgetretenen Mitgliedern
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Rückholliste — diese Personen haben den Verein verlassen und haben
            noch Vereinsspiele oder -einheiten.
          </p>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {resignedHolders.map((holder) => (
              <li
                key={holder.meepleName}
                className="flex items-center justify-between py-2"
              >
                <span>{holder.meepleName}</span>
                <span className="text-muted-foreground">
                  {holder.gameCount} Spiele · {holder.unitCount} Einheiten
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Code</TableHead>
              <TableHead>Art</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Standort-Kette</TableHead>
              <TableHead>Verwahrer</TableHead>
              <TableHead>Spiele</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-mono">{unit.code}</TableCell>
                <TableCell>
                  {unit.kind === "BOX" ? "Karton" : "Regal"}
                </TableCell>
                <TableCell>{unit.label}</TableCell>
                <TableCell className="text-muted-foreground">
                  {unit.locationChain}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {unit.keeperName ?? "—"}
                </TableCell>
                <TableCell>{unit.gameCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    {unit.retired ? (
                      <StatusPill label="stillgelegt" tone="neutral" />
                    ) : (
                      <>
                        <AssignKeeperDialog
                          unitId={unit.id}
                          currentKeeperId={unit.keeperMeepleId}
                          currentKeeperName={unit.keeperName}
                          isAdmin={isAdmin}
                          keeperOptions={keeperOptions}
                          selfMeepleId={selfMeepleId}
                        />
                        <Link
                          href={`/admin/einheiten/${unit.id}`}
                          className="text-primary text-sm hover:underline"
                        >
                          Details
                        </Link>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isAdmin && (
        <Link
          href="/admin/einheiten/etiketten"
          className="text-primary w-fit text-sm hover:underline"
        >
          Etiketten drucken →
        </Link>
      )}
    </div>
  );
}
