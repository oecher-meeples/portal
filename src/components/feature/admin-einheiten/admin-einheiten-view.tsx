import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreateStorageUnitDialog,
  type ScannedUnitPrefill,
} from "@/components/feature/admin-einheiten/create-storage-unit-dialog";
import {
  AssignKeeperDialog,
  type KeeperOption,
} from "@/components/feature/admin-einheiten/assign-keeper-dialog";
import { PageContainer } from "@/components/ui/page-container";

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
  scannedUnit,
}: {
  units: StorageUnitRow[];
  resignedHolders: ResignedHolderRow[];
  isAdmin: boolean;
  selfMeepleId: string;
  keeperOptions: KeeperOption[];
  /** Gescanntes, unbekanntes Etikett (`?neu=box-0001`, #549) — öffnet den
   * Anlegen-Dialog mit festem Code. Nur für Admins gesetzt. */
  scannedUnit?: ScannedUnitPrefill;
}) {
  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Ludothek"
        title="Aufbewahrungseinheiten"
        description="Aufbewahrungseinheiten sind die Kartons/Regal mit QR-Codes, welche für die Einlagerung oder Events verwendet werden."
        action={
          isAdmin ? (
            <CreateStorageUnitDialog prefill={scannedUnit} />
          ) : undefined
        }
      />

      {isAdmin && resignedHolders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bestände bei ausgetretenen Mitgliedern</CardTitle>
            <CardDescription>
              Rückholliste — diese Personen haben den Verein verlassen und haben
              noch Vereinsspiele oder -einheiten.
            </CardDescription>
          </CardHeader>
          <ul className="flex flex-col divide-y text-sm">
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
        </Card>
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
    </PageContainer>
  );
}
