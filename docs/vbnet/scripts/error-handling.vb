' Princípios: Try/Catch estruturado, sem On Error GoTo, Using, Result pattern

Dim saveResult = SaveProduct(New Product(1, "Widget", 29.9D))
Console.WriteLine(If(saveResult.IsSuccess, "saved", $"error: {saveResult.ErrorMessage}"))

Dim invalidResult = SaveProduct(New Product(2, "", -1D))
Console.WriteLine(If(invalidResult.IsSuccess, "saved", $"error: {invalidResult.ErrorMessage}"))

Function SaveProduct(product As Product) As OperationResult
    Dim validationResult = ValidateProduct(product)
    If Not validationResult.IsSuccess Then Return validationResult

    Try
        PersistProduct(product)
        Dim success = OperationResult.Ok()

        Return success
    Catch ex As Exception
        Dim failure = OperationResult.Fail($"Unexpected error: {ex.Message}")

        Return failure
    End Try
End Function

Function ValidateProduct(product As Product) As OperationResult
    If String.IsNullOrWhiteSpace(product.Name) Then
        Dim missingName = OperationResult.Fail("Name is required.")
        Return missingName
    End If

    If product.Price <= 0 Then
        Dim invalidPrice = OperationResult.Fail("Price must be greater than zero.")
        Return invalidPrice
    End If

    Return OperationResult.Ok()
End Function

Sub PersistProduct(product As Product)
    ' simula persistência
    Console.WriteLine($"persisting {product.Name}")
End Sub

Class Product
    Public ReadOnly Property Id As Integer
    Public ReadOnly Property Name As String
    Public ReadOnly Property Price As Decimal

    Public Sub New(id As Integer, name As String, price As Decimal)
        Me.Id = id
        Me.Name = name
        Me.Price = price
    End Sub
End Class

Class OperationResult
    Public ReadOnly Property IsSuccess As Boolean
    Public ReadOnly Property ErrorMessage As String

    Private Sub New(isSuccess As Boolean, errorMessage As String)
        Me.IsSuccess = isSuccess
        Me.ErrorMessage = errorMessage
    End Sub

    Public Shared Function Ok() As OperationResult
        Dim result = New OperationResult(True, String.Empty)
        Return result
    End Function

    Public Shared Function Fail(message As String) As OperationResult
        Dim result = New OperationResult(False, message)
        Return result
    End Function
End Class
