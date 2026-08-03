export type SparePartListingInput = {
  title: string;
  boardGameId?: string | null;
  condition: string;
  description?: string | null;
  keeperMeepleId: string;
};

export function validateSparePartListingInput(input: SparePartListingInput) {
  if (!input.title.trim()) {
    return "Bitte einen Titel angeben.";
  }
  if (!input.condition.trim()) {
    return "Bitte einen Zustand angeben.";
  }
  if (!input.keeperMeepleId) {
    return "Bitte eine:n Verwahrer:in angeben.";
  }
  return null;
}

export function toSparePartListingData(input: SparePartListingInput) {
  return {
    title: input.title.trim(),
    boardGameId: input.boardGameId ?? null,
    condition: input.condition.trim(),
    description: input.description?.trim() || null,
    keeperMeepleId: input.keeperMeepleId,
  };
}
