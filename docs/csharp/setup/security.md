# Security

> [!NOTE]
> Segurança é sempre prioridade em qualquer projeto. Os exemplos abaixo são referências conceituais — podem não cobrir todos os detalhes de implementação e, conforme as tecnologias evoluem, alguns podem ficar desatualizados. O que importa é o princípio por trás de cada prática.

## Nunca hardcode segredos

Segredos — connection strings, API keys, JWT secrets, senhas — nunca ficam no código-fonte. Um secret no repositório é um secret comprometido, mesmo que removido depois: o histórico do git preserva tudo.

<details>
<summary>❌ Bad — segredo hardcoded no código</summary>
<br>

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer("Server=prod-db;Database=App;User=sa;Password=Abc123!")); // exposto no repositório

builder.Services.AddAuthentication()
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters.IssuerSigningKey =
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes("super-secret-key-123")); // vaza com o código
    });
```

</details>

<br>

<details>
<summary>❌ Bad — segredo em appsettings.json commitado</summary>
<br>

```json
{
  "ConnectionStrings": {
    "Default": "Server=prod-db;Database=App;User=sa;Password=Abc123!"
  },
  "Auth": {
    "Secret": "super-secret-key-123"
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — segredo resolvido via IConfiguration, injetado pelo ambiente</summary>
<br>

```csharp
// Infrastructure/DatabaseExtensions.cs
public static class DatabaseExtensions
{
    public static WebApplicationBuilder AddDatabase(this WebApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString("Default")!;

        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString));

        return builder;
    }
}
```

</details>

## O que vai em appsettings.json

`appsettings.json` é commitado no repositório — só recebe configuração não sensível. Segredos entram via variáveis de ambiente ou secrets manager.

| Pode commitar | Nunca commitar |
| --- | --- |
| URLs de serviços (sem credenciais) | Connection strings com senha |
| Nomes de filas, tópicos, buckets | API keys e tokens |
| Feature flags | JWT signing secrets |
| Timeouts e limites | Credenciais de terceiros |
| Nomes de seções e chaves | Qualquer valor com `Password`, `Secret`, `Key`, `Token` |

<details>
<summary>✅ Good — appsettings.json com configuração não sensível</summary>
<br>

```json
{
  "Auth": {
    "Authority": "https://login.microsoftonline.com/tenant-id",
    "Audience": "api://my-app"
  },
  "RateLimiting": {
    "PermitLimit": 100,
    "WindowSeconds": 60
  },
  "Database": {
    "CommandTimeoutSeconds": 30
  }
}
```

</details>

## dotnet user-secrets — desenvolvimento

`user-secrets` armazena segredos fora do diretório do projeto, sem risco de commit acidental. É o substituto local de variáveis de ambiente para desenvolvimento.

```bash
# inicializar no projeto
dotnet user-secrets init

# definir um secret
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost;Database=App;Trusted_Connection=True"
dotnet user-secrets set "Auth:Secret" "dev-only-secret-never-use-in-prod"

# listar secrets ativos
dotnet user-secrets list
```

`user-secrets` só funciona quando `ASPNETCORE_ENVIRONMENT=Development`. Em staging e produção, não existe — a configuração vem de variáveis de ambiente ou secrets manager.

## Variáveis de ambiente — produção

Variáveis de ambiente sobrescrevem `appsettings.json`. A convenção do .NET usa `__` (duplo underscore) como separador de seção — equivale ao `:` do JSON.

```bash
# connection string
ConnectionStrings__Default="Server=prod-db;Database=App;User=sa;Password=..."

# seção aninhada: Auth:Secret → Auth__Secret
Auth__Secret="prod-signing-secret"
Auth__Authority="https://login.microsoftonline.com/tenant-id"
```

<details>
<summary>✅ Good — Options pattern resolve o secret do ambiente sem expô-lo</summary>
<br>

```csharp
// Auth/AuthOptions.cs
public record AuthOptions(string Authority, string Audience, string Secret)
{
    public const string Section = "Auth";
}

// Auth/AuthExtensions.cs
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

## Cadeia de configuração

O .NET resolve configuração em camadas — cada camada sobrescreve a anterior. A ordem importa.

```
appsettings.json                 → valores base (não sensíveis, commitados)
appsettings.{Environment}.json  → overrides por ambiente (não sensíveis, commitados)
dotnet user-secrets              → desenvolvimento local (fora do repositório)
variáveis de ambiente            → staging e produção (injetadas pelo host)
secrets manager (Key Vault etc.) → produção, segredos gerenciados externamente
```

Nunca inverta essa ordem. Um valor em `appsettings.json` nunca deve sobrescrever uma variável de ambiente — isso quebraria o modelo de deploy.

## JWT — leitura manual vs middleware

`ReadJwtToken()` lê o token sem validar assinatura nem expiração — qualquer token forjado ou expirado
passa. O middleware `AddJwtBearer` faz a validação completa automaticamente: não há motivo para
leitura manual.

<details>
<summary>❌ Bad — ReadJwtToken lê sem validar assinatura ou expiração</summary>
<br>

```csharp
app.MapGet("/orders", async (HttpContext ctx, IOrderRepository repo, CancellationToken ct) =>
{
    var bearerToken = ctx.Request.Headers.Authorization.ToString().Replace("Bearer ", "");
    if (string.IsNullOrEmpty(bearerToken)) return Results.Unauthorized();

    var tokenHandler = new JwtSecurityTokenHandler();
    var jwtToken = tokenHandler.ReadJwtToken(bearerToken); // lê sem validar assinatura
    if (jwtToken.ValidTo < DateTime.UtcNow) return Results.Unauthorized();

    var orders = await repo.FindAllAsync(ct);

    return Results.Ok(orders);
});
```

</details>

<br>

<details>
<summary>✅ Good — middleware valida token antes do endpoint ser chamado</summary>
<br>

```csharp
// pipeline: app.UseAuthentication(); app.UseAuthorization(); (ver project-foundation.md)

app.MapGet("/orders", async (IOrderRepository repo, CancellationToken ct) =>
{
    var orders = await repo.FindAllAsync(ct);

    return Results.Ok(orders);
})
.RequireAuthorization();
```

</details>

## Autorização centralizada

Checar claims manualmente em cada endpoint duplica lógica e cria brechas quando um handler esquece
a verificação. Policies centralizam as regras — `RequireAuthorization()` garante cobertura uniforme.

<details>
<summary>❌ Bad — verificação de role duplicada inline em cada endpoint</summary>
<br>

```csharp
app.MapDelete("/orders/{id}", async (
    Guid id,
    ClaimsPrincipal user,
    IOrderRepository repo,
    CancellationToken ct) =>
{
    var role = user.FindFirst("role")?.Value;
    if (role != "admin" && role != "manager") return Results.Forbid();

    await repo.DeleteAsync(id, ct);

    return Results.NoContent();
});
```

</details>

<br>

<details>
<summary>✅ Good — policy centralizada, regra legível na definição da rota</summary>
<br>

```csharp
// Program.cs
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("OrderManager", policy =>
        policy.RequireRole("admin", "manager"));
});

