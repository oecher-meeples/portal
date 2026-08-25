"use client";

import { useState } from "react";
import Image from "next/image";
import { Tooltip } from "@/components/ui/tooltip";

export function Logo() {
  const environment = process.env.ENVIRONMENT ?? "development";
  const [showPrevious, setShowPrevious] = useState(false);

  const mark = (
    <button
      type="button"
      onClick={() => setShowPrevious((previous) => !previous)}
      className="flex shrink-0 items-center"
    >
      {showPrevious ? (
        <>
          <Image
            src="/icons/meeple.png"
            alt="Oecher Meeples Logo"
            width={32}
            height={32}
            className="size-8 shrink-0"
          />
          <span className="ml-2.5 leading-tight">
            <span className="block font-serif text-base font-bold tracking-tight">
              Oecher Meeples
            </span>
            <span className="text-muted-foreground block text-[10px] font-medium tracking-wider uppercase">
              Ludothek &amp; Vereinsportal
            </span>
          </span>
        </>
      ) : (
        <>
          <Image
            src="/icons/Logo-Oecher-Meeples.png"
            alt="Oecher Meeples Logo"
            width={3840}
            height={1000}
            priority
            className="h-16 w-auto dark:hidden"
          />
          <Image
            src="/icons/oecher-meeples-header-dark.png"
            alt="Oecher Meeples Logo"
            width={3840}
            height={1000}
            priority
            className="hidden h-16 w-auto dark:block"
          />
        </>
      )}
    </button>
  );

  if (environment === "production") return mark;

  return (
    <Tooltip
      content={`Du befindest dich gerade in der ${environment}-Umgebung.`}
    >
      {mark}
    </Tooltip>
  );
}
