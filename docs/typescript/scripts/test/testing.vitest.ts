// @ts-nocheck
// Vitest — framework moderno, suporte nativo a TypeScript e ESM
// Referência: copiar para .ts e instalar vitest antes de executar
// Executar: vitest run testing.vitest.ts
// Convenção: expect(actual).toBe(expected) — actual em expect(), expected em toBe()

import { describe, it, expect } from "vitest";

function applyDiscount(price: number, discountPct: number): number {
  if (discountPct <= 0) return price;

  const discountedPrice = price * (1 - discountPct / 100);

  return discountedPrice;
}

function formatName(first: string, last: string): string {
  const fullName = `${first} ${last}`;
  return fullName;
}

describe("applyDiscount", () => {
  it("applies percentage discount to price", () => {
    const price = 100;

    const actualPrice = applyDiscount(price, 10);

    const expectedPrice = 90;
    expect(actualPrice).toBe(expectedPrice);
  });

  it("returns original price when discount is zero", () => {
    const price = 100;

    const actualPrice = applyDiscount(price, 0);

    const expectedPrice = price;
    expect(actualPrice).toBe(expectedPrice);
  });
});

describe("formatName", () => {
  it("formats first and last name into full name", () => {
    const actualName = formatName("John", "Doe");

    const expectedName = "John Doe";
    expect(actualName).toBe(expectedName);
  });
});
