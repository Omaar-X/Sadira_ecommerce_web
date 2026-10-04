/**
 * Bangladeshi mobile numbers. Accepts what customers usually type —
 * 01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX, with optional spaces or dashes —
 * and normalises to "+8801XXXXXXXXX". Operator prefixes are 013–019.
 */

const BD_MOBILE = /^(?:\+?88)?(01[3-9]\d{8})$/;

/** "+8801XXXXXXXXX", or null if it isn't a valid Bangladeshi mobile number. */
export function normalizeBangladeshiPhone(input: string): string | null {
  const match = input.replace(/[\s\-().]/g, "").match(BD_MOBILE);
  return match ? `+88${match[1]}` : null;
}

export function isValidBangladeshiPhone(input: string): boolean {
  return normalizeBangladeshiPhone(input) !== null;
}

/** "+8801912345678" → "01912345678" (how customers write it). */
export function toLocalBangladeshiPhone(input: string): string {
  const normalized = normalizeBangladeshiPhone(input);
  return normalized ? normalized.slice(3) : input;
}
