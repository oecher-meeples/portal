"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { closeLfgPost } from "@/components/feature/lfg/actions";

export function CloseLfgButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    await closeLfgPost(postId);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      className="border-destructive/40 text-destructive hover:bg-destructive/10"
      disabled={isSubmitting}
      onClick={handleClick}
    >
      {isSubmitting ? "Schließe…" : "Gesuch schließen"}
    </Button>
  );
}
