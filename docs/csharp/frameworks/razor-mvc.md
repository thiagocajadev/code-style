# Razor Pages e MVC

> Escopo: C#/.NET. Guia baseado em **ASP.NET Core .NET 10** com **C# 14**.

**Razor Pages** e **MVC** (Model-View-Controller, Modelo-Visão-Controlador) são dois padrões de
interface de usuário server-rendered do ASP.NET Core. Razor Pages organiza cada página como um par
`PageModel`/`.cshtml`, adequado para fluxos focados como formulários e wizards. MVC separa o
**Controller** (Controlador), a **View** (Visão) e o **Model** (Modelo), adequado para aplicações
com múltiplas views por entidade.

Este guia aplica os princípios de [methods.md](../conventions/methods.md) e
[api-design.md](../conventions/advanced/api-design.md).

## Conceitos fundamentais

| Conceito                          | O que é                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| **PageModel**                     | Classe base de uma Razor Page: define handlers `OnGet`/`OnPost` e propriedades disponíveis na view |
| **[BindProperty]**                | Atributo que vincula uma propriedade do `PageModel` ao POST do formulário automaticamente          |
| **Tag Helper**                    | Extensão de atributo HTML (prefixo `asp-`) que gera markup correto a partir do model              |
| **ModelState**                    | Dicionário de erros de validação preenchido pelo framework após o binding                         |
| **IActionResult**                 | Tipo de retorno polimórfico de action methods MVC; concretizado por `View()`, `Ok()`, `RedirectToAction()` |
| **ViewModel**                     | Classe tipada criada para a view: contém exatamente os dados que a página precisa, sem expor a entidade |
| **Partial View** (View parcial)   | Fragmento de marcação reutilizável renderizado com `<partial name="..." />`                        |
| **Layout**                        | Template mestre declarado com `Layout`; define estrutura HTML compartilhada entre páginas          |

## Razor Pages

Cada página é um par de arquivos: `Pages/Orders/Create.cshtml` (marcação) e
`Pages/Orders/Create.cshtml.cs` (PageModel). O `PageModel` define o `OnGet` para preparar
os dados da view e o `OnPost` para processar o formulário.

**Fluxo GET:** `GET /orders/create → OnGet → View`
**Fluxo POST:** `POST /orders/create → Binding → OnPost → Validate → Service → Redirect`

<details>
<summary>❌ Bad — lógica de negócio no PageModel; validação ad hoc (improvisada); acesso direto ao banco</summary>
<br>

```csharp
// Pages/Orders/Create.cshtml.cs
public class CreateModel(AppDbContext db) : PageModel
{
    [BindProperty]
    public string ProductName { get; set; } = string.Empty;

    [BindProperty]
    public int Quantity { get; set; }

    public async Task<IActionResult> OnPostAsync()
    {
        if (string.IsNullOrWhiteSpace(ProductName))  // validação ad hoc (improvisada)
        {
            ModelState.AddModelError("ProductName", "Required");
            return Page();
        }

        var order = new Order(ProductName, Quantity, DateTimeOffset.UtcNow);  // lógica no PageModel
        await db.Orders.AddAsync(order);
        await db.SaveChangesAsync();

        return RedirectToPage("./Index");
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — PageModel delega para Service; validação via DataAnnotations</summary>
<br>

```csharp
// Pages/Orders/Create.cshtml.cs
public class CreateModel(IOrderService orderService) : PageModel
{
    [BindProperty]
    public required OrderInput Input { get; set; }

    public void OnGet() { }

    public async Task<IActionResult> OnPostAsync(CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return Page();

        var result = await orderService.CreateAsync(Input, ct);
        if (result.IsFailure)
        {
            ModelState.AddModelError(string.Empty, result.Error!.Message);
            return Page();
        }

        return RedirectToPage("./Index");
    }
}
```

```csharp
// Models/OrderInput.cs
public class OrderInput
{
    [Required(ErrorMessage = "Nome do produto obrigatório")]
    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty;

    [Range(1, 1000, ErrorMessage = "Quantidade entre 1 e 1000")]
    public int Quantity { get; set; }
}
```

</details>

## Tag Helpers

Tag Helpers geram os atributos **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) a partir do model. `asp-for` vincula um input à propriedade
do `PageModel`; `asp-validation-for` exibe erros por campo; `asp-page` gera a **URL** (Uniform Resource Locator, Localizador Uniforme de Recurso) do formulário
e injeta o token anti-falsificação automaticamente.

<details>
<summary>❌ Bad — HTML manual sem Tag Helpers; sem anti-forgery; erros hardcoded</summary>
<br>

```html
<form method="post" action="/orders/create">
    <input type="text" name="Input.ProductName" placeholder="Produto" />
    <span class="text-danger">Campo obrigatório</span>

    <input type="number" name="Input.Quantity" />

    <button type="submit">Salvar</button>
</form>
```

</details>

<br>

<details>
<summary>✅ Good — Tag Helpers vinculam ao model; anti-forgery e erros automáticos</summary>
<br>

```html
<form asp-page="./Create" method="post">
    <div asp-validation-summary="ModelOnly" class="text-danger"></div>

    <div>
        <label asp-for="Input.ProductName">Produto</label>
        <input asp-for="Input.ProductName" class="form-control" />
        <span asp-validation-for="Input.ProductName" class="text-danger"></span>
    </div>

    <div>
        <label asp-for="Input.Quantity">Quantidade</label>
        <input asp-for="Input.Quantity" class="form-control" />
        <span asp-validation-for="Input.Quantity" class="text-danger"></span>
    </div>

    <button type="submit">Salvar</button>
