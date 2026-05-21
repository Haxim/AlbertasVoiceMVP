import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

export function normalizePhone(phone?: string | null) {
  const value = phone?.trim();
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value, "CA");
  if (parsed?.isValid()) return parsed.number;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
