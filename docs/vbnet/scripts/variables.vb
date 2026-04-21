' Princípios: imutabilidade por padrão, sem valores mágicos, CQS

Const StandardDiscount As Decimal = 10D
Const ApprovedStatus As String = "approved"

Dim order = New Order(1, 100D, ApprovedStatus)
Dim discounted = ApplyDiscount(order)

Console.WriteLine($"original:   {order}")
Console.WriteLine($"discounted: {discounted}")

Function ApplyDiscount(order As Order) As Order
    Dim discountedTotal = order.Total - StandardDiscount
    Dim discountedOrder = New Order(order.Id, discountedTotal, order.Status)

    Return discountedOrder
End Function

Class Order
    Public ReadOnly Property Id As Integer
    Public ReadOnly Property Total As Decimal
    Public ReadOnly Property Status As String

    Public Sub New(id As Integer, total As Decimal, status As String)
        Me.Id = id
        Me.Total = total
        Me.Status = status
    End Sub

    Public Overrides Function ToString() As String
        Dim text = $"Order({Id}, {Total:C}, {Status})"
        Return text
    End Function
End Class
