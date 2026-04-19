#:sdk Microsoft.NET.Sdk
// Princípios: Result<T>, falhar rápido, sem exceções como controle de fluxo

Console.WriteLine(GetUser(1));
Console.WriteLine(GetUser(99));
Console.WriteLine(GetUser(0));

Result<User> GetUser(int id)
{
    if (id <= 0)
        return Result<User>.Fail(new ApiError("VALIDATION_ERROR", "id must be greater than zero"));

    var users = new List<User> { new(1, "Alice") };
    var user = users.FirstOrDefault(u => u.Id == id);

    if (user is null)
        return Result<User>.Fail(new ApiError("NOT_FOUND", $"User {id} not found"));

    return Result<User>.Ok(user);
}

record User(int Id, string Name);

record ApiError(string Code, string Message);

record Result<T>
{
    public T? Value { get; init; }
    public ApiError? Error { get; init; }
    public bool IsSuccess => Error is null;

    public static Result<T> Ok(T value) => new() { Value = value };
    public static Result<T> Fail(ApiError error) => new() { Error = error };

    public override string ToString() =>
        IsSuccess ? $"Ok({Value})" : $"Fail({Error})";
}
