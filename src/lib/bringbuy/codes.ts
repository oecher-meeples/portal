const CODE_PATTERN = /^FM-(\d+)$/;

/**
 * Next free flea market item code, filling gaps left by deleted items instead of
 * only ever appending — same pattern as `nextUnitCode` (src/lib/inventory/codes.ts),
 * but a separate function since the prefix format differs (`FM-0001`).
 */
export function nextFleaMarketItemCode(existingCodes: string[]) {
  const usedNumbers = new Set(
    existingCodes
      .map((code) => {
        const match = CODE_PATTERN.exec(code);
        return match ? Number(match[1]) : null;
      })
      .filter((n): n is number => n !== null),
  );

  let next = 1;
  while (usedNumbers.has(next)) {
    next += 1;
  }

  return `FM-${String(next).padStart(4, "0")}`;
}
