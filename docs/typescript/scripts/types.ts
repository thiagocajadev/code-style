// Princípios: interface vs type, generics, utility types, satisfies, narrowing

// --- Tipos base ---

type UserId = number;
type OrderId = number;

type OrderStatus = "pending" | "approved" | "cancelled";

type User = {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
};

type Order = {
  readonly id: OrderId;
  readonly userId: UserId;
  readonly total: number;
  readonly status: OrderStatus;
};

// --- Utility types ---

type CreateOrderInput = Omit<Order, "id" | "status">;
type OrderSummary = Pick<Order, "id" | "total" | "status">;
type PartialUser = Partial<User>;

// --- Generics ---

type PaginatedResult<T> = {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const offset = (page - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);

  const result: PaginatedResult<T> = { items: pageItems, total: items.length, page, pageSize };

  return result;
}

// --- satisfies: valida sem alargar o tipo ---

const STATUS_LABELS = {
  pending: "Aguardando",
  approved: "Aprovado",
  cancelled: "Cancelado",
} satisfies Record<OrderStatus, string>;

// --- Narrowing com discriminated union ---

type LoadingState = { readonly kind: "loading" };
type SuccessState<T> = { readonly kind: "success"; readonly data: T };
type ErrorState = { readonly kind: "error"; readonly message: string };
type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

function resolveLabel<T>(state: AsyncState<T>): string {
  if (state.kind === "loading") return "Carregando...";
  if (state.kind === "error") return `Erro: ${state.message}`;

  const label = `Carregado: ${JSON.stringify(state.data)}`;

  return label;
}

// --- Exercício ---

const orders: Order[] = [
  { id: 1, userId: 42, total: 130, status: "approved" },
  { id: 2, userId: 42, total: 80, status: "pending" },
  { id: 3, userId: 43, total: 200, status: "cancelled" },
];

const page = paginate(orders, 1, 2);
console.log("page:", page);

const orderLabel = STATUS_LABELS["approved"];
console.log("label:", orderLabel);

const state: AsyncState<Order[]> = { kind: "success", data: orders };
console.log(resolveLabel(state));
