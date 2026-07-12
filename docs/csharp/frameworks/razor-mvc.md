# Razor Pages e MVC

> Escopo: C#/.NET. Guia baseado em **ASP.NET Core .NET 10** com **C# 14**.

**Razor Pages** e **MVC** (Model-View-Controller · Modelo-Visão-Controlador) são as duas formas de
montar a página no servidor e enviá-la pronta ao navegador. No Razor Pages, cada página é um par de
arquivos: o `.cshtml` com a marcação e o `PageModel` com o código que a alimenta. Isso encaixa bem
em fluxos fechados, como um formulário de cadastro. No MVC, um **Controller** (Controlador) atende
várias telas da mesma entidade, e cada tela é uma **View** (Visão) separada. Escolha o MVC quando a
mesma entidade aparece em muitas telas diferentes.

Este guia aplica os princípios de [methods.md](../conventions/methods.md) e
[api-design.md](../conventions/advanced/api-design.md).

## Conceitos fundamentais

| Conceito                          | O que é                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| **PageModel** (modelo de página)  | Classe base de uma Razor Page: define handlers `OnGet`/`OnPost` e propriedades disponíveis na view |
| **[BindProperty]** (atributo de vinculação) | Atributo que vincula uma propriedade do `PageModel` ao POST do formulário automaticamente |
| **Tag Helper** (auxiliar de tag)  | Extensão de atributo HTML (prefixo `asp-`) que gera markup correto a partir do model              |
| **ModelState** (estado do modelo) | Dicionário de erros de validação preenchido pelo framework após o binding                         |
| **IActionResult** (resultado de ação) | Tipo de retorno polimórfico de action methods MVC; concretizado por `View()`, `Ok()`, `RedirectToAction()` |
| **ViewModel** (modelo da view)    | Classe tipada criada para a view: contém exatamente os dados que a página precisa, sem expor a entidade |
| **Partial View** (View parcial)   | Fragmento de marcação reutilizável renderizado com `<partial name="..." />`                        |
| **Layout** (layout mestre)        | Template mestre declarado com `Layout`; define estrutura HTML compartilhada entre páginas          |

<a id="razor-pages"></a>

## Razor Pages

Cada página são dois arquivos: `Pages/Orders/Create.cshtml` guarda a marcação e
`Pages/Orders/Create.cshtml.cs` guarda o `PageModel`. O `PageModel` responde a dois momentos: o
`OnGet` prepara o que a tela precisa exibir quando o usuário chega, e o `OnPost` recebe o
formulário quando ele é enviado.

**Fluxo GET:** `GET /orders/create → OnGet → View`
**Fluxo POST:** `POST /orders/create → Binding → OnPost → Validate → Service → Redirect`

<details>
<summary>❌ Ruim: lógica de negócio no PageModel; validação ad hoc; acesso direto ao banco</summary>

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

<details>
<summary>✅ Bom: PageModel delega para Service; validação via DataAnnotations</summary>

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

<a id="tag-helpers"></a>

## Tag Helpers

Tag Helper é um atributo que o ASP.NET Core lê no servidor e transforma no **HTML** (HyperText
Markup Language · Linguagem de Marcação de Hipertexto) final. `asp-for` liga o campo à propriedade
do `PageModel`, e daí saem sozinhos o `name`, o `id` e as regras de validação que a propriedade já
declara. `asp-validation-for` mostra o erro daquele campo. `asp-page` monta a **URL** (Uniform
Resource Locator · Localizador Uniforme de Recurso) do formulário e inclui o token que protege
contra requisição forjada de outro site.

<details>
<summary>❌ Ruim: HTML manual sem Tag Helpers; sem anti-forgery; erros hardcoded</summary>

```html
<form method="post" action="/orders/create">
    <input type="text" name="Input.ProductName" placeholder="Produto" />
    <span class="text-danger">Campo obrigatório</span>

    <input type="number" name="Input.Quantity" />

    <button type="submit">Salvar</button>
</form>
```

</details>

<details>
<summary>✅ Bom: Tag Helpers vinculam ao model; anti-forgery e erros automáticos</summary>

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

<a id="controller-thin"></a>

## MVC: o controller é um adaptador

O controller faz a tradução entre o mundo do **HTTP** (HyperText Transfer Protocol · Protocolo de
Transferência de Hipertexto) e o mundo do domínio: recebe a requisição, chama um **Service** ou
**Handler** (classe que atende a operação) e transforma o `Result<T>` que voltou em
`IActionResult`. A regra de negócio mora no service, e o acesso ao banco passa pelo
**Repository**. Um `DbContext` injetado no controller é o sinal de que esse limite caiu, e a partir
dali a mesma regra passa a ser reescrita em cada tela que precisar dela.

**Fluxo:** `HTTP Request → Controller → Service → Result<T> → IActionResult → HTTP Response`

<details>
<summary>❌ Ruim: lógica de negócio no controller; DbContext injetado diretamente</summary>

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

<details>
<summary>✅ Bom: controller delega para Service; traduz Result em HTTP no boundary</summary>

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

<a id="view-models"></a>

## ViewModels

O **ViewModel** é um tipo criado para a tela, com os campos que aquela tela mostra. Entregar a
entidade de domínio direto para a view leva junto tudo o que ela carrega, e o `PasswordHash` que
ninguém pretendia publicar acaba a um `@Model.` de distância de aparecer no HTML.

<details>
<summary>❌ Ruim: entidade de domínio passada direto para a view; campos sensíveis expostos</summary>

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

<details>
<summary>✅ Bom: ViewModel tipado projetado para a view</summary>

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

<a id="layouts"></a>

## Layouts e Partial Views

O **Layout** guarda o que toda página tem em volta: cabeçalho, menu, rodapé, os arquivos de estilo.
O `@RenderBody()` marca o ponto onde o conteúdo da página entra. A **Partial View** guarda um
pedaço que se repete em várias telas, como a tabela de itens ou o cartão de produto, e passa a ser
editada num lugar só.

<details>
<summary>❌ Ruim: HTML estrutural duplicado em cada página</summary>

```html
@* Pages/Orders/Index.cshtml: sem layout *@
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

<details>
<summary>✅ Bom: _Layout.cshtml compartilhado; partial view para fragmentos</summary>

```html
@* Shared/_Layout.cshtml *@
<!DOCTYPE html>
<html>
<head><title>@ViewData["Title"]: Pedidos</title></head>
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
