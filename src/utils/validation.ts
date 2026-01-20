import {
  initCapCity,
  isValidPhone,
  isValidPostal,
  isValidState,
  normalizePhone,
  normalizePostal,
  normalizeState,
} from "./format";

export const normalizeAndValidatePhone = (value: string) => {
  const normalized = normalizePhone(value);
  if (normalized && !isValidPhone(normalized)) {
    return { normalized, error: "Phone must use (###) ###-#### format." };
  }
  return { normalized, error: null };
};

export const normalizeAndValidateState = (value: string, label = "State") => {
  const normalized = normalizeState(value);
  if (!isValidState(normalized)) {
    return { normalized, error: `${label} must be a valid 2-letter US state code.` };
  }
  return { normalized, error: null };
};

export const normalizeAndValidatePostal = (
  value: string,
  label = "Postal code",
  allowBlank = false,
) => {
  const normalized = normalizePostal(value);
  if (allowBlank && normalized.length === 0) {
    return { normalized, error: null };
  }
  if (!isValidPostal(normalized)) {
    return { normalized, error: `${label} must be 5 digits or 5+4 (##### or #####-####).` };
  }
  return { normalized, error: null };
};

export const normalizeCity = (value: string) => initCapCity(value);
