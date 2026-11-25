"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/ui/page-container";
import {
  erklaerbaerenHref,
  parseErklaerbaerenTab,
  type ErklaerbaerenTab,
} from "@/components/feature/erklaerbaeren/erklaerbaeren-url";

/** Rahmen der Erklärbären-Seite (#663): Tab „Meine Spiele“ für alle, Tab
 * „Erklärbär-Verzeichnis“ nur mit `events:manage` — ohne Verzeichnis entfällt
 * die Tab-Leiste. `children` ist der Inhalt des aktiven Tabs; die Seite lädt
 * so nur dessen Daten (und die des Verzeichnisses nur bei Berechtigung). */
export function ErklaerbaerenView({
  tab,
  showDirectory,
  children,
}: {
  tab: ErklaerbaerenTab;
  showDirectory: boolean;
  children: ReactNode;
}) {
  const router = useRouter();

  if (!showDirectory) {
    return <PageContainer>{children}</PageContainer>;
  }

  return (
    <PageContainer>
      <Tabs
        value={tab}
        onValueChange={(value) =>
          router.push(
            erklaerbaerenHref({ tab: parseErklaerbaerenTab(String(value)) }),
          )
        }
      >
        <TabsList>
          <TabsTrigger value="meine">Meine Spiele</TabsTrigger>
          <TabsTrigger value="verzeichnis">Erklärbär-Verzeichnis</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="pt-2">
          {children}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
