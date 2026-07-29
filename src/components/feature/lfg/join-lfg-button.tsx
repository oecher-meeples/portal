"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinLfgPost } from "@/components/feature/lfg/actions";

export function JoinLfgButton({
  postId,
  disabled,
  label,
}: {
  postId: string;
  disabled: boolean;
  label: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setError(null);
    const result = await joinLfgPost(postId);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" disabled={disabled || isSubmitting} onClick={handleClick}>
        {isSubmitting ? "Trage ein…" : label}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
