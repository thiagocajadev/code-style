# Validation

> Escopo: C#. Idiomas específicos deste ecossistema.

O pipeline de validação tem três responsabilidades distintas, cada uma no seu lugar:

```
[Input] → Sanitize → Schema Validate → Business Rules → [Output Filter] → Response
```

Misturar essas camadas cria acoplamento, dificulta testes e abre brechas de segurança. **FluentValidation** cobre validação de esquema; **business rules** vivem no domínio.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **sanitization** (sanitização) | Limpeza de entrada antes de validar: `Trim`, `ToLowerInvariant`, normalização de Unicode |
| **schema validation** (validação de esquema) | Checagem de forma e tipo: campo obrigatório, formato, faixa numérica |
| **business rule** (regra de negócio) | Validação que depende de estado do domínio (ex: e-mail já existe) |
| **FluentValidation** (biblioteca de validação para .NET) | API fluente para definir regras de schema fora dos atributos do modelo |
| **DataAnnotations** (atributos de validação do .NET) | `[Required]`, `[StringLength]` etc. aplicados ao modelo; útil para casos simples |
| **ModelState** (estado do modelo no MVC) | Coleção que agrega erros de binding e validação na pipeline ASP.NET |
| **input boundary** (limite de entrada) | Camada externa onde dados crus entram e são sanitizados antes de qualquer regra |
| **output filter** (filtro de saída) | Etapa final que remove campos sensíveis antes de serializar a resposta |

## Sanitização de entrada

Antes de validar, limpar: `Trim` em strings, `ToLowerInvariant` em emails. Dados sujos entram em
validação suja: um email com espaço passa no validator mas falha na busca no banco.

<details>
<summary>❌ Ruim — dados brutos chegam direto na validação</summary>
<br>

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
<summary>✅ Bom — sanitize antes de validar</summary>
<br>

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

`AbstractValidator` valida shape, tipos e constraints, não regras de negócio. Centraliza o contrato
técnico e elimina validação manual espalhada pelos handlers.

<details>
<summary>❌ Ruim — validação manual espalhada no handler</summary>
<br>

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
<summary>✅ Bom — AbstractValidator centraliza o contrato, handler recebe dado validado</summary>
<br>

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
domínio: dependem de **I/O** (Input/Output, Entrada/Saída) (banco, serviços externos) e não pertencem ao validator.

<details>
<summary>❌ Ruim — I/O dentro do validator mistura camadas</summary>
<br>

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
<summary>✅ Bom — validator valida shape, regras de negócio no handler após</summary>
<br>

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
um `record` de resposta como projeção explícita, nunca a entidade do banco.

<details>
<summary>❌ Ruim — entidade direta vaza campos internos</summary>
<br>

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
<summary>✅ Bom — response record como projeção explícita do que sai</summary>
<br>

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
