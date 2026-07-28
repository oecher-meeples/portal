export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-card rounded-lg border p-5">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-sm">{hint}</p>}
    </div>
  );
}
