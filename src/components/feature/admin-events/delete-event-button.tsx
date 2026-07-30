"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "@/components/feature/admin-events/actions";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    const result = await deleteEvent(eventId);
    setIsDeleting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="destructive"
        size="icon-sm"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="Event löschen"
      >
        <Trash2 className="size-4" />
      </Button>
      {error && <p className="text-destructive max-w-48 text-right text-xs">{error}</p>}
    </div>
  );
}
