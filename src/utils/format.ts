const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", // District of Columbia
]);

export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.trim();
};

export const isValidPhone = (value: string) => /^\(\d{3}\) \d{3}-\d{4}$/.test(value);
export const normalizeState = (value: string) => value.trim().toUpperCase();
export const isValidState = (value: string) => {
  const normalized = normalizeState(value);
  return /^[A-Z]{2}$/.test(normalized) && US_STATES.has(normalized);
};
export const normalizePostal = (value: string) => value.trim();
export const isValidPostal = (value: string) => /^\d{5}(?:-\d{4})?$/.test(value);
export const initCapCity = (value: string) =>
  value
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export const safeDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "Unknown Date";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString();
  } catch {
    return "Error Date";
  }
};

export const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
