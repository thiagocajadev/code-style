// Jest — framework mais popular, amplamente adotado no ecossistema Node/React
// Executar: jest testing.jest.js
// Convenção: expect(actual).toBe(expected) — actual em expect(), expected em toBe()

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
  it("applies percentage discount to order price", () => {
    const order = { price: 100, discountPct: 10 };

    const actualOrder = applyDiscount(order);

    const actualPrice = actualOrder.price;
    const expectedPrice = 90;
    expect(actualPrice).toBe(expectedPrice);
  });

  it("returns original order when discount is zero", () => {
    const order = { price: 100, discountPct: 0 };

    const actualOrder = applyDiscount(order);

    const expectedOrder = order;
    expect(actualOrder).toBe(expectedOrder);
  });
});

describe("formatName", () => {
  it("formats first and last name into full name", () => {
    const user = { first: "John", last: "Doe" };

    const actualName = formatName(user);

    const expectedName = "John Doe";
    expect(actualName).toBe(expectedName);
  });
});
