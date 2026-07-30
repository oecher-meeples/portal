"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePost } from "@/components/feature/admin-news/actions";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Beitrag wirklich löschen?")) return;
    setIsPending(true);
    await deletePost(postId);
    setIsPending(false);
    router.refresh();
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="size-4" />
      Löschen
    </Button>
  );
}
