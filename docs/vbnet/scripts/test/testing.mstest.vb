' MSTest — framework de testes da Microsoft, integrado ao Visual Studio
' Executar: dotnet test  ou  Test Explorer no Visual Studio
' Convenção: Assert.AreEqual(expected, actual) — expected primeiro

Imports Microsoft.VisualStudio.TestTools.UnitTesting

Function ApplyDiscount(price As Decimal, discountPct As Integer) As Decimal
    If discountPct <= 0 Then Return price

    Dim discountedPrice = price * (1 - discountPct / 100D)

    Return discountedPrice
End Function

Function FormatName(firstName As String, lastName As String) As String
    Dim fullName = $"{firstName} {lastName}"
    Return fullName
End Function

<TestClass>
Public Class ApplyDiscountTests

    <TestMethod>
    Public Sub AppliesTenPercentDiscountToPrice()
        Dim price = 100D

        Dim actualPrice = ApplyDiscount(price, 10)

        Dim expectedPrice = 90D
        Assert.AreEqual(expectedPrice, actualPrice)
    End Sub

    <TestMethod>
    Public Sub ReturnsOriginalPriceWhenDiscountIsZero()
        Dim price = 100D

        Dim actualPrice = ApplyDiscount(price, 0)

        Dim expectedPrice = price
        Assert.AreEqual(expectedPrice, actualPrice)
    End Sub

End Class

<TestClass>
Public Class FormatNameTests

    <TestMethod>
    Public Sub FormatsFirstAndLastNameIntoFullName()
        Dim actualName = FormatName("John", "Doe")

        Dim expectedName = "John Doe"
        Assert.AreEqual(expectedName, actualName)
    End Sub

End Class
