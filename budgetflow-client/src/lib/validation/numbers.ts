import { z } from "zod";

export function positiveNumberInput(label: string) {
  return z.coerce.number().finite(`${label} must be a valid number.`).positive(`${label} must be greater than zero.`);
}

export function nonNegativeNumberInput(label: string) {
  return z.coerce.number().finite(`${label} must be a valid number.`).min(0, `${label} cannot be negative.`);
}
