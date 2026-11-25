"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** Zugeklappte Karte mit Zähler-Badge vor der Überschrift („[3] Offene
 * Spielergesuche") — der Inhalt erscheint erst nach dem Aufklappen. Gemeinsame
 * Hülle der Listen-Karten auf der Spieledetailseite. */
export function CountAccordionCard({
  count,
  label,
  children,
}: {
  count: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <Accordion>
        <AccordionItem value="content" className="border-b-0">
          <AccordionTrigger className="font-serif text-lg">
            <span className="flex items-center gap-2">
              <Badge>{count}</Badge>
              {label}
            </span>
          </AccordionTrigger>
          <AccordionPanel>{children}</AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
