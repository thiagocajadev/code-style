// Princípios: I/O assíncrono, dependências explícitas, ponto de entrada limpo

fetchDashboard(1).then(console.log);

async function fetchDashboard(userId) {
  const [user, orders] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
  ]);

  const dashboard = { user, orders };
  return dashboard;
}

async function fetchUser(id) {
  await wait(100);

  const user = { id, name: "Alice" };
  return user;
}

async function fetchOrders(userId) {
  await wait(80);

  const orders = [{ id: 10, userId, total: 150 }];
  return orders;
}

function wait(ms) {
  const delay = new Promise((resolve) => setTimeout(resolve, ms));
  return delay;
}
