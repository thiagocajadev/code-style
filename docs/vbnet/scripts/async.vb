' Princípios: Async Function, Await, Task.WhenAll, nunca .Result ou .Wait()

Imports System.Threading.Tasks

FetchDashboard(1).GetAwaiter().GetResult()

Async Function FetchDashboard(userId As Integer) As Task
    Dim userTask = FetchUser(userId)
    Dim ordersTask = FetchOrders(userId)

    Await Task.WhenAll(userTask, ordersTask)

    Dim user = Await userTask
    Dim orders = Await ordersTask

    Console.WriteLine($"User: {user.Name}")
    Console.WriteLine($"Orders: {orders.Count}")
End Function

Async Function FetchUser(userId As Integer) As Task(Of User)
    Await Task.Delay(100)
    Dim user = New User(userId, "Alice")

    Return user
End Function

Async Function FetchOrders(userId As Integer) As Task(Of List(Of Order))
    Await Task.Delay(80)
    Dim orders = New List(Of Order) From {
        New Order(10, userId, 150D)
    }

    Return orders
End Function

Class User
    Public ReadOnly Property Id As Integer
    Public ReadOnly Property Name As String

    Public Sub New(id As Integer, name As String)
        Me.Id = id
        Me.Name = name
    End Sub
End Class

Class Order
    Public ReadOnly Property Id As Integer
    Public ReadOnly Property UserId As Integer
    Public ReadOnly Property Total As Decimal

    Public Sub New(id As Integer, userId As Integer, total As Decimal)
        Me.Id = id
        Me.UserId = userId
        Me.Total = total
    End Sub
End Class
