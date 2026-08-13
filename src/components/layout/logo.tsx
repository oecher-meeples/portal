import Image from "next/image";
import Link from "next/link";
import { Tooltip } from "@/components/ui/tooltip";

export function Logo() {
  const environment = process.env.ENVIRONMENT ?? "development";

  const mark = (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <Image
        src="/icons/meeple.png"
        alt="Oecher Meeples Logo"
        width={32}
        height={32}
        className="size-8 shrink-0"
      />
      <span className="leading-tight">
        <span className="block font-serif text-base font-bold tracking-tight">
          Oecher Meeples
        </span>
        <span className="text-muted-foreground block text-[10px] font-medium tracking-wider uppercase">
          Ludothek &amp; Vereinsportal
        </span>
      </span>
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
