/**
 * Muss zum in prisma/seed-roles.ts gepflegten Permission-Key passen.
 * Lebt separat von cashier-actions.ts — eine "use server"-Datei darf laut
 * Next.js nur async Function-Exports (Server Actions) haben, ein
 * Konstanten-Export daneben lässt den Build ohne jede gültige Export
 * scheitern ("The module has no exports at all").
 */
export const FLEA_MARKET_CASHIER_PERMISSION_KEY = "events:manage";
