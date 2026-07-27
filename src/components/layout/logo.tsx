import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-md font-bold">
        OM
      </span>
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
