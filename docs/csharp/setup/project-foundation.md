# Fundação de um projeto .NET

> [!NOTE]
> Esta estrutura reflete como costumo iniciar projetos C#/.NET. Os exemplos são referências conceituais e podem não cobrir todos os detalhes de implementação; conforme as tecnologias evoluem, alguns podem ficar desatualizados. O que importa é o princípio: entry point como índice, configuração delegada, módulos por domínio.

Três decisões vêm antes da primeira linha de domínio. O editor e o formatador precisam concordar, para que ninguém abra um diff cheio de mudança de espaço em branco. O `Program.cs` precisa caber numa tela, funcionando como o índice de tudo o que a aplicação liga. E a configuração precisa morar no **appsettings**, com os segredos guardados fora do repositório. O resto do projeto cresce em cima disso.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SDK-style project** (projeto no formato SDK) | Formato moderno de `.csproj`: enxuto, sem listar arquivos, com `<Project Sdk="...">` |
| **Program.cs** (ponto de entrada da aplicação) | Arquivo top-level statements onde a aplicação é configurada e iniciada |
| **appsettings.json** (arquivo de configuração) | Configuração estática por ambiente; valores sensíveis ficam em variáveis de ambiente ou secrets |
| **EditorConfig** (configuração de editor compartilhada) | Arquivo `.editorconfig` que padroniza indentação, charset e fim de linha entre IDEs |
| **dotnet format** (formatador nativo do .NET) | Ferramenta CLI que aplica regras de formatação sem dependências externas |
| **User Secrets** (segredos de usuário em desenvolvimento) | Mecanismo do .NET para armazenar segredos fora do repositório em dev |
| **NuGet** (gerenciador de pacotes do .NET) | Sistema de pacotes; dependências declaradas no `.csproj` via `<PackageReference>` |
| **TargetFramework** (framework-alvo do projeto) | Define a versão do .NET (`net8.0`, `net9.0`); fixar para reproduzibilidade |

<a id="environment"></a>

## Preparar o editor antes do primeiro arquivo

Combine indentação, charset e fim de linha antes de escrever código, e o time para de gerar diff onde não houve mudança de lógica. O `.editorconfig` guarda essas regras e todas as IDEs o respeitam. O `dotnet format` aplica a formatação e já vem com o SDK, sem instalar nada.

- [EditorConfig](../../shared/standards/editorconfig.md): indentação, charset, trailing whitespace
- `dotnet format`: formatter nativo do .NET, sem instalação adicional

```bash
dotnet format
```

<a id="entry-point"></a>

## O Program.cs funciona como índice da aplicação

Quem abre o `Program.cs` quer saber o que a aplicação tem: banco, autenticação, limite de requisições, quais domínios. Cinco linhas respondem isso. Quando cada registro é escrito ali dentro, o arquivo cresce a cada feature nova e vira o lugar onde todo mundo mexe, com conflito de merge a cada pull request. Delegue cada bloco a um extension method e o `Program.cs` volta a caber na tela.

<details>
<summary>❌ Ruim: Program.cs como depósito de toda a configuração</summary>

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"];
        options.Audience = builder.Configuration["Auth:Audience"];
    });

builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
builder.Services.AddScoped<OrderService>();

builder.Services.AddScoped<IUserRepository, SqlUserRepository>();
builder.Services.AddScoped<UserService>();

builder.Services.AddScoped<INotifier, EmailNotifier>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
```

</details>

<details>
<summary>✅ Bom: Program.cs como índice, configuração delegada</summary>

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddAppServices();

var app = builder.Build();
app.UseAppPipeline();
app.Run();
```

</details>

<a id="extension-methods-by-domain"></a>

## Cada domínio registra as próprias dependências

O `Program.cs` não conhece `DbContext`, `JwtBearer` nem repositório: ele chama quem conhece. O extension method mora junto do domínio que ele registra, então o arquivo que cria a feature de pedidos é o mesmo que a liga na aplicação. Adicionar um domínio novo passa a ser uma linha no agregador, e o resto acontece dentro da pasta dele.

<details>
<summary>❌ Ruim: dependências de domínio registradas diretamente no Program.cs</summary>

```csharp
// Program.cs: cresce sem controle conforme o projeto evolui
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
builder.Services.AddScoped<OrderService>();

builder.Services.AddScoped<IUserRepository, SqlUserRepository>();
builder.Services.AddScoped<UserService>();

// cada novo domínio adiciona mais linhas aqui: sem coesão, sem dono
```

</details>

<details>
<summary>✅ Bom: ponto de entrada agrega os módulos</summary>

