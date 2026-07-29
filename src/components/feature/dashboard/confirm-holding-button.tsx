"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { scanConfirmHolding } from "@/components/feature/scan/actions";

export function ConfirmHoldingButton({ holdingId }: { holdingId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    await scanConfirmHolding(holdingId);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <Button size="sm" disabled={isSubmitting} onClick={handleClick}>
      {isSubmitting ? "Bestätige…" : "Bestätigen"}
    </Button>
  );
}
