#:sdk Microsoft.NET.Sdk
// Princípios: orquestrador no topo, SLA, sem lógica no retorno

var users = new List<User>
{
    new(1, "Alice", Active: true),
    new(2, "Bob", Active: false),
    new(3, "Carol  ", Active: true),
};

var messages = BuildWelcomeMessages(users);
foreach (var message in messages)
    Console.WriteLine(message);

IReadOnlyList<string> BuildWelcomeMessages(IEnumerable<User> users)
{
    var activeUsers = GetActiveUsers(users);
    var messages = activeUsers.Select(BuildGreeting).ToList();
    return messages;
}

IEnumerable<User> GetActiveUsers(IEnumerable<User> users)
{
    var activeUsers = users.Where(user => user.Active);
    return activeUsers;
}

string BuildGreeting(User user)
{
    var name = user.Name.Trim();
    var greeting = $"Olá, {name}!";
    return greeting;
}

record User(int Id, string Name, bool Active);
