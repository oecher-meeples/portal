"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { leaveLfgPost } from "@/components/feature/lfg/actions";

export function LeaveLfgButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    await leaveLfgPost(postId);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Button variant="outline" disabled={isSubmitting} onClick={handleClick}>
      {isSubmitting ? "Verlasse…" : "Verlassen"}
    </Button>
  );
}
