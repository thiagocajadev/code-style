#:sdk Microsoft.NET.Sdk
// Princípios: async/await, Task.WhenAll para operações independentes

var dashboard = await FetchDashboard(1);
Console.WriteLine($"user:   {dashboard.User}");
Console.WriteLine($"orders: {string.Join(", ", dashboard.Orders)}");

async Task<Dashboard> FetchDashboard(int userId)
{
    var userTask = FetchUser(userId);
    var ordersTask = FetchOrders(userId);

    await Task.WhenAll(userTask, ordersTask);

    var user = await userTask;
    var orders = await ordersTask;
    var dashboard = new Dashboard(user, orders);
    return dashboard;
}

async Task<User> FetchUser(int id)
{
    await Task.Delay(100);
    var user = new User(id, "Alice");
    return user;
}

async Task<IReadOnlyList<Order>> FetchOrders(int userId)
{
    await Task.Delay(80);
    var orders = new List<Order> { new(10, userId, 150m) };
    return orders;
}

record User(int Id, string Name);
record Order(int Id, int UserId, decimal Total);
record Dashboard(User User, IReadOnlyList<Order> Orders);
