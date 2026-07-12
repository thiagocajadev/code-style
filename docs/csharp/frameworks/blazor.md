# Interfaces com Blazor

> Escopo: C#/.NET. Guia baseado em **Blazor .NET 10** com **C# 14**.

Blazor permite escrever a interface do usuário em C#, sem JavaScript. Um componente é um arquivo
`.razor` que junta a marcação **HTML** (HyperText Markup Language · Linguagem de Marcação de
Hipertexto) e o código que a alimenta. O mesmo componente roda de dois jeitos: no servidor, com o
navegador conectado por **SignalR** (canal que mantém servidor e navegador conversando o tempo
todo), ou dentro do próprio navegador, com **WebAssembly** (formato que o navegador executa como
se fosse código nativo).

Este guia cobre os padrões de componentes, estado, formulários, roteamento e interoperabilidade
com JavaScript seguindo os princípios de [methods.md](../conventions/methods.md) e
[visual-density.md](../conventions/visual-density.md).

## Conceitos fundamentais

| Conceito                          | O que é                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Render Mode** (Modo de renderização) | Define onde o componente é executado: servidor via SignalR, browser via WebAssembly, ou híbrido     |
| **Component** (Componente)        | Arquivo `.razor` com marcação HTML e bloco `@code { }` com lógica C#                                    |
| **Parameter** (Parâmetro)         | Propriedade com `[Parameter]` que recebe dados do componente pai                                         |
| **EventCallback** (callback de evento)   | Delegate tipado para comunicação filho para pai; dispara método assíncrono no componente pai             |
| **CascadingParameter** (parâmetro em cascata) | Dado propagado pela árvore de componentes sem passar manualmente em cada nível                       |
| **[PersistentState]** (atributo de estado persistente) | Atributo .NET 10 que persiste estado durante a prerenderização, evitando chamadas duplicadas ao servidor |
| **EditForm** (formulário editável)       | Componente de formulário Blazor: gerencia `EditContext`, validação e submissão                           |
| **IJSRuntime** (runtime de interop com JS) | Serviço para interoperabilidade JavaScript: invoca funções JS e recebe retornos no C#                  |

<a id="render-modes"></a>

## Modos de renderização

O modo de renderização decide onde o componente roda e se ele responde a cliques. Cada componente
declara o seu com `@rendermode`, ou herda o do pai. A escolha tem custo: um componente que só
mostra texto, marcado como interativo, abre uma conexão com o servidor e a mantém aberta sem
precisar. Um componente com botão, marcado como estático, aparece na tela e ignora o clique.

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
<summary>❌ Ruim: rendermode global no App.razor força SignalR em páginas estáticas</summary>

```razor
@* App.razor: força Interactive Server em TUDO, incluindo páginas sem interatividade *@
<Routes @rendermode="InteractiveServer" />
```

</details>

<details>
<summary>✅ Bom: Static SSR como padrão; rendermode declarado por componente</summary>

```razor
@* App.razor: sem rendermode global; cada página declara o próprio *@
<Routes />
```

```razor
@* Pages/OrderDashboard.razor: interativo porque precisa de estado em tempo real *@
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

<a id="components"></a>

## Componentes

O componente tem duas partes: a marcação, que é HTML com diretivas Razor (`@`), e o bloco `@code`,
que guarda a lógica. Deixe o cálculo no `@code`, atrás de uma propriedade com nome, e a marcação
fica com a leitura desse nome. Uma conta escrita no meio do HTML se repete a cada renderização e
mistura a formatação com a regra.

<details>
<summary>❌ Ruim: cálculo e ternário inline na marcação</summary>

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

<details>
<summary>✅ Bom: computed properties no @code, marcação sem lógica</summary>

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

<a id="parameters"></a>

## Parâmetros e EventCallback

Os dados descem e os eventos sobem. `[Parameter]` marca a propriedade que o componente pai
preenche. `EventCallback<T>` faz o caminho inverso: o filho avisa que algo aconteceu, e o pai
decide o que fazer. O filho continua sem saber quem o usa, e por isso serve a várias telas.

<details>
<summary>❌ Ruim: filho injeta serviço para notificar mudança; acoplamento desnecessário</summary>

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

<details>
<summary>✅ Bom: EventCallback notifica o pai; filho permanece sem efeitos colaterais</summary>

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

<a id="persistent-state"></a>

## Estado com [PersistentState]

Para o usuário ver a página logo, o Blazor a monta uma primeira vez no servidor e envia o HTML
pronto. Depois a conexão se estabelece e o componente ganha vida no navegador. O problema é que
esse segundo momento roda a mesma busca de dados de novo: a API é chamada duas vezes para exibir
a mesma lista. O `[PersistentState]` do .NET 10 guarda o resultado da primeira busca dentro do
HTML enviado, e o componente o encontra ali quando acorda.

<details>
<summary>❌ Ruim: chamada duplicada ao repositório: prerenderização e hidratação</summary>

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

<details>
<summary>✅ Bom: [PersistentState] serializa o estado e evita chamada duplicada</summary>

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

<a id="forms"></a>

## Formulários

O `EditForm` cuida do formulário inteiro: acompanha o que o usuário digitou, dispara a validação e
chama o método de envio quando tudo está válido. O `DataAnnotationsValidator` faz valer as
anotações que já estão no model (`[Required]`, `[Range]`), então a regra é escrita uma vez e vale
no formulário e na API. `ValidationMessage` mostra o erro ao lado do campo, e `ValidationSummary`
lista todos juntos no topo.

<details>
<summary>❌ Ruim: formulário manual sem EditForm; validação ad hoc no handler</summary>

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

<details>
<summary>✅ Bom: EditForm com DataAnnotationsValidator; submissão bloqueada enquanto inválida</summary>

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

<a id="routing"></a>

## Roteamento

A rota é declarada no topo do componente com `@page`. O trecho variável da URL chega como
propriedade marcada com `[Parameter]`, e vale declarar o tipo esperado na própria rota
(`{id:guid}`): assim uma URL com um id malformado devolve 404 antes de o componente rodar. Para
navegar a partir do código, use o `NavigationManager` dentro de um método com nome.

<details>
<summary>❌ Ruim: NavigationManager inline no markup; parâmetro de rota sem tipo</summary>

```razor
@page "/orders/{id}"
@inject NavigationManager navigation

<button @onclick="() => navigation.NavigateTo($"/orders/{OrderId}/edit")">Editar</button>

@code {
    [Parameter] public string? OrderId { get; set; }  // string em vez de Guid
}
```

</details>

<details>
<summary>✅ Bom: rota tipada, navegação em método separado</summary>

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

<a id="js-interop"></a>

## Interoperar com JavaScript

Quando uma biblioteca só existe em JavaScript, o `IJSRuntime` faz a ponte: `InvokeVoidAsync` para
chamar sem esperar resposta, `InvokeAsync<T>` para receber um valor de volta. Só chame depois que
o componente virou HTML na tela, dentro de `OnAfterRenderAsync`, porque antes disso o elemento que
o JavaScript vai procurar ainda não existe. E confira o `firstRender`: sem esse guard, a chamada
se repete a cada nova renderização do componente.

<details>
<summary>❌ Ruim: interop em OnInitializedAsync; falha silenciosa em prerenderização</summary>

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

<details>
<summary>✅ Bom: interop em OnAfterRenderAsync com guard firstRender</summary>

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
