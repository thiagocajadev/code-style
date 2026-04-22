# Blazor

> Escopo: C#/.NET. Guia baseado em **Blazor .NET 10** com **C# 14**.

Blazor é o framework de interface de usuário da Microsoft para .NET. Um componente Blazor combina
marcação HTML com código C# em um único arquivo `.razor`. A mesma base de código roda no servidor
via **SignalR** (protocolo de comunicação bidirecional em tempo real) ou no browser via
**WebAssembly** (formato binário executado diretamente no browser), sem JavaScript obrigatório.

Este guia cobre os padrões de componentes, estado, formulários, roteamento e interoperabilidade
com JavaScript seguindo os princípios de [methods.md](../conventions/methods.md) e
[visual-density.md](../conventions/visual-density.md).

## Conceitos fundamentais

| Conceito                          | O que é                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Render Mode** (Modo de renderização) | Define onde o componente é executado: servidor via SignalR, browser via WebAssembly, ou híbrido     |
| **Component** (Componente)        | Arquivo `.razor` com marcação HTML e bloco `@code { }` com lógica C#                                    |
| **Parameter** (Parâmetro)         | Propriedade com `[Parameter]` que recebe dados do componente pai                                         |
| **EventCallback**                 | Delegate tipado para comunicação filho para pai; dispara método assíncrono no componente pai             |
| **CascadingParameter**            | Dado propagado pela árvore de componentes sem passar manualmente em cada nível                           |
| **[PersistentState]**             | Atributo .NET 10 que persiste estado durante a prerenderização, evitando chamadas duplicadas ao servidor |
| **EditForm**                      | Componente de formulário Blazor: gerencia `EditContext`, validação e submissão                           |
| **IJSRuntime**                    | Serviço para interoperabilidade JavaScript: invoca funções JS e recebe retornos no C#                    |

## Render Modes

Blazor .NET 10 oferece quatro modos de renderização. Cada componente declara o próprio modo com
`@rendermode`, ou herda do componente pai. Escolher o modo errado desperdiça conexões **SignalR**
ou impede recursos interativos.

**Fluxo Static SSR:** `Request → Prerender → HTML estático → Browser`
**Fluxo Interactive Server:** `Request → Prerender → HTML → SignalR circuit → DOM diffs`
**Fluxo Interactive WebAssembly:** `Request → Download WASM → Executa no browser`
**Fluxo Interactive Auto:** `Request → Server (primeira carga) → WASM em cache (subsequentes)`

| Modo                    | Diretiva                              | Quando usar                                         |
| ----------------------- | ------------------------------------- | --------------------------------------------------- |
| Static SSR              | (nenhuma)                             | Páginas sem interatividade: marketing, conteúdo estático |
| Interactive Server      | `@rendermode InteractiveServer`       | Dashboards, formulários com estado de servidor      |
| Interactive WebAssembly | `@rendermode InteractiveWebAssembly`  | Apps offline, lógica client-side intensiva          |
| Interactive Auto        | `@rendermode InteractiveAuto`         | Carga inicial rápida com fallback para WASM em cache |

<details>
<summary>❌ Bad — rendermode global no App.razor força SignalR em páginas estáticas</summary>
<br>

```razor
@* App.razor — força Interactive Server em TUDO, incluindo páginas sem interatividade *@
<Routes @rendermode="InteractiveServer" />
```

</details>

<br>

<details>
<summary>✅ Good — Static SSR como padrão; rendermode declarado por componente</summary>
<br>

```razor
@* App.razor — sem rendermode global; cada página declara o próprio *@
<Routes />
```

```razor
@* Pages/OrderDashboard.razor — interativo porque precisa de estado em tempo real *@
@rendermode InteractiveServer
@page "/orders"

<h1>Pedidos</h1>
<OrderList Orders="orders" />

@code {
    private List<Order> orders = [];

    protected override async Task OnInitializedAsync()
    {
        orders = await orderRepository.FindPendingAsync();
    }
}
```

</details>

## Componentes

Um componente Blazor separa marcação de lógica. A marcação usa HTML com diretivas Razor (`@`);
a lógica fica no bloco `@code`. Cálculos e transformações nunca ficam inline na marcação: computed
properties no `@code` mantêm o template legível.

