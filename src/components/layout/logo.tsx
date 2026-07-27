import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <Image
        src="/meeple.png"
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
}
