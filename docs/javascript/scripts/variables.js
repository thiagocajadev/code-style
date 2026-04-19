// Princípios: imutabilidade por padrão, sem valores mágicos, CQS

const MAX_RETRIES = 3;
const ONE_DAY_MS = 86_400_000;
const ORDER_STATUS_APPROVED = 2;

const order = { id: 1, total: 100, status: ORDER_STATUS_APPROVED };
const discountedOrder = applyDiscount(order);

console.log("original:", order);
console.log("discounted:", discountedOrder);
console.log("max retries:", MAX_RETRIES);
console.log("one day ms:", ONE_DAY_MS);

function applyDiscount(order) {
  const discountedOrder = {
    ...order,
    discount: 10,
    total: order.total - 10,
  };
  return discountedOrder;
}
