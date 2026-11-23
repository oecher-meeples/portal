import type { ContributorRole } from "@prisma/client";

export const CONTRIBUTOR_ROLE_LABELS: Record<ContributorRole, string> = {
  PUBLISHER: "Verlag",
  AUTHOR: "Autor",
  ILLUSTRATOR: "Illustrator",
};
