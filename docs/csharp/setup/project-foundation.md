# Project Foundation

> [!NOTE]
> Essa estrutura reflete como costumo iniciar projetos C#/.NET. Os exemplos são referências conceituais e podem não cobrir todos os detalhes de implementação; conforme as tecnologias evoluem, alguns podem ficar desatualizados. O que importa é o princípio: entry point como índice, configuração delegada, módulos por domínio.

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/editorconfig.md): indentação, charset, trailing whitespace
- `dotnet format`: formatter nativo do .NET, sem instalação adicional

```bash
dotnet format
```

## Program.cs enxuto

`Program.cs` declara intenção, não implementa. Toda configuração é delegada via extension methods. O arquivo serve como índice do projeto: o leitor vê o que existe, não como funciona.

<details>
<summary>❌ Bad — Program.cs como dumping ground de configuração</summary>
<br>

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

<br>

<details>
<summary>✅ Good — Program.cs como índice, configuração delegada</summary>
<br>

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddAppServices();

var app = builder.Build();
app.UseAppPipeline();
app.Run();
```

</details>

## Extension methods por domínio

Cada domínio registra suas próprias dependências. `Program.cs` não conhece `DbContext`, `JwtBearer` ou repositórios: apenas chama quem conhece. Extension methods ficam co-localizados com o domínio que registram.

<details>
<summary>❌ Bad — dependências de domínio registradas diretamente no Program.cs</summary>
<br>

```csharp
// Program.cs — cresce sem controle conforme o projeto evolui
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<IUserRepository, SqlUserRepository>();
builder.Services.AddScoped<UserService>();
// cada novo domínio adiciona mais linhas aqui — sem coesão, sem dono
```

</details>

<br>

<details>
<summary>✅ Good — ponto de entrada agrega os módulos</summary>
<br>

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

<br>

<details>
<summary>✅ Good — domínio de Orders dono da sua configuração</summary>
<br>

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

## Configuração tipada: Options pattern

Cada domínio lê sua própria seção do `appsettings.json`. Nenhum extension method acessa `builder.Configuration` com strings soltas espalhadas pelo código.

<details>
<summary>❌ Bad — configuração lida com chaves espalhadas</summary>
<br>

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"]; // chave solta
        options.Audience = builder.Configuration["Auth:Audience"];   // chave solta
    });
```

</details>

<br>

<details>
<summary>✅ Good — Options pattern, seção tipada por domínio</summary>
<br>

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

## Banco de dados

Configuração do `DbContext` pertence ao extension method de infraestrutura. Connection string nunca inline: sempre via `IConfiguration`.

<details>
<summary>❌ Bad — DbContext configurado inline no Program.cs com string hardcoded</summary>
<br>

```csharp
// Program.cs — acoplado ao SQL Server, connection string exposta
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer("Server=prod-db;Database=App;User=sa;Password=Abc123!"));
```

</details>

<br>

<details>
<summary>✅ Good — DbContext registrado no módulo de infraestrutura</summary>
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

## OpenAPI

.NET 9 introduziu suporte nativo a OpenAPI via `Microsoft.AspNetCore.OpenApi`, sem Swashbuckle. A documentação fica em um extension method, exposta apenas em Development, e usa [Scalar](https://scalar.com) como UI.

<details>
<summary>❌ Bad — Swashbuckle inline no Program.cs, exposto em todos os ambientes</summary>
<br>

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

<br>

<details>
<summary>✅ Good — OpenAPI nativo, Scalar como UI, apenas em Development</summary>
<br>

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

<br>

<details>
<summary>✅ Good — aggregator inclui ApiDocs</summary>
<br>

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

## Rate limiting

Rate limiting é middleware: entra no `AddAppServices` como serviço e no pipeline com `UseRateLimiter`. Cada política tem nome e pode ser aplicada por endpoint ou globalmente.

<details>
<summary>❌ Bad — rate limiting inline no Program.cs, sem options tipadas</summary>
<br>

```csharp
// Program.cs — configuração acoplada, sem separação de responsabilidade
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

<br>

<details>
<summary>✅ Good — rate limiting configurado via extension method</summary>
<br>

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

<br>

<details>
<summary>✅ Good — aplicando política por endpoint</summary>
<br>

```csharp
group.MapPost("/", OrderEndpoints.Create)
    .RequireRateLimiting("default");
```

</details>

## Ordem do pipeline

A ordem do middleware após `Build()` é determinística e importa. Desviar da ordem padrão causa comportamentos silenciosos: autenticação após roteamento, por exemplo, não protege nada.

```
UseHttpsRedirection   → redireciona antes de qualquer processamento
UseRateLimiter        → bloqueia cedo, antes de autenticação e I/O
UseCors               → cabeçalhos CORS antes de autenticação
UseAuthentication     → resolve a identidade
UseAuthorization      → usa a identidade resolvida
MapAppEndpoints       → roteia para os handlers
```

<details>
<summary>❌ Bad — UseAuthorization antes de UseAuthentication</summary>
<br>

```csharp
app.UseAuthorization();   // identidade ainda não foi resolvida
app.UseAuthentication();  // tarde demais
app.MapAppEndpoints();
```

</details>

<br>

<details>
<summary>✅ Good — ordem correta do pipeline</summary>
<br>

```csharp
app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapAppEndpoints();
```

</details>

## Estrutura de arquivos

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
