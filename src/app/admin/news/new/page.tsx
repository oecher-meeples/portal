import { PageHeading } from "@/components/ui/page-heading";
import { requirePostPermissions } from "@/lib/content/post-permissions";
import { PostForm } from "@/components/feature/admin-news/post-form";

export default async function NewPostPage() {
  const { user, canEditPublic, canEditInternal } =
    await requirePostPermissions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Redaktion" title="Neuer Beitrag" />
      <PostForm
        canEditPublic={canEditPublic}
        canEditInternal={canEditInternal}
        initialValues={{
          date: new Date().toISOString().slice(0, 10),
          author: user.name,
        }}
      />
    </div>
  );
}
