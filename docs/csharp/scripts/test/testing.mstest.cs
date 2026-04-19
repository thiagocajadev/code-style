// MSTest — built-in do Visual Studio, sem dependência externa adicional
// Executar: dotnet test
// Convenção: Assert.AreEqual(expected, actual) — expected primeiro

using Microsoft.VisualStudio.TestTools.UnitTesting;

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

[TestClass]
public class ApplyDiscountTests
{
    [TestMethod]
    public void AppliesTenPercentDiscountToPrice()
    {
        var price = 100m;

        var actualPrice = ApplyDiscount(price, 10);

        var expectedPrice = 90m;
        Assert.AreEqual(expectedPrice, actualPrice);
    }

    [TestMethod]
    public void ReturnsOriginalPriceWhenDiscountIsZero()
    {
        var price = 100m;

        var actualPrice = ApplyDiscount(price, 0);

        var expectedPrice = price;
        Assert.AreEqual(expectedPrice, actualPrice);
    }
}

[TestClass]
public class FormatNameTests
{
    [TestMethod]
    public void FormatsFirstAndLastNameIntoFullName()
    {
        var actualName = FormatName("John", "Doe");

        var expectedName = "John Doe";
        Assert.AreEqual(expectedName, actualName);
    }
}