```csharp
// AppServiceExtensions.cs
public static class AppServiceExtensions
{
    public static WebApplicationBuilder AddAppServices(this WebApplicationBuilder builder)
    {
        builder.AddDatabase();
        builder.AddAuth();

        builder.AddRateLimiting();
        builder.AddApiDocs();

        builder.AddOrders();
        builder.AddUsers();

        return builder;
    }
}

// AppPipelineExtensions.cs
public static class AppPipelineExtensions
{
    public static WebApplication UseAppPipeline(this WebApplication app)
    {
        app.UseHttpsRedirection();
        app.UseRateLimiter();

        app.UseCors();
        app.UseAuthentication();

        app.UseAuthorization();

        app.MapAppEndpoints();
        app.MapApiDocs();

        return app;
    }
}
```

</details>

<details>
<summary>✅ Bom: domínio de Orders dono da sua configuração</summary>

```csharp
// Features/Orders/OrdersExtensions.cs
public static class OrdersExtensions
{
    public static WebApplicationBuilder AddOrders(this WebApplicationBuilder builder)
    {
        builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
        builder.Services.AddScoped<OrderService>();

        return builder;
    }

    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        group.MapGet("/", OrderEndpoints.FindAll);
        group.MapGet("/{id:guid}", OrderEndpoints.FindById);

        group.MapPost("/", OrderEndpoints.Create);

        return app;
    }
}
```

</details>

<a id="options-pattern"></a>

## Cada domínio lê a própria seção da configuração

`builder.Configuration["Auth:Authority"]` espalha o nome da chave pelo código como texto. Um erro de digitação devolve `null` sem reclamar, e o problema aparece depois, na primeira requisição autenticada. O Options pattern lê a seção inteira uma vez e a entrega como um `record`: o nome da chave existe num lugar só, e o valor ausente aparece no startup.

<details>
<summary>❌ Ruim: configuração lida com chaves espalhadas</summary>

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"]; // chave solta
        options.Audience = builder.Configuration["Auth:Audience"];   // chave solta
    });
```

</details>

<details>
<summary>✅ Bom: Options pattern, seção tipada por domínio</summary>

```csharp
// Auth/AuthOptions.cs
public record AuthOptions(string Authority, string Audience)
{
    public const string Section = "Auth";
}

// Auth/AuthExtensions.cs
public static class AuthExtensions
{
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
            });

        return builder;
    }
}
```

</details>

<a id="database"></a>

## Banco de dados

A configuração do `DbContext` mora no extension method de infraestrutura, e a connection string vem do `IConfiguration`. Escrita direto no código, ela entra no repositório junto com a senha do banco de produção, e trocar de ambiente vira recompilação.

<details>
<summary>❌ Ruim: DbContext configurado inline no Program.cs com string hardcoded</summary>

```csharp
// Program.cs: acoplado ao SQL Server, connection string exposta
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer("Server=prod-db;Database=App;User=sa;Password=Abc123!"));
```

</details>

<details>
<summary>✅ Bom: DbContext registrado no módulo de infraestrutura</summary>

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

<a id="openapi"></a>

## OpenAPI

O .NET 9 gera a documentação da API sem Swashbuckle, com o pacote `Microsoft.AspNetCore.OpenApi`. Deixe a configuração num extension method e exponha a documentação só em Development: em produção, ela entrega a quem quiser ver o mapa completo das suas rotas. A interface de leitura fica por conta do [Scalar](https://scalar.com), que consome o documento gerado.

<details>
<summary>❌ Ruim: Swashbuckle inline no Program.cs, exposto em todos os ambientes</summary>

```csharp
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });
});

// no pipeline, sem guard de ambiente
app.UseSwagger();
app.UseSwaggerUI();
```

</details>

<details>
<summary>✅ Bom: OpenAPI nativo, Scalar como UI, apenas em Development</summary>

```csharp
// Infrastructure/ApiDocsExtensions.cs
public static class ApiDocsExtensions
{
    public static WebApplicationBuilder AddApiDocs(this WebApplicationBuilder builder)
    {
        if (!builder.Environment.IsDevelopment())
            return builder;

        builder.Services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, context, ct) =>
            {
                document.Info = new OpenApiInfo
                {
                    Title = "My App API",
                    Version = "v1",
                };
                return Task.CompletedTask;
            });
        });

        return builder;
    }

    public static WebApplication MapApiDocs(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
            return app;

        app.MapOpenApi();
        app.MapScalarApiReference(options =>
        {
            options.Title = "My App API";
            options.Theme = ScalarTheme.Purple;
        });

        return app;
    }
}
```

</details>

<details>
<summary>✅ Bom: aggregator inclui ApiDocs</summary>

```csharp
// AppServiceExtensions.cs
builder.AddDatabase();
builder.AddAuth();

builder.AddRateLimiting();
builder.AddApiDocs();

