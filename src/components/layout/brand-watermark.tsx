import Image from "next/image";

/**
 * Decorative background artwork, anchored to the bottom-left corner and
 * left unclipped so it overflows naturally into the page content rather
 * than being cut off by a fixed-size crop box. Sits behind all page
 * content (-z-10) and ignores pointer events, so it never blocks
 * interaction with what's drawn on top of it.
 *
 * Starts at `left-64` to clear the sidebar (`w-64`), which now has its
 * own opaque background and would otherwise just clip the artwork.
 *
 * Light and dark themes use dedicated source artwork (the dark variant
 * outlines shapes in white for contrast instead of relying on a CSS
 * filter). The black strip along the bottom of both images (the
 * skyline's ground line) is extended with a bar spanning the rest of
 * the viewport, so the "floor" reads as continuous all the way across.
 * In dark mode the bar gets the same thin white top edge the artwork
 * uses to outline its shapes, so the seam stays invisible.
 */
export function BrandWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-0 bottom-0 -z-10 hidden select-none md:left-64 md:block"
    >
      <div className="lg:h-2.6 h-s2.5 absolute inset-x-0 bottom-0 bg-black dark:h-[8.4pt] dark:border-t-[1.1pt] dark:border-white" />
      <Image
        src="/Logo-Oecher-Meeples.png"
        alt=""
        width={3840}
        height={1000}
        priority
        className="relative h-40 w-auto lg:h-56 dark:hidden"
      />
      <Image
        src="/oecher-meeples-header-dark.png"
        alt=""
        width={3840}
        height={1000}
        priority
        className="relative hidden h-40 w-auto lg:h-56 dark:block"
      />
    </div>
  );
}
