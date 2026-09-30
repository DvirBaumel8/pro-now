/**
 * The address on the home screen's chip, short enough for one line: the
 * saved label when there is one ("הבית"), otherwise street, number and city
 * from the geocoder's "18, אהרון דוד גורדון, תל־אביב־יפו, …".
 */
export function shortAddressHe(address: { label: string | null; formatted: string }): string {
  if (address.label?.trim()) return address.label.trim();
  const parts = address.formatted.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3 && /^\d+[א-ת]?$/.test(parts[0]!)) return `${parts[1]} ${parts[0]}, ${parts[2]}`;
  return parts.slice(0, 2).join(", ");
}
