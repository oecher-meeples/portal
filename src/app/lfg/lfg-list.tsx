"use client";

import { useState } from "react";
import Link from "next/link";
import type { LfgRequest } from "@/data/lfg";
import { PillToggle } from "@/components/ui/pill-toggle";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { label: "Alle", value: "alle" },
  { label: "Offen", value: "offen" },
  { label: "Heute", value: "heute" },
] as const;

export function LfgList({ requests }: { requests: LfgRequest[] }) {
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]["value"]>("alle");

  const visible = requests.filter((request) => {
    if (filter === "offen") return request.status === "offen";
    if (filter === "heute")
      return request.date.toLowerCase().startsWith("heute");
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <PillToggle options={[...FILTERS]} value={filter} onChange={setFilter} />
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((request) => (
          <div
            key={request.id}
            className="bg-card flex flex-col gap-3 rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/lfg/${request.id}`}
                  className="hover:text-primary font-serif text-lg font-semibold"
                >
                  {request.title}
                </Link>
                <p className="text-muted-foreground text-sm">
                  {request.date}
                  {request.location && ` Â· ${request.location}`}
                </p>
              </div>
              <StatusPill
                label={request.status === "voll" ? "Voll" : "Offen"}
                tone={request.status === "voll" ? "negative" : "positive"}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-muted flex size-7 items-center justify-center rounded-full font-semibold">
                  {request.creator.initial}
                </span>
                {request.creator.name} Â· {request.participants.length}/
                {request.maxParticipants}
              </div>
              <Button
                size="sm"
                variant={request.status === "voll" ? "outline" : "default"}
                disabled={request.status === "voll"}
              >
                {request.status === "voll" ? "geschlossen" : "Mitspielen"}
              </Button>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-muted-foreground col-span-full text-sm">
            Keine Gesuche in dieser Ansicht.
          </p>
        )}
      </div>
    </div>
  );
}
