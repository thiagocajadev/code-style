' Princípios: orquestrador no topo, SLA, explaining return, Sub vs Function

Dim cart = New Cart(
    userId:=42,
    items:=New List(Of CartItem) From {
        New CartItem("product-a", 50D, 2),
        New CartItem("product-b", 30D, 1)
    }
)

Dim invoice = BuildInvoice(cart)
Console.WriteLine(invoice)

Function BuildInvoice(cart As Cart) As Invoice
    Dim subtotal = ComputeSubtotal(cart.Items)
    Dim discount = ComputeDiscount(subtotal, cart.UserId)
    Dim total = subtotal - discount

    Dim invoice = New Invoice(cart.UserId, subtotal, discount, total)

    Return invoice
End Function

Function ComputeSubtotal(items As IEnumerable(Of CartItem)) As Decimal
    Dim subtotal = items.Sum(Function(item) item.Price * item.Quantity)
    Return subtotal
End Function

Function ComputeDiscount(subtotal As Decimal, userId As Integer) As Decimal
    Const DiscountThreshold As Decimal = 100D
    Const DiscountRate As Decimal = 0.1D

    Dim isEligible = subtotal >= DiscountThreshold
    If Not isEligible Then Return 0D

    Dim discount = subtotal * DiscountRate

    Return discount
End Function

Class Cart
    Public ReadOnly Property UserId As Integer
    Public ReadOnly Property Items As List(Of CartItem)

    Public Sub New(userId As Integer, items As List(Of CartItem))
        Me.UserId = userId
        Me.Items = items
    End Sub
End Class

Class CartItem
    Public ReadOnly Property ProductId As String
    Public ReadOnly Property Price As Decimal
    Public ReadOnly Property Quantity As Integer

    Public Sub New(productId As String, price As Decimal, quantity As Integer)
        Me.ProductId = productId
        Me.Price = price
        Me.Quantity = quantity
    End Sub
End Class

Class Invoice
    Public ReadOnly Property UserId As Integer
    Public ReadOnly Property Subtotal As Decimal
    Public ReadOnly Property Discount As Decimal
    Public ReadOnly Property Total As Decimal

    Public Sub New(userId As Integer, subtotal As Decimal, discount As Decimal, total As Decimal)
        Me.UserId = userId
        Me.Subtotal = subtotal
        Me.Discount = discount
        Me.Total = total
    End Sub

    Public Overrides Function ToString() As String
        Dim text = $"Invoice(user={UserId}, subtotal={Subtotal:C}, discount={Discount:C}, total={Total:C})"
        Return text
    End Function
End Class
