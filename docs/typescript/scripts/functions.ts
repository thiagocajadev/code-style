// Princípios: tipagem explícita, parâmetros nomeados, overloads, SLA

type CartItem = {
  readonly productId: string;
  readonly price: number;
  readonly quantity: number;
};

type Cart = {
  readonly userId: number;
  readonly items: CartItem[];
};

type Invoice = {
  readonly userId: number;
  readonly subtotal: number;
  readonly discount: number;
  readonly total: number;
};

const cart: Cart = {
  userId: 42,
  items: [
    { productId: "product-a", price: 50, quantity: 2 },
    { productId: "product-b", price: 30, quantity: 1 },
  ],
};

const invoice = buildInvoice(cart);
console.log(invoice);
console.log(formatCurrency(invoice.total));
console.log(formatCurrency(invoice.total, "EUR"));

function buildInvoice(cart: Cart): Invoice {
  const subtotal = computeSubtotal(cart.items);
  const discount = computeDiscount(subtotal);
  const total = subtotal - discount;

  const invoice: Invoice = { userId: cart.userId, subtotal, discount, total };

  return invoice;
}

function computeSubtotal(items: CartItem[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal;
}

function computeDiscount(subtotal: number): number {
  const DISCOUNT_THRESHOLD = 100;
  const DISCOUNT_RATE = 0.1;

  const isEligible = subtotal >= DISCOUNT_THRESHOLD;
  if (!isEligible) return 0;

  const discount = subtotal * DISCOUNT_RATE;

  return discount;
}

function formatCurrency(amount: number, currency?: string): string;
function formatCurrency(amount: number, currency: string): string;
function formatCurrency(amount: number, currency = "BRL"): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amount);

  return formatted;
}
