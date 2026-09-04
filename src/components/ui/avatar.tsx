"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";

import { cn } from "@/lib/utils/cn";

/**
 * Sechs Stufen zur freien Wahl (Audit ergab nur zwei tatsächlich genutzte
 * Kontexte, aber bewusst nicht darauf eingeschränkt — künftige
 * Aufrufstellen sollen frei entscheiden können). `size` bleibt Pflicht-Prop
 * — kein stiller Default, der unbemerkt eine falsche Stufe einführt (siehe
 * die LFG-Inkonsistenz, die das ausgelöst hat).
 *
 * `sm` = 40px (Untergrenze, ab der ein Foto überhaupt noch als Foto
 * erkennbar ist): sm 40 → md 56 → lg 72 → xl 96 → xxl 128 → xxxl 170px.
 * Kein fester Schritt, sondern experimentell gewählte Werte. Nicht alle
 * treffen ein Tailwind-Standard-`size-*`-Token — daher per Arbitrary-Value
 * (`size-[…px]`).
 */
export type AvatarSize = "sm" | "md" | "lg" | "xl" | "xxl" | "xxxl";

function Avatar({
  className,
  size,
  ...props
}: AvatarPrimitive.Root.Props & {
  size: AvatarSize;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar after:border-border relative flex shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:mix-blend-darken data-[size=lg]:size-[72px] data-[size=md]:size-[56px] data-[size=sm]:size-[40px] data-[size=xl]:size-[96px] data-[size=xxl]:size-[128px] data-[size=xxxl]:size-[170px] dark:after:mix-blend-lighten",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-sm",
        className,
      )}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group *:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "bg-muted text-muted-foreground ring-background relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
};
