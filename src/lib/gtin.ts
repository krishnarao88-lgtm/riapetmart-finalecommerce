// GS1 barcodes (EAN-8, UPC-A, EAN-13, GTIN-14): the last digit is a mod-10 check over the others, weighted 3,1,3… from the right.

/** True when `code` is an 8, 12, 13 or 14 digit GTIN whose check digit is right. */
export function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Shop-made codes (GS1 in-store range 20–29, 13 digits) are not real GTINs; the Google feed skips them. */
export function isInternalCode(code: string): boolean {
  return /^2\d{12}$/.test(code);
}

/** UPC-E (8 digits, zeros squeezed out) to the full 12-digit UPC-A that Google expects. Null if not a UPC-E. */
export function upcEToUpcA(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const [ns, a, b, c, d, e, last, check] = [...code];
  const body =
    last <= "2" ? `${a}${b}${last}0000${c}${d}${e}`
    : last === "3" ? `${a}${b}${c}00000${d}${e}`
    : last === "4" ? `${a}${b}${c}${d}00000${e}`
    : `${a}${b}${c}${d}${e}0000${last}`;
  return `${ns}${body}${check}`;
}
