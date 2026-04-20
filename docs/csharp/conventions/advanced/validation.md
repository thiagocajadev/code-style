# Validation

O pipeline de validação tem três responsabilidades distintas — cada uma no seu lugar:

```
[Input] → Sanitize → Schema Validate → Business Rules → [Output Filter] → Response
```

Misturar essas camadas cria acoplamento, dificulta testes e abre brechas de segurança.

## Sanitização de entrada

Antes de validar, limpar: `Trim` em strings, `ToLowerInvariant` em emails. Dados sujos entram em
validação suja — um email com espaço passa no validator mas falha na busca no banco.

<details>
<br>
<summary>❌ Bad — dados brutos chegam direto na validação</summary>

```csharp
public async Task<Result<User>> CreateUserAsync(CreateUserRequest request, CancellationToken ct)
{
    var validationResult = await _validator.ValidateAsync(request, ct); // " Admin@Email.com " passa
    if (!validationResult.IsValid)
        return Result<User>.Fail(validationResult.Errors.First().ErrorMessage, "INVALID_INPUT");

    var user = await _repository.CreateAsync(request, ct);

    return Result<User>.Success(user);
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — sanitize antes de validar</summary>

```csharp
private static CreateUserRequest Sanitize(CreateUserRequest request)
{
    var sanitized = request with
    {
        Name = request.Name.Trim(),
        Email = request.Email.Trim().ToLowerInvariant(),
    };

    return sanitized;
}

public async Task<Result<User>> CreateUserAsync(CreateUserRequest request, CancellationToken ct)
{
    var sanitized = Sanitize(request);
    var validationResult = await _validator.ValidateAsync(sanitized, ct);
    if (!validationResult.IsValid)
        return Result<User>.Fail(validationResult.Errors.First().ErrorMessage, "INVALID_INPUT");

    var user = await _repository.CreateAsync(sanitized, ct);

    return Result<User>.Success(user);
}
```

</details>

## Schema validation com FluentValidation

`AbstractValidator` valida shape, tipos e constraints — não regras de negócio. Centraliza o contrato
técnico e elimina validação manual espalhada pelos handlers.

<details>
<br>
<summary>❌ Bad — validação manual espalhada no handler</summary>

```csharp
public async Task<Result<Invoice>> HandleAsync(CreateOrderRequest request, CancellationToken ct)
{
    if (string.IsNullOrWhiteSpace(request.ProductId))
        return Result<Invoice>.Fail("ProductId required", "INVALID");
    if (request.Quantity <= 0)
        return Result<Invoice>.Fail("Quantity must be positive", "INVALID");
    if (string.IsNullOrWhiteSpace(request.CustomerId))
        return Result<Invoice>.Fail("CustomerId required", "INVALID");
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — AbstractValidator centraliza o contrato, handler recebe dado validado</summary>

```csharp
public class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderValidator()
    {
        RuleFor(r => r.ProductId).NotEmpty().Must(BeValidGuid).WithMessage("Invalid product ID");
        RuleFor(r => r.Quantity).GreaterThan(0);

        RuleFor(r => r.CustomerId).NotEmpty().Must(BeValidGuid).WithMessage("Invalid customer ID");
    }

    private static bool BeValidGuid(string value) => Guid.TryParse(value, out _);
}
```

</details>

## Regras de negócio

O validator valida se o dado tem o formato correto. Regras de negócio validam se faz sentido no
domínio — dependem de I/O (banco, serviços externos) e não pertencem ao validator.

<details>
<br>
<summary>❌ Bad — I/O dentro do validator mistura camadas</summary>

```csharp
public class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderValidator(IProductRepository products)
    {
        RuleFor(r => r.ProductId)
            .MustAsync(async (id, ct) =>
            {
                var product = await products.FindByIdAsync(Guid.Parse(id), ct);
                return product?.IsAvailable ?? false; // regra de domínio escondida no validator
            })
            .WithMessage("Product not available");
    }
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — validator valida shape, regras de negócio no handler após</summary>

```csharp
public class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderValidator()
    {
        RuleFor(r => r.ProductId).NotEmpty().Must(BeValidGuid);
        RuleFor(r => r.Quantity).GreaterThan(0);
    }

    private static bool BeValidGuid(string value) => Guid.TryParse(value, out _);
}

public async Task<Result<Invoice>> HandleAsync(CreateOrderRequest request, CancellationToken ct)
{
    var validationResult = _validator.Validate(request);
    if (!validationResult.IsValid)
    {
        var error = validationResult.Errors.First();
        return Result<Invoice>.Fail(error.ErrorMessage, "INVALID_INPUT");
    }

    var product = await _products.FindByIdAsync(Guid.Parse(request.ProductId), ct);
    if (product is null)
        return Result<Invoice>.Fail("Product not found", "NOT_FOUND");

    if (!product.IsAvailable)
        return Result<Invoice>.Fail("Product unavailable", "UNAVAILABLE");

    var invoice = await BuildInvoiceAsync(request, product, ct);

    return Result<Invoice>.Success(invoice);
}
```

</details>

## Output filtering

Retornar a entidade direta vaza campos internos: `PasswordHash`, `SecurityStamp`, `IsDeleted`. Usar
um `record` de resposta como projeção explícita — nunca a entidade do banco.

<details>
<br>
<summary>❌ Bad — entidade direta vaza campos internos</summary>

```csharp
public async Task<User?> FindUserByIdAsync(Guid id, CancellationToken ct)
{
    var user = await _repository.FindByIdAsync(id, ct);

    return user; // PasswordHash, SecurityStamp, IsDeleted, InternalFlags...
}
```

</details>

<br>

<details>
<br>
<summary>✅ Good — response record como projeção explícita do que sai</summary>

```csharp
public record UserResponse(Guid Id, string Name, string Email, DateTime CreatedAt);

public async Task<UserResponse?> FindUserByIdAsync(Guid id, CancellationToken ct)
{
    var user = await _repository.FindByIdAsync(id, ct);
    if (user is null) return null;

    var userResponse = new UserResponse(user.Id, user.Name, user.Email, user.CreatedAt);

    return userResponse;
}
```

</details>
