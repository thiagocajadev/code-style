' NUnit — framework de testes open-source, popular em projetos .NET Framework
' Executar: dotnet test  ou  Test Explorer no Visual Studio
' Convenção: Assert.That(actual, Is.EqualTo(expected)) — actual primeiro no That()

Imports NUnit.Framework

Function ApplyDiscount(price As Decimal, discountPct As Integer) As Decimal
    If discountPct <= 0 Then Return price

    Dim discountedPrice = price * (1 - discountPct / 100D)

    Return discountedPrice
End Function

Function FormatName(firstName As String, lastName As String) As String
    Dim fullName = $"{firstName} {lastName}"
    Return fullName
End Function

<TestFixture>
Public Class ApplyDiscountTests

    <Test>
    Public Sub AppliesTenPercentDiscountToPrice()
        Dim price = 100D

        Dim actualPrice = ApplyDiscount(price, 10)

        Dim expectedPrice = 90D
        Assert.That(actualPrice, [Is].EqualTo(expectedPrice))
    End Sub

    <Test>
    Public Sub ReturnsOriginalPriceWhenDiscountIsZero()
        Dim price = 100D

        Dim actualPrice = ApplyDiscount(price, 0)

        Dim expectedPrice = price
        Assert.That(actualPrice, [Is].EqualTo(expectedPrice))
    End Sub

End Class

<TestFixture>
Public Class FormatNameTests

    <Test>
    Public Sub FormatsFirstAndLastNameIntoFullName()
        Dim actualName = FormatName("John", "Doe")

        Dim expectedName = "John Doe"
        Assert.That(actualName, [Is].EqualTo(expectedName))
    End Sub

End Class
