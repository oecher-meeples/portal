import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  Newspaper,
  Pencil,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateShort } from "@/lib/format";
import { Tooltip } from "@/components/ui/tooltip";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { DeletePostButton } from "@/components/feature/admin-news/delete-post-button";

const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  BLOG: { label: "Blog", icon: Newspaper },
  TERMIN: { label: "Termin", icon: CalendarDays },
  TURNIER: { label: "Turnier", icon: Trophy },
};

export default async function AdminNewsPage() {
  await requirePermission("posts:write");

  const posts = await prisma.post.findMany({ orderBy: { date: "desc" } });

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
                      {post.internal && (
                        <Tooltip content="Nur intern sichtbar">
                          <Image
                            src="/meeple-150x150.png"
                            alt="Nur intern sichtbar"
                            width={16}
                            height={16}
                            className="size-4 shrink-0"
                          />
                        </Tooltip>
                      )}
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
                    {formatDateShort(post.date.toISOString().slice(0, 10))}
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
                      <DeletePostButton postId={post.id} />
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
