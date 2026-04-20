// Princípios: retorno antecipado, fluxo linear, lookup table

const STATUS_LABELS = {
  pending: "Aguardando",
  approved: "Aprovado",
  cancelled: "Cancelado",
};

console.log(processOrder(null));
console.log(processOrder({ items: [], status: "pending" }));
console.log(processOrder({ items: [{ price: 50 }, { price: 30 }], status: "pending" }));

console.log(getStatusLabel("approved"));
console.log(getStatusLabel("unknown"));

function processOrder(order) {
  if (!order) return null;
  if (!order.items.length) return null;
  if (order.status !== "pending") return null;

  const total = order.items.reduce((sum, item) => sum + item.price, 0);
  const processedOrder = { ...order, total, status: "approved" };

  return processedOrder;
}

function getStatusLabel(status) {
  const label = STATUS_LABELS[status] ?? "Desconhecido";
  return label;
}
