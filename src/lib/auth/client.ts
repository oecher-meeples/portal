"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/** Talks to our own `/api/auth/*` route (same origin, no baseURL needed).
 * `emailOTPClient` provides `emailOtp.requestPasswordReset` /
 * `emailOtp.resetPassword` for the "Passwort vergessen" flow (#324). */
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});
