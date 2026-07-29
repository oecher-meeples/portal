"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { revokeResignation } from "@/components/feature/admin-mitglieder/actions";

export function RevokeResignationButton({ meepleId }: { meepleId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    await revokeResignation(meepleId);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isSubmitting}
      onClick={handleClick}
    >
      {isSubmitting ? "Widerrufe…" : "Kündigung widerrufen"}
    </Button>
  );
}
