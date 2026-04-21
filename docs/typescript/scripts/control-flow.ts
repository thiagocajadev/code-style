// Princípios: guard clauses, narrowing, type predicates, lookup table

type OrderStatus = "pending" | "approved" | "cancelled";

type Order = {
  id: number;
  total: number;
  status: OrderStatus;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Aguardando",
  approved: "Aprovado",
  cancelled: "Cancelado",
};

console.log(processOrder(null));
console.log(processOrder({ id: 1, total: 0, status: "pending" }));
console.log(processOrder({ id: 2, total: 150, status: "approved" }));

console.log(getStatusLabel("approved"));

function processOrder(order: Order | null): string {
  if (!order) return "order is required";
  if (order.total <= 0) return "total must be greater than zero";

  const label = buildOrderLabel(order);

  return label;
}

function buildOrderLabel(order: Order): string {
  const LABEL_BY_STATUS: Record<OrderStatus, string> = {
    approved: `Order ${order.id} approved for ${order.total}`,
    pending: `Order ${order.id} is pending review`,
    cancelled: `Order ${order.id} was cancelled`,
  };

  const label = LABEL_BY_STATUS[order.status];

  return label;
}

function getStatusLabel(status: OrderStatus): string {
  const label = STATUS_LABELS[status];
  return label;
}

function isApproved(order: Order): order is Order & { status: "approved" } {
  return order.status === "approved";
}

const sample: Order = { id: 3, total: 50, status: "approved" };
if (isApproved(sample)) {
  console.log("approved order:", sample.id);
}
