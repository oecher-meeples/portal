import { Trash2 } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CoverMedia } from "@/components/ui/cover-media";
import { ActionButton } from "@/components/ui/action-button";
import { CreateLinkDialog } from "@/components/feature/admin-links/create-link-dialog";
import { EditLinkDialog } from "@/components/feature/admin-links/edit-link-dialog";
import { deleteImportantLink } from "@/lib/links/actions";

export type ImportantLinkRow = {
  id: string;
  title: string;
  targetUrl: string;
  iconUrl: string | null;
};

export function AdminLinksView({ links }: { links: ImportantLinkRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Administration"
        title="Wichtige Links"
        description="Kuratierte Links fürs Dashboard verwalten."
        action={<CreateLinkDialog />}
      />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Icon</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead>Ziel-URL</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.id}>
                <TableCell>
                  <CoverMedia
                    imageUrl={link.iconUrl}
                    alt=""
                    aspect="aspect-square"
                    className="w-8"
                  />
                </TableCell>
                <TableCell className="font-medium">{link.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  <a
                    href={link.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary hover:underline"
                  >
                    {link.targetUrl}
                  </a>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EditLinkDialog link={link} />
                    <ActionButton
                      variant="destructive"
                      size="sm"
                      confirm="Link wirklich löschen?"
                      action={deleteImportantLink.bind(null, link.id)}
                    >
                      <Trash2 className="size-4" />
                      Löschen
                    </ActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {links.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground text-center"
                >
                  Noch keine Links angelegt.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
