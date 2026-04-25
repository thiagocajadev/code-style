// node:test + node:assert/strict — built-in desde Node 18, sem dependências
// Executar: node --test testing.node.js
// Convenção: assert.strictEqual(actual, expected) — actual primeiro

import { test, describe } from "node:test";
import assert from "node:assert/strict";

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
    assert.strictEqual(actualPrice, expectedPrice);
  });

  test("returns original order when discount is zero", () => {
    const order = { price: 100, discountPct: 0 };

    const actualOrder = applyDiscount(order);

    const expectedOrder = order;
    assert.strictEqual(actualOrder, expectedOrder);
  });
});

describe("formatName", () => {
  test("formats first and last name into full name", () => {
    const user = { first: "John", last: "Doe" };

    const actualName = formatName(user);

    const expectedName = "John Doe";
    assert.strictEqual(actualName, expectedName);
  });
});