builder.AddOrders();
builder.AddUsers();

// AppPipelineExtensions.cs
app.UseHttpsRedirection();
app.UseRateLimiter();

app.UseCors();
app.UseAuthentication();

app.UseAuthorization();
app.MapAppEndpoints();

app.MapApiDocs();          // MapOpenApi + Scalar, só em Development
```

</details>

<a id="rate-limiting"></a>

## Limite de requisições

O limite de requisições é um **middleware** (função que roda antes do handler): registra-se como serviço no `AddAppServices` e entra no pipeline com `UseRateLimiter`. Cada política ganha um nome e pode valer para a aplicação inteira ou para um endpoint específico. Os números (quantas requisições, em quanto tempo) vêm da configuração, porque eles mudam entre ambientes e você vai querer ajustá-los sem recompilar.

<details>
<summary>❌ Ruim: rate limiting inline no Program.cs, sem options tipadas</summary>

```csharp
// Program.cs: configuração acoplada, sem separação de responsabilidade
builder.Services.AddRateLimiter(limiter =>
{
    limiter.AddFixedWindowLimiter("default", window =>
    {
        window.PermitLimit = 100;    // literal mágico
        window.Window = TimeSpan.FromSeconds(60); // literal mágico
        window.QueueLimit = 0;
    });
    limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});
```

</details>

<details>
<summary>✅ Bom: rate limiting configurado via extension method</summary>

```csharp
// Infrastructure/RateLimitingExtensions.cs
public static class RateLimitingExtensions
{
    public static WebApplicationBuilder AddRateLimiting(this WebApplicationBuilder builder)
    {
        var options = builder.Configuration
            .GetSection(RateLimitingOptions.Section)
            .Get<RateLimitingOptions>()!;

        builder.Services.AddRateLimiter(limiter =>
        {
            limiter.AddFixedWindowLimiter("default", window =>
            {
                window.PermitLimit = options.PermitLimit;
                window.Window = TimeSpan.FromSeconds(options.WindowSeconds);
                window.QueueLimit = 0;
            });

            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });

        return builder;
    }
}

public record RateLimitingOptions(int PermitLimit, int WindowSeconds)
{
    public const string Section = "RateLimiting";
}
```

```csharp
// AppServiceExtensions.cs
builder.AddDatabase();
builder.AddAuth();

builder.AddRateLimiting();
builder.AddOrders();

builder.AddUsers();
```

</details>

<details>
<summary>✅ Bom: aplicando política por endpoint</summary>

```csharp
group.MapPost("/", OrderEndpoints.Create)
    .RequireRateLimiting("default");
```

</details>

<a id="pipeline-order"></a>

## A ordem do pipeline decide o que fica protegido

O middleware roda na ordem em que você o registra, e essa ordem muda o comportamento sem gerar nenhum erro. `UseAuthorization` antes de `UseAuthentication` executa a verificação de permissão quando a identidade do usuário ainda não foi resolvida: a rota parece protegida e não está. O limite de requisições entra cedo, antes de autenticação e banco, para que a requisição excedente seja recusada sem gastar trabalho.

```
UseHttpsRedirection   → redireciona antes de qualquer processamento
UseRateLimiter        → bloqueia cedo, antes de autenticação e I/O
UseCors               → cabeçalhos CORS antes de autenticação
UseAuthentication     → resolve a identidade
UseAuthorization      → usa a identidade resolvida
MapAppEndpoints       → roteia para os handlers
```

<details>
<summary>❌ Ruim: UseAuthorization antes de UseAuthentication</summary>

```csharp
app.UseAuthorization();   // identidade ainda não foi resolvida
app.UseAuthentication();  // tarde demais

app.MapAppEndpoints();
```

</details>

<details>
<summary>✅ Bom: ordem correta do pipeline</summary>

```csharp
app.UseHttpsRedirection();
app.UseRateLimiter();

app.UseCors();
app.UseAuthentication();

app.UseAuthorization();
app.MapAppEndpoints();
```

</details>

<a id="file-structure"></a>

## Onde cada arquivo mora

```
src/
├── Program.cs
├── AppServiceExtensions.cs
├── AppPipelineExtensions.cs
├── Features/
│   ├── Orders/
│   │   ├── OrdersExtensions.cs   ← AddOrders() + MapOrderEndpoints()
│   │   ├── OrderEndpoints.cs
│   │   ├── OrderService.cs
│   │   └── OrderRequest.cs
│   └── Users/
│       ├── UsersExtensions.cs
│       ├── UserEndpoints.cs
│       └── UserService.cs
└── Infrastructure/
    ├── DatabaseExtensions.cs     ← AddDatabase()
    ├── AuthExtensions.cs         ← AddAuth()
    └── AppDbContext.cs
```
