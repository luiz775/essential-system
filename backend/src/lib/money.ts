import { Prisma } from "@prisma/client";

export function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function toDecimal(value: number) {
  return new Prisma.Decimal(money(value).toFixed(2));
}

export function asNumber(value: Prisma.Decimal | string | number) {
  return money(Number(value));
}
