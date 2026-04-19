// xUnit — framework mais adotado no ecossistema .NET moderno
// Executar: dotnet test
// Convenção: Assert.Equal(expected, actual) — expected primeiro

using Xunit;

static decimal ApplyDiscount(decimal price, int discountPct)
{
    if (discountPct <= 0) return price;
    var discountedPrice = price * (1 - discountPct / 100m);
    return discountedPrice;
}

static string FormatName(string first, string last)
{
    var fullName = $"{first} {last}";
    return fullName;
}

public class ApplyDiscountTests
{
    [Fact]
    public void AppliesTenPercentDiscountToPrice()
    {
        var price = 100m;

        var actualPrice = ApplyDiscount(price, 10);

        var expectedPrice = 90m;
        Assert.Equal(expectedPrice, actualPrice);
    }

    [Fact]
    public void ReturnsOriginalPriceWhenDiscountIsZero()
    {
        var price = 100m;

        var actualPrice = ApplyDiscount(price, 0);

        var expectedPrice = price;
        Assert.Equal(expectedPrice, actualPrice);
    }
}

public class FormatNameTests
{
    [Fact]
    public void FormatsFirstAndLastNameIntoFullName()
    {
        var actualName = FormatName("John", "Doe");

        var expectedName = "John Doe";
        Assert.Equal(expectedName, actualName);
    }
}