</form>
```

</details>

## MVC — Controller thin

Controllers MVC são adaptadores: recebem a requisição **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto), delegam para um **Service** ou
**Handler** (manipulador), e traduzem o `Result<T>` em `IActionResult`. Nenhuma lógica de negócio fica no
controller. O acesso ao banco passa pelo **Repository**; o controller nunca injeta `DbContext`.

**Fluxo:** `HTTP Request → Controller → Service → Result<T> → IActionResult → HTTP Response`

<details>
<summary>❌ Bad — lógica de negócio no controller; DbContext injetado diretamente</summary>
<br>

```csharp
[ApiController]
[Route("orders")]
public class OrdersController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateAsync(OrderRequest req, CancellationToken ct)
    {
        var exists = await db.Products.AnyAsync(p => p.Id == req.ProductId, ct);  // acesso direto ao banco
        if (!exists) return NotFound("Product not found");

        var order = new Order(req.ProductId, req.Quantity, DateTimeOffset.UtcNow);  // lógica no controller
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        return Ok(order);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — controller delega para Service; traduz Result em HTTP no boundary</summary>
<br>

```csharp
[ApiController]
[Route("orders")]
public class OrdersController(IOrderService orderService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateAsync(OrderRequest request, CancellationToken ct)
    {
        var result = await orderService.CreateAsync(request, ct);
        if (result.IsFailure)
            return BadRequest(result.Error);

        var order = result.Value!;

        return CreatedAtAction(nameof(GetByIdAsync), new { id = order.Id }, order);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var result = await orderService.FindByIdAsync(id, ct);
        if (result.IsFailure)
            return NotFound(result.Error);

        var order = result.Value!;

        return Ok(order);
    }
}
```

</details>

## ViewModels

A view só recebe o que precisa. Um **ViewModel** tipado evita expor entidades de domínio
diretamente na view e impede que campos sensíveis vazem para o HTML.

<details>
<summary>❌ Bad — entidade de domínio passada direto para a view; campos sensíveis expostos</summary>
<br>

```csharp
// Controllers/OrdersController.cs
public async Task<IActionResult> DetailAsync(Guid id, CancellationToken ct)
{
    var order = await orderRepository.FindByIdAsync(id, ct);
    if (order is null)
        return NotFound();

    return View(order);  // entidade completa na view; expõe InternalCost, AuditLog, etc.
}
```

</details>

<br>

<details>
<summary>✅ Good — ViewModel tipado projetado para a view</summary>
<br>

```csharp
// Controllers/OrdersController.cs
public async Task<IActionResult> DetailAsync(Guid id, CancellationToken ct)
{
    var result = await orderService.FindDetailAsync(id, ct);
    if (result.IsFailure)
        return NotFound();

    var viewModel = result.Value!;

    return View(viewModel);
}
```

```csharp
// ViewModels/OrderDetailViewModel.cs
public record OrderDetailViewModel(
    Guid Id,
    string ProductName,
    int Quantity,
    decimal Total,
    string Status,
    DateTimeOffset CreatedAt
);
```

</details>

## Layouts e Partial Views

O **Layout** define a estrutura HTML compartilhada. `@RenderBody()` injeta o conteúdo da página
corrente. **Partial Views** encapsulam fragmentos reutilizáveis, como tabelas e cards, mantendo
cada view focada em seu próprio conteúdo.

<details>
<summary>❌ Bad — HTML estrutural duplicado em cada página</summary>
<br>

```html
@* Pages/Orders/Index.cshtml — sem layout *@
<!DOCTYPE html>
<html>
<head><title>Pedidos</title></head>
<body>
    <nav><!-- navegação duplicada em cada página --></nav>
    <main>
        <h1>Pedidos</h1>
    </main>
    <footer><!-- rodapé duplicado em cada página --></footer>
</body>
</html>
```

</details>

<br>

<details>
<summary>✅ Good — _Layout.cshtml compartilhado; partial view para fragmentos</summary>
<br>

```html
@* Shared/_Layout.cshtml *@
<!DOCTYPE html>
<html>
<head><title>@ViewData["Title"] — Pedidos</title></head>
<body>
    <partial name="_NavigationBar" />
    <main class="container">
        @RenderBody()
    </main>
    <partial name="_Footer" />
</body>
</html>
```

```html
@* Pages/Orders/Index.cshtml *@
@model OrderIndexViewModel
@{
    Layout = "_Layout";
    ViewData["Title"] = "Pedidos";
}

<h1>Pedidos</h1>
<partial name="_OrderTable" model="Model.Orders" />
```

```html
@* Shared/_OrderTable.cshtml *@
@model IEnumerable<OrderSummary>

<table class="table">
    <thead>
        <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        @foreach (var order in Model)
        {
            <tr>
                <td>@order.ProductName</td>
                <td>@order.Quantity</td>
                <td>@order.Status</td>
            </tr>
        }
    </tbody>
</table>
```

</details>
