// NUnit — amplamente adotado em projetos enterprise e legados .NET
// Executar: dotnet test
// Convenção: Assert.That(actual, Is.EqualTo(expected)) — actual primeiro

using NUnit.Framework;

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

[TestFixture]
public class ApplyDiscountTests
{
    [Test]
    public void AppliesTenPercentDiscountToPrice()
    {
        var price = 100m;

        var actualPrice = ApplyDiscount(price, 10);

        var expectedPrice = 90m;
        Assert.That(actualPrice, Is.EqualTo(expectedPrice));
    }

    [Test]
    public void ReturnsOriginalPriceWhenDiscountIsZero()
    {
        var price = 100m;

        var actualPrice = ApplyDiscount(price, 0);

        var expectedPrice = price;
        Assert.That(actualPrice, Is.EqualTo(expectedPrice));
    }
}

[TestFixture]
public class FormatNameTests
{
    [Test]
    public void FormatsFirstAndLastNameIntoFullName()
    {
        var actualName = FormatName("John", "Doe");

        var expectedName = "John Doe";
        Assert.That(actualName, Is.EqualTo(expectedName));
    }
}
