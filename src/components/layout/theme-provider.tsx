"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// next-themes (unmaintained since March 2025) injects an inline <script> to set the
// theme class before hydration and avoid a flash of the wrong theme. That script only
// ever runs server-side as part of the initial HTML, but React 19.2 added a dev-only
// warning for any non-async <script> rendered inside a component tree — a false
// positive here. Filtered until upstream fixes it: https://github.com/pacocoursey/next-themes/issues/387
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes(
        "Encountered a script tag while rendering React component",
      )
    ) {
      return;
    }
    originalError(...args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
