# Security

> Escopo: C# (setup). Princípios transversais em [shared/security.md](../../shared/security.md).

Esta página cobre apenas o que é específico do .NET: onde colocar o quê, quais ferramentas usar, quais patterns do ecossistema. As regras conceituais (segredos fora do repositório, validação no servidor, HttpOnly + Secure + SameSite) vivem em [shared/security.md](../../shared/security.md) e não são repetidas aqui.

---

## Onde cada coisa vai

| Camada | Arquivo / mecanismo | Valor |
|---|---|---|
| Config base não sensível (commitado) | `appsettings.json` | URLs, timeouts, limites, feature flags |
| Override por ambiente (commitado) | `appsettings.{Environment}.json` | Valores que mudam sem ser sensíveis |
| Secrets em desenvolvimento | `dotnet user-secrets` | Connection string local, chave de teste |
| Secrets em staging/produção | Variáveis de ambiente do host | Connection strings reais, signing keys |
| Secrets gerenciados | Azure Key Vault, AWS Secrets Manager, etc. | Rotação automática, auditoria |

A ordem de resolução do .NET (`ConfigurationBuilder`) aplica cada camada por cima da anterior. Variável de ambiente sempre vence `appsettings.json` — nunca inverter.

---

## dotnet user-secrets (dev)

Armazena segredos fora do diretório do projeto, sem risco de commit. Substituto local de variáveis de ambiente em desenvolvimento.

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost;Database=App;Trusted_Connection=True"
dotnet user-secrets set "Auth:Secret" "dev-only-never-use-in-prod"
dotnet user-secrets list
```

Só é lido quando `ASPNETCORE_ENVIRONMENT=Development`. Em staging e produção, a configuração vem de variáveis de ambiente ou secrets manager.

---

## Variáveis de ambiente: convenção de nome

O .NET usa `__` (duplo underscore) como separador de seção, equivalente ao `:` no JSON. `Auth:Secret` em JSON vira `Auth__Secret` em env.

```bash
ConnectionStrings__Default="Server=prod-db;Database=App;User=sa;Password=..."
Auth__Secret="prod-signing-secret"
Auth__Authority="https://login.microsoftonline.com/tenant-id"
```

---

## Options pattern: consumir configuração tipada

Ler `builder.Configuration["Auth:Secret"]` espalha strings mágicas e não detecta null em compile time. Options pattern amarra a seção a um record fortemente tipado.

<details>
<summary>❌ Bad — chaves soltas no código</summary>
<br>

```csharp
var authority = builder.Configuration["Auth:Authority"];
var secret    = builder.Configuration["Auth:Secret"]; // string? — null passa despercebido
```

</details>

<br>

<details>
<summary>✅ Good — record tipado resolvido uma vez no startup</summary>
<br>

```csharp
public record AuthOptions(string Authority, string Audience, string Secret)
{
    public const string Section = "Auth";
}

public static WebApplicationBuilder AddAuth(this WebApplicationBuilder builder)
{
    var authOptions = builder.Configuration
        .GetSection(AuthOptions.Section)
        .Get<AuthOptions>()!;

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = authOptions.Authority;
            options.Audience = authOptions.Audience;
            options.TokenValidationParameters.IssuerSigningKey =
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions.Secret));
        });

    return builder;
}
```

</details>

---

## JWT: middleware valida, não `ReadJwtToken`

`ReadJwtToken()` lê o payload sem verificar assinatura nem expiração; qualquer token forjado ou vencido passa. `AddJwtBearer` faz a validação completa automaticamente.

<details>
<summary>❌ Bad — ReadJwtToken dentro do handler</summary>
<br>

```csharp
app.MapGet("/orders", async (HttpContext ctx, IOrderRepository repo, CancellationToken ct) =>
{
    var bearerToken = ctx.Request.Headers.Authorization.ToString().Replace("Bearer ", "");
    var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(bearerToken); // não valida
    if (jwtToken.ValidTo < DateTime.UtcNow) return Results.Unauthorized();

    var orders = await repo.FindAllAsync(ct);
    return Results.Ok(orders);
});
```

</details>

<br>

<details>
<summary>✅ Good — middleware valida antes do handler rodar</summary>
<br>

```csharp
app.MapGet("/orders", async (IOrderRepository orderRepository, CancellationToken ct) =>
{
    var orders = await orderRepository.FindAllAsync(ct);
    return TypedResults.Ok(orders);
})
.RequireAuthorization();
```

</details>

---

## Policies: autorização centralizada

Checar claims no meio do handler duplica lógica. Policies declaram a regra no startup e `RequireAuthorization("PolicyName")` aplica na rota.

```csharp
// Program.cs
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("OrderManager", policy =>
        policy.RequireRole("admin", "manager"));
});

// endpoint sem lógica de autorização no corpo
app.MapDelete("/orders/{id}", async (Guid id, IOrderRepository orderRepository, CancellationToken ct) =>
{
    await orderRepository.DeleteAsync(id, ct);
    return TypedResults.NoContent();
})
.RequireAuthorization("OrderManager");
```

---

## Session cookie com flags

`AddSession` aceita as três flags obrigatórias diretamente no binding. Ver [shared/security.md](../../shared/security.md) para o racional de cada uma.

```csharp
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8);
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.IsEssential = true;
});
```

---

## .gitignore

```gitignore
appsettings.local.json
appsettings.*.local.json
*.pfx
*.key
.env
.env.*
secrets.json
```
