"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { disconnectInstagram } from "@/components/feature/admin-settings/actions";
import { PageContainer } from "@/components/ui/page-container";

export function InstagramConnectionView({
  connected,
  expiresAt,
}: {
  connected: boolean;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    setIsDisconnecting(true);
    setError(null);
    const result = await disconnectInstagram();
    setIsDisconnecting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <PageContainer className="gap-4">
      <div className="flex items-center gap-2">
        <Badge variant={connected ? "default" : "outline"}>
          {connected ? "Verbunden" : "Nicht verbunden"}
        </Badge>
        {connected && expiresAt && (
          <span className="text-muted-foreground text-sm">
            Token gültig bis {new Date(expiresAt).toLocaleDateString("de-DE")}
          </span>
        )}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        {!connected && (
          <Button
            render={
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- API route redirect, not a page
              <a href="/api/auth/instagram/connect">Mit Instagram verbinden</a>
            }
          />
        )}
        {connected && (
          <Button
            variant="destructive"
            disabled={isDisconnecting}
            onClick={handleDisconnect}
          >
            {isDisconnecting ? "Trenne…" : "Trennen"}
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
