"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deletePost } from "@/components/feature/admin-news/actions";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Beitrag wirklich lÃ¶schen?")) return;
    setIsPending(true);
    await deletePost(postId);
    setIsPending(false);
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      LÃ¶schen
    </Button>
  );
}