// endpoint — sem lógica de autorização no handler
app.MapDelete("/orders/{id}", async (Guid id, IOrderRepository repo, CancellationToken ct) =>
{
    await repo.DeleteAsync(id, ct);

    return Results.NoContent();
})
.RequireAuthorization("OrderManager");
```

</details>

## Session cookie

Cookies de sessão sem flags de segurança são vetores para XSS e CSRF. `HttpOnly` impede acesso via
JavaScript, `Secure` restringe a HTTPS e `SameSite` bloqueia envio cross-origin.

<details>
<summary>❌ Bad — cookie sem flags de segurança</summary>
<br>

```csharp
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8);
    // sem HttpOnly, Secure ou SameSite — acessível por JS e enviado em HTTP
});
```

</details>

<br>

<details>
<summary>✅ Good — cookie com HttpOnly, Secure e SameSite</summary>
<br>

```csharp
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8);
    options.Cookie.HttpOnly = true;               // inacessível via JavaScript
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always; // HTTPS only
    options.Cookie.SameSite = SameSiteMode.Strict; // bloqueia envio cross-origin (CSRF)
    options.Cookie.IsEssential = true;
});
```

</details>

## .gitignore — linha de defesa local

Mesmo com a cadeia correta, uma linha no `.gitignore` evita acidentes:

```gitignore
# secrets locais
appsettings.local.json
appsettings.*.local.json
*.pfx
*.key
.env
.env.*
secrets.json
```
