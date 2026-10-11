/** A district is not a city zone. Reject impossible claims without guessing courier coverage. */
export function deliveryZoneError(division: string, district: string, deliveryArea: string): string | null {
  if (deliveryArea !== "inside-dhaka") return null;
  const normalized = district.trim().toLowerCase().replace(/\s+/g, " ");
  if (division !== "Dhaka" || !["dhaka", "dhaka district", "ঢাকা", "ঢাকা জেলা"].includes(normalized)) {
    return "Inside Dhaka is only for Dhaka city addresses. Select Outside Dhaka for your district.";
  }
  return null;
}
