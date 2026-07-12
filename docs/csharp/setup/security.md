# Segurança em projetos .NET

> Escopo: C# (setup). Princípios transversais em [shared/platform/security.md](../../shared/platform/security.md).

Esta página trata do que é específico do .NET: em que arquivo cada valor mora, que ferramenta guarda o segredo e que recurso do ASP.NET Core resolve autenticação e autorização. Os princípios que valem para qualquer linguagem (segredo fora do repositório, validação no servidor, cookie com HttpOnly, Secure e SameSite) estão em [shared/platform/security.md](../../shared/platform/security.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Config** (configuração) | Valor não sensível que muda entre ambientes, commitado no repositório |
| **Secret** (segredo) | Credencial, chave ou token; nunca vai para o repositório |
| **JSON** (JavaScript Object Notation · Notação de Objetos JavaScript) | Formato de serialização de dados usado em `appsettings` |
| **JWT** (JSON Web Token · token assinado que identifica o usuário) | Token que o servidor assina e o cliente devolve a cada requisição; carrega quem é o usuário, então o servidor não precisa guardar sessão |
| **Middleware** (função que roda antes do handler) | Componente que intercepta a requisição antes ou depois de chegar ao handler |
| **Payload** (corpo da mensagem) | Dados que acompanham a requisição ou o token |

---

<a id="where-secrets-live"></a>

## Onde cada segredo mora

| Camada | Arquivo / mecanismo | Valor |
|---|---|---|
| Config base não sensível (commitado) | `appsettings.json` | URLs, timeouts, limites, feature flags |
| Override por ambiente (commitado) | `appsettings.{Environment}.json` | Valores que mudam sem ser sensíveis |
| Secrets em desenvolvimento | `dotnet user-secrets` | Connection string local, chave de teste |
| Secrets em staging/produção | Variáveis de ambiente do host | Connection strings reais, signing keys |
| Secrets gerenciados | Azure Key Vault, AWS Secrets Manager, etc. | Rotação automática, auditoria |

O `ConfigurationBuilder` do .NET lê as camadas nessa ordem, e cada uma sobrescreve a anterior. A variável de ambiente vem por último e vence o `appsettings.json`, que é o comportamento desejado: o valor real da produção fica no host, e o arquivo commitado guarda só o padrão de desenvolvimento.

---

<a id="user-secrets"></a>

## dotnet user-secrets em desenvolvimento

O `user-secrets` guarda os valores num arquivo fora da pasta do projeto, então não há como commitá-los por engano. Ele faz o papel das variáveis de ambiente enquanto você desenvolve na sua máquina.

```bash
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost;Database=App;Trusted_Connection=True"
dotnet user-secrets set "Auth:Secret" "dev-only-never-use-in-prod"
dotnet user-secrets list
```

O .NET só lê esses valores quando `ASPNETCORE_ENVIRONMENT=Development`. Em staging e produção a configuração vem das variáveis de ambiente ou de um gerenciador de segredos.

---

<a id="env-var-naming"></a>

## Variáveis de ambiente: convenção de nome

O `:` que separa as seções no JSON não é aceito no nome de variável de ambiente em todos os sistemas. O .NET usa dois underscores no lugar: `Auth:Secret` no JSON vira `Auth__Secret` no ambiente.

```bash
ConnectionStrings__Default="Server=prod-db;Database=App;User=sa;Password=..."
Auth__Secret="prod-signing-secret"
Auth__Authority="https://login.microsoftonline.com/tenant-id"
```

---

<a id="options-pattern"></a>

## Options pattern: configuração tipada

Ler `builder.Configuration["Auth:Secret"]` direto no código espalha o nome da chave como texto solto. Um erro de digitação devolve `null` em silêncio, e o `null` só quebra quando alguém tenta assinar um token. O Options pattern amarra a seção inteira a um `record`: a leitura acontece uma vez, no startup, e a chave errada aparece ali, antes de a aplicação atender qualquer requisição.

<details>
<summary>❌ Ruim: chaves soltas no código</summary>

```csharp
var authority = builder.Configuration["Auth:Authority"];
var secret    = builder.Configuration["Auth:Secret"]; // string?: null passa despercebido
```

</details>

<details>
<summary>✅ Bom: record tipado resolvido uma vez no startup</summary>

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

<a id="jwt-validation"></a>

## Deixe o middleware validar o token

`ReadJwtToken()` abre o token e lê o conteúdo sem conferir a assinatura. Qualquer pessoa consegue montar um token com o `role` que quiser, e esse método aceita. O `AddJwtBearer` combinado com `RequireAuthorization()` confere assinatura, emissor, público e validade antes de o handler rodar. O handler recebe a requisição já autenticada e volta a tratar só do domínio.

<details>
<summary>❌ Ruim: ReadJwtToken dentro do handler</summary>

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

<details>
<summary>✅ Bom: middleware valida antes de o handler rodar</summary>

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

<a id="policies"></a>

## Autorização declarada na rota

Conferir o papel do usuário com um `if` dentro do handler espalha a mesma regra por vários arquivos, e a rota nova que esqueceu o `if` fica aberta sem ninguém notar. A policy declara a regra uma vez, no startup, e a rota diz de qual precisa. Quem lê a definição da rota vê a exigência ali, na mesma linha.

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

<a id="session-cookie"></a>

## O cookie de sessão e suas três flags

`AddSession` aceita as três flags obrigatórias direto na configuração: `HttpOnly` impede que JavaScript leia o cookie, `Secure` impede que ele trafegue fora de HTTPS e `SameSite` impede que outro site o envie junto de uma requisição. O motivo de cada uma está em [shared/platform/security.md](../../shared/platform/security.md).

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

<a id="gitignore"></a>

## O que o Git nunca deve ver

```gitignore
appsettings.local.json
appsettings.*.local.json
*.pfx
*.key
.env
.env.*
secrets.json
```
