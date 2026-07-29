/** Strips spaces and dashes; EANs are otherwise digits-only. */
export function normaliseEan(raw: string) {
  return raw.replace(/[\s-]/g, "");
}

function checksum(digits: string) {
  // EAN/UPC check digit: from the rightmost digit (the check digit itself),
  // alternate weights 3 and 1 across the remaining digits, from the right.
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const weight = (body.length - i) % 2 === 0 ? 1 : 3;
    sum += Number(body[i]) * weight;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(digits.at(-1));
}

/** EAN-13 and EAN-8, including the check digit. No external dependency. */
export function isValidEan(raw: string) {
  const ean = normaliseEan(raw);
  if (!/^\d{8}$/.test(ean) && !/^\d{13}$/.test(ean)) return false;
  return checksum(ean);
}
