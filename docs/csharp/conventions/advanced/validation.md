# Validação em C#

> Escopo: C#. Idiomas específicos deste ecossistema.

Validar uma entrada envolve três trabalhos diferentes, e cada um acontece num ponto do caminho:

```
[Entrada] → Limpa → Valida formato → Aplica regras de negócio → [Filtra saída] → Resposta
```

Primeiro o dado bruto é limpo (espaços sobrando, maiúsculas no e-mail). Depois o formato é conferido: campo obrigatório presente, número dentro da faixa. Só então entram as regras que dependem do domínio, como saber se o produto está disponível, e essas precisam consultar o banco. Quando os três se misturam no mesmo lugar, o **validator** passa a acessar o banco, e testar uma regra de formato exige subir um banco junto.

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

<a id="sanitization"></a>

## Sanitização de entrada

Limpe antes de validar: `Trim` nas strings, `ToLowerInvariant` no e-mail. O motivo aparece no caso concreto: `" Admin@Email.com "` passa por qualquer validador de formato de e-mail, e depois não encontra ninguém no banco, porque lá o endereço está gravado em minúsculas e sem espaço. O erro aparece longe da causa, num "usuário não encontrado" que não explica nada.

<details>
<summary>❌ Ruim: dados brutos chegam direto na validação</summary>

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

<details>
<summary>✅ Bom: sanitize antes de validar</summary>

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

<a id="schema-validation"></a>

## Validar o formato com FluentValidation

O `AbstractValidator` reúne num só lugar as regras de forma: campo preenchido, texto no formato de um `Guid`, quantidade maior que zero. Sem ele, essas checagens se espalham como uma fila de `if` no começo de cada handler, e a mesma regra acaba escrita de três jeitos diferentes em três lugares.

<details>
<summary>❌ Ruim: validação manual espalhada no handler</summary>

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

<details>
<summary>✅ Bom: AbstractValidator centraliza o contrato, handler recebe dado validado</summary>

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

<a id="business-rules"></a>

## Regras de negócio

"O produto está disponível?" é uma pergunta que só o banco responde. Ela pertence ao handler, depois da validação de formato. Colocar essa consulta dentro do validator, com `MustAsync`, mistura duas camadas: o validator deixa de ser uma função de formato e passa a depender de repositório, e o teste dele passa a exigir dados fictícios de banco para checar se o campo estava preenchido.

<details>
<summary>❌ Ruim: I/O dentro do validator mistura camadas</summary>

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

<details>
<summary>✅ Bom: validator valida shape, regras de negócio no handler após</summary>

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

<a id="output-filtering"></a>

## Filtrar o que sai na resposta

Devolver a entidade do banco direto na resposta entrega junto tudo o que ela carrega: `PasswordHash`, `SecurityStamp`, `IsDeleted`. Ninguém decidiu publicar esses campos, eles apenas moram na mesma classe. Declare um `record` de resposta com os campos que a API expõe e monte-o a partir da entidade. O que a API publica passa a ser uma lista escrita, e um campo novo na tabela não vaza sozinho para o cliente.

<details>
<summary>❌ Ruim: entidade direta vaza campos internos</summary>

```csharp
public async Task<User?> FindUserByIdAsync(Guid id, CancellationToken ct)
{
    var user = await _repository.FindByIdAsync(id, ct);

    return user; // PasswordHash, SecurityStamp, IsDeleted, InternalFlags...
}
```

</details>

<details>
<summary>✅ Bom: response record como projeção explícita do que sai</summary>

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
