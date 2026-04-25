// Vitest — alternativa moderna ao Jest, ESM-nativo e mais rápido
// Executar: vitest run testing.vitest.js
// Convenção: expect(actual).toBe(expected) — actual em expect(), expected em toBe()

import { test, describe, expect } from "vitest";

function applyDiscount(order) {
  if (order.discountPct <= 0) {
    return order;
  }

  const discountedPrice = order.price * (1 - order.discountPct / 100);
  return { ...order, price: discountedPrice };
}

function formatName({ first, last }) {
  const fullName = `${first} ${last}`;
  return fullName;
}

describe("applyDiscount", () => {
  test("applies percentage discount to order price", () => {
    const order = { price: 100, discountPct: 10 };

    const actualOrder = applyDiscount(order);

    const actualPrice = actualOrder.price;
    const expectedPrice = 90;
    expect(actualPrice).toBe(expectedPrice);
  });

  test("returns original order when discount is zero", () => {
    const order = { price: 100, discountPct: 0 };

    const actualOrder = applyDiscount(order);

    const expectedOrder = order;
    expect(actualOrder).toBe(expectedOrder);
  });
});

describe("formatName", () => {
  test("formats first and last name into full name", () => {
    const user = { first: "John", last: "Doe" };

    const actualName = formatName(user);

    const expectedName = "John Doe";
    expect(actualName).toBe(expectedName);
  });
});
