// Princípios: async/await, Promise.all, dependências explícitas, entry point limpo

type User = {
  readonly id: number;
  readonly name: string;
};

type Order = {
  readonly id: number;
  readonly userId: number;
  readonly total: number;
};

type Dashboard = {
  readonly user: User;
  readonly orders: Order[];
};

fetchDashboard(1).then(console.log);

async function fetchDashboard(userId: number): Promise<Dashboard> {
  const [user, orders] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
  ]);

  const dashboard: Dashboard = { user, orders };

  return dashboard;
}

async function fetchUser(id: number): Promise<User> {
  await wait(100);
  const user: User = { id, name: "Alice" };

  return user;
}

async function fetchOrders(userId: number): Promise<Order[]> {
  await wait(80);
  const orders: Order[] = [{ id: 10, userId, total: 150 }];

  return orders;
}

function wait(ms: number): Promise<void> {
  const delay = new Promise<void>((resolve) => setTimeout(resolve, ms));
  return delay;
}