<details>
<summary>❌ Bad — cálculo e ternário inline na marcação</summary>
<br>

```razor
@* ProductCard.razor *@
<div class="card">
    <span>@Product.Name</span>
    <span>@(Product.Price * (1 - Product.DiscountRate / 100)).ToString("C")</span>
    <span>@(Product.Stock > 0 ? "Em estoque" : "Indisponível")</span>
</div>

@code {
    [Parameter] public Product Product { get; set; } = default!;
}
```

</details>

<br>

<details>
<summary>✅ Good — computed properties no @code, marcação sem lógica</summary>
<br>

```razor
@* ProductCard.razor *@
<div class="card">
    <span>@Product.Name</span>
    <span>@FormattedPrice</span>
    <span>@StockStatus</span>
</div>

@code {
    [Parameter] public required Product Product { get; set; }

    private string FormattedPrice =>
        (Product.Price * (1 - Product.DiscountRate / 100)).ToString("C");

    private string StockStatus =>
        Product.Stock > 0 ? "Em estoque" : "Indisponível";
}
```

</details>

## Parâmetros e EventCallback

`[Parameter]` define propriedades que recebem dados do pai. `EventCallback<T>` permite que o filho
notifique o pai sobre eventos sem acoplar os dois componentes.

<details>
<summary>❌ Bad — filho injeta serviço para notificar mudança; acoplamento desnecessário</summary>
<br>

```razor
@* QuantitySelector.razor *@
@inject ICartService cartService

<button @onclick="() => cartService.UpdateQuantity(ProductId, Quantity - 1)">-</button>
<span>@Quantity</span>
<button @onclick="() => cartService.UpdateQuantity(ProductId, Quantity + 1)">+</button>

@code {
    [Parameter] public Guid ProductId { get; set; }
    [Parameter] public int Quantity { get; set; }
}
```

</details>

<br>

<details>
<summary>✅ Good — EventCallback notifica o pai; filho permanece sem efeitos colaterais</summary>
<br>

```razor
@* QuantitySelector.razor *@
<button @onclick="DecrementAsync">-</button>
<span>@Quantity</span>
<button @onclick="IncrementAsync">+</button>

@code {
    [Parameter] public required int Quantity { get; set; }
    [Parameter] public required EventCallback<int> OnQuantityChanged { get; set; }

    private async Task DecrementAsync()
    {
        var updatedQuantity = Quantity - 1;

        await OnQuantityChanged.InvokeAsync(updatedQuantity);
    }

    private async Task IncrementAsync()
    {
        var updatedQuantity = Quantity + 1;

        await OnQuantityChanged.InvokeAsync(updatedQuantity);
    }
}
```

</details>

## Estado com [PersistentState]

Durante a prerenderização, componentes interativos são renderizados no servidor antes de o circuit
ser estabelecido. Sem persistência, o componente faz a mesma chamada ao servidor duas vezes: uma
na prerenderização e outra após a hidratação. O atributo `[PersistentState]` do .NET 10 serializa
o estado no HTML e o restaura no cliente, eliminando a chamada duplicada.

<details>
<summary>❌ Bad — chamada duplicada ao repositório: prerenderização e hidratação</summary>
<br>

```razor
@* OrderList.razor *@
@rendermode InteractiveServer

@code {
    private List<Order> orders = [];

    protected override async Task OnInitializedAsync()
    {
        orders = await orderRepository.FindPendingAsync();  // chamado duas vezes
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — [PersistentState] serializa o estado e evita chamada duplicada</summary>
<br>

```razor
@* OrderList.razor *@
@rendermode InteractiveServer

@code {
    [PersistentState]
    private List<Order> orders = [];

    protected override async Task OnInitializedAsync()
    {
        if (orders.Count > 0)
            return;

        orders = await orderRepository.FindPendingAsync();
    }
}
```

</details>

## Formulários

`EditForm` gerencia o `EditContext`, validação e submissão. `DataAnnotationsValidator` conecta as
anotações do model (`[Required]`, `[Range]`) ao `EditContext`. `ValidationMessage` exibe erros
por campo; `ValidationSummary` exibe todos os erros consolidados.

<details>
<summary>❌ Bad — formulário manual sem EditForm; validação ad hoc (improvisada) no handler</summary>
<br>

```razor
<form @onsubmit="SubmitAsync">
    <input type="text" @bind="productName" />
    <input type="number" @bind="quantity" />
    <button type="submit">Salvar</button>
