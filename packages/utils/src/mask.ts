/** +994 telefon köməkçiləri (PRD §62) */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** İstənilən daxiletməni "+994XXXXXXXXX" formatına (9 milli rəqəm) çevirir. */
export function normalizeAzPhone(value: string): string {
  let d = digitsOnly(value);
  if (d.startsWith("994")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return "+994" + d.slice(0, 9);
}

/** Yazarkən rəqəmləri "+994 (50) 123-45-67" formatında göstərir. */
export function formatAzPhone(value: string): string {
  let d = digitsOnly(value);
  if (d.startsWith("994")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  d = d.slice(0, 9);
  let out = "+994";
  if (d.length > 0) out += " (" + d.slice(0, 2);
  if (d.length >= 2) out += ")";
  if (d.length > 2) out += " " + d.slice(2, 5);
  if (d.length > 5) out += "-" + d.slice(5, 7);
  if (d.length > 7) out += "-" + d.slice(7, 9);
  return out;
}

export function isValidAzPhone(value: string): boolean {
  const n = normalizeAzPhone(value);
  return /^\+994(10|12|50|51|55|60|70|77|99)\d{7}$/.test(n);
}

/** "+994501234567" → "+994 (50) ***-**-67" (PRD §70) */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return "";
  const n = normalizeAzPhone(value);
  const d = n.slice(4);
  if (d.length < 9) return formatAzPhone(value);
  return `+994 (${d.slice(0, 2)}) ***-**-${d.slice(7, 9)}`;
}

/** VÖEN — 10 rəqəm. "1234567891" → "12******91" */
export function maskVoen(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length < 4) return value;
  return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
}

export function isValidVoen(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export function maskEmail(value: string | null | undefined): string {
  if (!value) return "";
  const [user, domain] = value.split("@");
  if (!user || !domain) return value;
  return user.slice(0, 2) + "***@" + domain;
}
