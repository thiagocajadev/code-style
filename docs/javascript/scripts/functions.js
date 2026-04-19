// Princípios: orquestrador no topo, funções pequenas, sem lógica no retorno

const users = [
  { name: "Alice", active: true },
  { name: "Bob", active: false },
  { name: "Carol  ", active: true },
];

const messages = buildWelcomeMessages(users);
console.log(messages);

function buildWelcomeMessages(users) {
  const activeUsers = getActiveUsers(users);
  const messages = activeUsers.map(buildGreeting);
  return messages;
}

function getActiveUsers(users) {
  const activeUsers = users.filter((user) => user.active);
  return activeUsers;
}

function buildGreeting(user) {
  const name = user.name.trim();
  const greeting = `Olá, ${name}!`;
  return greeting;
}
