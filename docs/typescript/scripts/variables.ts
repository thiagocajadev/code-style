// Princípios: imutabilidade por padrão, sem valores mágicos, CQS, const assertion

const STANDARD_DISCOUNT = 10 as const;
const APPROVED_STATUS = "approved" as const;

const order = { id: 1, total: 100, status: APPROVED_STATUS } as const satisfies Order;
const discounted = applyDiscount(order);

console.log("original:  ", order);
console.log("discounted:", discounted);
console.log("discount:  ", STANDARD_DISCOUNT);

type Order = {
  readonly id: number;
  readonly total: number;
  readonly status: string;
};

function applyDiscount(order: Order): Order {
  const discountedTotal = order.total - STANDARD_DISCOUNT;
  const discountedOrder: Order = { ...order, total: discountedTotal };

  return discountedOrder;
}
