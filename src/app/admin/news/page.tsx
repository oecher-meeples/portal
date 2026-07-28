import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
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
import { DeletePostButton } from "@/app/admin/news/delete-post-button";

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
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {post.type}
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
                          Bearbeiten
                        </Link>
                      }
                    />
                    <DeletePostButton postId={post.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
