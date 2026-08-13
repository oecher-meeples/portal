import Link from "next/link";
import {
  CalendarDays,
  Newspaper,
  Pencil,
  Trash2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateShort } from "@/lib/utils/format";
import { InternalOnlyBadge } from "@/components/entities/internal-only-badge";
import { Tooltip } from "@/components/ui/tooltip";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { ActionButton } from "@/components/ui/action-button";
import { deletePost } from "@/components/feature/admin-news/actions";

const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  BLOG: { label: "Blog", icon: Newspaper },
  TERMIN: { label: "Termin", icon: CalendarDays },
  TURNIER: { label: "Turnier", icon: Trophy },
};

export type AdminNewsPostRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  date: string;
  internal: boolean | null;
  instagram: boolean | null;
  status: string;
};

export function AdminNewsView({ posts }: { posts: AdminNewsPostRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Redaktion"
        title="Beiträge"
        description="Blog, Termine und Turniere verwalten."
        action={
          <Button
            render={<Link href="/admin/news/new">+ Neuer Beitrag</Link>}
          />
        }
      />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Titel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const typeMeta = TYPE_META[post.type];
              const TypeIcon = typeMeta.icon;
              return (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/news/${post.slug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {post.title}
                      </Link>
                      {post.status === "DRAFT" && (
                        <Badge variant="secondary">Entwurf</Badge>
                      )}
                      {post.internal && <InternalOnlyBadge />}
                      {post.instagram && (
                        <Tooltip content="Für Instagram markiert">
                          <InstagramIcon
                            role="img"
                            aria-label="Für Instagram markiert"
                            className="text-muted-foreground size-4 shrink-0"
                          />
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Tooltip content={typeMeta.label}>
                      <span className="inline-flex items-center gap-1.5">
                        <TypeIcon
                          role="img"
                          aria-label={typeMeta.label}
                          className="text-accent size-4"
                        />
                        {typeMeta.label}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateShort(post.date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/admin/news/${post.id}/edit`}>
                            <Pencil className="size-4" />
                            Bearbeiten
                          </Link>
                        }
                      />
                      <ActionButton
                        variant="destructive"
                        size="sm"
                        confirm="Beitrag wirklich löschen?"
                        action={deletePost.bind(null, post.id)}
                      >
                        <Trash2 className="size-4" />
                        Löschen
                      </ActionButton>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
