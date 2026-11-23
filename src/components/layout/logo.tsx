"use client";

import Link from "next/link";
import Image from "next/image";
import { Tooltip } from "@/components/ui/tooltip";

export function Logo() {
  const environment = process.env.ENVIRONMENT ?? "development";

  const mark = (
    <Link href="/" className="flex shrink-0 items-center">
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
    </Link>
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
