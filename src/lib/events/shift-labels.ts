import type { ShiftType } from "@prisma/client";

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  THEKE: "Theke",
  KASSE: "Kasse",
  LEIHE: "Leihe",
};
