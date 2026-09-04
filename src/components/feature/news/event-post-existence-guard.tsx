"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyLinkedEventOrUnpublish } from "@/components/feature/news/actions";

/**
 * Nachgelagerter, ungecachter Existenz-/Sync-Check für einen
 * auto-generierten Termin-Beitrag (#463) — rendert nichts, blockiert nicht
 * den ersten Render (der Beitrag ist mit den bereits vorhandenen Daten
 * längst sichtbar, bevor dieser Effekt überhaupt läuft). Existiert der
 * verknüpfte Termin nicht mehr, wurde der Post serverseitig bereits auf
 * `DRAFT` gesetzt — hier nur noch die Weiterleitung zur Übersicht.
 */
export function EventPostExistenceGuard({ postId }: { postId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    verifyLinkedEventOrUnpublish(postId).then((result) => {
      if (!cancelled && !result.stillExists) {
        router.replace("/news");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [postId, router]);

  return null;
}
