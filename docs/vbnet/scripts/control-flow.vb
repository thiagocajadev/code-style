' Princípios: guard clauses, retorno antecipado, Select Case sobre ElseIf

Dim STATUS_LABELS As New Dictionary(Of String, String) From {
    {"pending", "Aguardando"},
    {"approved", "Aprovado"},
    {"cancelled", "Cancelado"}
}

Console.WriteLine(ProcessOrder(Nothing))
Console.WriteLine(ProcessOrder(New Order(1, 0D, "pending")))
Console.WriteLine(ProcessOrder(New Order(2, 150D, "approved")))
Console.WriteLine(ProcessOrder(New Order(3, 150D, "cancelled")))
Console.WriteLine(ProcessOrder(New Order(4, 150D, "unknown")))

Console.WriteLine(GetStatusLabel("approved"))
Console.WriteLine(GetStatusLabel("unknown"))

Function ProcessOrder(order As Order) As String
    If order Is Nothing Then Return "order is required"
    If order.Total <= 0 Then Return "total must be greater than zero"

    Dim label = Select Case order.Status
                    Case "approved" : $"Order {order.Id} approved for {order.Total:C}"
                    Case "pending"  : $"Order {order.Id} is pending review"
                    Case "cancelled": $"Order {order.Id} was cancelled"
                    Case Else       : $"Order {order.Id} has unknown status"
                End Select

    Return label
End Function

Function GetStatusLabel(status As String) As String
    Dim isKnown = STATUS_LABELS.ContainsKey(status)
    If Not isKnown Then Return "Desconhecido"

    Dim label = STATUS_LABELS(status)

    Return label
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
End Class
