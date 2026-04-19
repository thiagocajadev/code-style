#:sdk Microsoft.NET.Sdk
// Princípios: imutabilidade por padrão, sem valores mágicos, CQS

const decimal StandardDiscount = 10m;
const string ApprovedStatus = "approved";

var order = new Order(1, 100m, ApprovedStatus);
var discounted = ApplyDiscount(order);

Console.WriteLine($"original:   {order}");
Console.WriteLine($"discounted: {discounted}");

Order ApplyDiscount(Order order)
{
    var discounted = order with { Total = order.Total - StandardDiscount };
    return discounted;
}

record Order(int Id, decimal Total, string Status);
