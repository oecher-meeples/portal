import "server-only";
import { prisma } from "@/lib/utils/prisma";

export type TshirtSizeRow = {
  id: string;
  label: string;
  sortOrder: number;
  memberCount: number;
};

/** Alle T-Shirt-Größen, sortiert nach der admin-steuerbaren `sortOrder`
 * (#388) — bewusst nicht alphabetisch, Kindergrößen sollen vor
 * Erwachsenengrößen stehen können. `memberCount` treibt die
 * Lösch-Warnung in der Verwaltungs-UI. */
export async function listTshirtSizes(): Promise<TshirtSizeRow[]> {
  const sizes = await prisma.tshirtSize.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return sizes.map((size) => ({
    id: size.id,
    label: size.label,
    sortOrder: size.sortOrder,
    memberCount: size._count.members,
  }));
}

export async function createTshirtSize(label: string) {
  const trimmed = label.trim();
  if (!trimmed) {
    return { error: "Bitte eine Bezeichnung angeben." };
  }

  const existing = await prisma.tshirtSize.findUnique({
    where: { label: trimmed },
  });
  if (existing) {
    return { error: `„${trimmed}“ existiert bereits.` };
  }

  const highest = await prisma.tshirtSize.aggregate({
    _max: { sortOrder: true },
  });
  await prisma.tshirtSize.create({
    data: { label: trimmed, sortOrder: (highest._max.sortOrder ?? 0) + 1 },
  });

  return { success: true as const };
}

export async function renameTshirtSize(id: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) {
    return { error: "Bitte eine Bezeichnung angeben." };
  }

  const existing = await prisma.tshirtSize.findUnique({
    where: { label: trimmed },
  });
  if (existing && existing.id !== id) {
    return { error: `„${trimmed}“ existiert bereits.` };
  }

  await prisma.tshirtSize.update({ where: { id }, data: { label: trimmed } });
  return { success: true as const };
}

/** Persistiert eine vollständig neue Reihenfolge (Drag-and-Drop in der
 * Verwaltungs-UI) — analog dem `Role.sortOrder`-Pattern (#391). */
export async function reorderTshirtSizes(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.tshirtSize.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
  return { success: true as const };
}

/** `onDelete: SetNull` in der Migration löst das Zurücksetzen betroffener
 * `Member.tshirtSizeId` bereits auf DB-Ebene aus — hier nur die Löschung
 * selbst, kein manuelles Nachziehen nötig. */
export async function deleteTshirtSize(id: string) {
  await prisma.tshirtSize.delete({ where: { id } });
  return { success: true as const };
}