</form>

@code {
    private string productName = string.Empty;
    private int quantity;

    private async Task SubmitAsync()
    {
        if (string.IsNullOrWhiteSpace(productName)) return;  // validação ad hoc (improvisada)

        await orderService.CreateAsync(productName, quantity);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — EditForm com DataAnnotationsValidator; submissão bloqueada enquanto inválida</summary>
<br>

```razor
<EditForm Model="orderInput" OnValidSubmit="SubmitAsync">
    <DataAnnotationsValidator />
    <ValidationSummary />

    <div>
        <label for="product-name">Produto</label>
        <InputText id="product-name" @bind-Value="orderInput.ProductName" />
        <ValidationMessage For="() => orderInput.ProductName" />
    </div>

    <div>
        <label for="quantity">Quantidade</label>
        <InputNumber id="quantity" @bind-Value="orderInput.Quantity" />
        <ValidationMessage For="() => orderInput.Quantity" />
    </div>

    <button type="submit" disabled="@isSubmitting">Salvar</button>
</EditForm>

@code {
    private readonly OrderInput orderInput = new();
    private bool isSubmitting;

    private async Task SubmitAsync()
    {
        isSubmitting = true;

        await orderService.CreateAsync(orderInput);

        isSubmitting = false;
    }
}
```

```csharp
// Models/OrderInput.cs
public class OrderInput
{
    [Required(ErrorMessage = "Nome do produto obrigatório")]
    public string ProductName { get; set; } = string.Empty;

    [Range(1, 1000, ErrorMessage = "Quantidade entre 1 e 1000")]
    public int Quantity { get; set; }
}
```

</details>

## Roteamento

Blazor usa `@page` para declarar rotas. Parâmetros de rota são propriedades com `[Parameter]` e
devem ter o tipo correto declarado na constraint da rota. `NavigationManager` navega
programaticamente e deve ser chamado em métodos, nunca inline na marcação.

<details>
<summary>❌ Bad — NavigationManager inline no markup; parâmetro de rota sem tipo</summary>
<br>

```razor
@page "/orders/{id}"
@inject NavigationManager navigation

<button @onclick="() => navigation.NavigateTo($"/orders/{OrderId}/edit")">Editar</button>

@code {
    [Parameter] public string? OrderId { get; set; }  // string em vez de Guid
}
```

</details>

<br>

<details>
<summary>✅ Good — rota tipada, navegação em método separado</summary>
<br>

```razor
@page "/orders/{orderId:guid}"
@inject NavigationManager navigation

<h1>Pedido</h1>
<button @onclick="NavigateToEdit">Editar</button>

@code {
    [Parameter] public required Guid OrderId { get; set; }

    private void NavigateToEdit()
    {
        var editRoute = $"/orders/{OrderId}/edit";

        navigation.NavigateTo(editRoute);
    }
}
```

</details>

## JS Interop

`IJSRuntime` chama funções JavaScript a partir do C#. `InvokeVoidAsync` para chamadas sem retorno;
`InvokeAsync<T>` para chamadas com retorno. O interop só está disponível após a renderização: use
`OnAfterRenderAsync` com o guard `firstRender` para não repetir a chamada a cada re-render.

<details>
<summary>❌ Bad — interop em OnInitializedAsync; falha silenciosa em prerenderização</summary>
<br>

```razor
@inject IJSRuntime jsRuntime

@code {
    protected override async Task OnInitializedAsync()
    {
        await jsRuntime.InvokeVoidAsync("initChart");  // não disponível em Static SSR / prerenderização
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — interop em OnAfterRenderAsync com guard firstRender</summary>
<br>

```razor
@inject IJSRuntime jsRuntime

@code {
    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender)
            return;

        await jsRuntime.InvokeVoidAsync("initChart", "#sales-chart");
    }
}
```

</details>
