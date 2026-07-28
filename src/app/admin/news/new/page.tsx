import { PageHeading } from "@/components/shared/page-heading";
import { requirePermission } from "@/lib/permissions";
import { PostForm } from "@/app/admin/news/post-form";

export default async function NewPostPage() {
  await requirePermission("posts:write");

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Redaktion" title="Neuer Beitrag" />
      <PostForm />
    </div>
  );
}
