import { prisma } from "../src/lib/utils/prisma";
import { FLEA_MARKET_CASHIER_PERMISSION_KEY } from "../src/lib/bringbuy/cashier-permission";

/**
 * Grund-Helferrollen (ADR-0012) — ohne diese kann für ein frisch
 * aufgesetztes Event noch keine Schicht angelegt werden. "Kasse" gewährt
 * während der gebuchten Schicht dieselbe Berechtigung wie `events:manage`
 * (siehe FLEA_MARKET_CASHIER_PERMISSION_KEY), die anderen Rollen gewähren
 * keine zusätzliche Berechtigung.
 */
const HELPER_ROLES = [
  { name: "Aufbau/Abbau", grantsPermissionKey: null },
  { name: "Spieletheke", grantsPermissionKey: null },
  { name: "Küche", grantsPermissionKey: null },
  { name: "Kasse", grantsPermissionKey: FLEA_MARKET_CASHIER_PERMISSION_KEY },
];

export async function seedHelperRoles() {
  for (const role of HELPER_ROLES) {
    await prisma.helperRole.upsert({
      where: { name: role.name },
      update: { grantsPermissionKey: role.grantsPermissionKey },
      create: role,
    });
  }

  console.log(`${HELPER_ROLES.length} Helferrollen angelegt/übersprungen.`);
}
