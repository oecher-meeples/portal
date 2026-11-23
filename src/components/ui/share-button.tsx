"use client";

import { useState } from "react";
import { CheckIcon, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEEDBACK_DURATION_MS = 1500;

/** Teilt eine URL über die native Web-Share-API, wenn verfügbar – sonst
 * Fallback auf Zwischenablage mit kurzer "Kopiert!"-Rückmeldung. Fachfrei,
 * kapselt Share- und Clipboard-API. */
export function ShareButton({
  url,
  title,
  label = "Sag es weiter!",
}: {
  url: string;
  title?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Nutzer:in hat den Share-Dialog abgebrochen – kein Fehlerfall.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), FEEDBACK_DURATION_MS);
  }

  return (
    <Button variant="outline" onClick={handleShare}>
      {copied ? <CheckIcon /> : <Share2 />}
      {copied ? "Link kopiert!" : label}
    </Button>
  );
}
