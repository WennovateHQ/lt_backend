/**
 * Decimal conversion utilities for Prisma Decimal types
 */
import { Decimal } from '@prisma/client/runtime/library';

export const toNumber = (value: Decimal | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toNumber();
};

export const toDecimal = (value: number | null | undefined): Decimal | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return new Decimal(value);
};

export const convertDecimalFields = <T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T => {
  const converted = { ...obj };
  
  for (const field of fields) {
    if (converted[field] && typeof converted[field] === 'object' && 'toNumber' in converted[field]) {
      (converted[field] as any) = toNumber(converted[field] as Decimal);
    }
  }
  
  return converted;
};

export const convertArrayDecimalFields = <T extends Record<string, any>>(
  array: T[],
  fields: (keyof T)[]
): T[] => {
  return array.map(item => convertDecimalFields(item, fields));
};
