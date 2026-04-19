#:sdk Microsoft.NET.Sdk
// Princípios: guard clauses, retorno antecipado, switch expressions

Console.WriteLine(ProcessOrder(null));
Console.WriteLine(ProcessOrder(new Order(1, 0m, "pending")));
Console.WriteLine(ProcessOrder(new Order(2, 150m, "approved")));
Console.WriteLine(ProcessOrder(new Order(3, 150m, "cancelled")));
Console.WriteLine(ProcessOrder(new Order(4, 150m, "unknown")));

string ProcessOrder(Order? order)
{
    if (order is null) return "order is required";
    if (order.Total <= 0) return "total must be greater than zero";

    var result = order.Status switch
    {
        "approved"  => $"Order {order.Id} approved for {order.Total:C}",
        "pending"   => $"Order {order.Id} is pending review",
        "cancelled" => $"Order {order.Id} was cancelled",
        _           => $"Order {order.Id} has unknown status",
    };

    return result;
}

record Order(int Id, decimal Total, string Status);
