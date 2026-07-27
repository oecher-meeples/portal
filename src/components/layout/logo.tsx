import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
        OM
      </span>
      <span className="leading-tight">
        <span className="block font-serif text-base font-bold tracking-tight">
          Oecher Meeples
        </span>
        <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Ludothek &amp; Vereinsportal
        </span>
      </span>
    </Link>
  );
}
