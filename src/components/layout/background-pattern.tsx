/**
 * Decorative background pattern, fixed to the viewport (not the page) so it
 * never scrolls with the content. Sits behind all page content (-z-10) and
 * ignores pointer events, so it never blocks interaction with what's drawn
 * on top of it.
 *
 * Light and dark themes use dedicated source artwork — the dark variant
 * uses lighter icon tones for contrast against a dark background instead of
 * relying on a CSS filter.
 */
export function BackgroundPattern() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 opacity-10 select-none"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-repeat dark:hidden"
        style={{ backgroundImage: "url(/games-pattern-light-bg.png)" }}
      />
      <div
        className="absolute inset-0 hidden bg-repeat dark:block"
        style={{ backgroundImage: "url(/games-pattern-dark-bg.png)" }}
      />
    </div>
  );
}
