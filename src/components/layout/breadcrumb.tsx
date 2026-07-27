"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { findNavItem } from "@/lib/nav-config";

export function Breadcrumb() {
  const pathname = usePathname();
  const item = findNavItem(pathname);
  if (!item) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span>{item.section}</span>
      <ChevronRight className="size-3.5" />
      <span className="text-foreground">{item.label}</span>
    </div>
  );
}
