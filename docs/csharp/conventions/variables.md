# Variáveis em C#

Declarar uma variável em C# envolve duas escolhas. A primeira é entre `var`, que deixa o compilador descobrir o tipo, e o tipo escrito por extenso, que deixa o tipo visível para quem lê. A segunda é sobre o valor poder mudar depois: `const` e **readonly** (somente leitura) prendem o valor, e prender o valor é o que permite ler a classe sem procurar quem a alterou no meio do caminho.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **var** (inferência de tipo local) | Palavra-chave que deixa o compilador inferir o tipo; usar quando o lado direito deixa óbvio |
| **explicit type** (tipo explícito) | Declarar o tipo (`Order order = ...`); obrigatório quando a leitura precisa rastrear o tipo |
| **readonly** (somente leitura) | Modificador que impede reatribuição de campo após o construtor; comunica valor fixo |
| **const** (constante de compilação) | Valor literal conhecido em tempo de compilação; embutido nos chamadores |
| **scope** (escopo) | Região onde a variável é visível; manter o escopo curto reduz superfície de bugs |
| **target-typed new** (`new()` com alvo inferido) | Sintaxe C# 9+ que omite o tipo: `List<int> xs = new();` |
| **domain term** (termo de domínio) | Palavra que conta o propósito (`pendingInvoice`); `invoiceVar` só repete a estrutura |

<a id="var-vs-explicit-type"></a>

## Quando usar var e quando escrever o tipo

Use `var` quando o lado direito da atribuição já mostra o tipo, como em `new List<OrderItem>()`. Escreva o tipo quando o lado direito é uma chamada de método: `var result = ProcessOrder(request)` esconde a resposta, e quem lê precisa abrir `ProcessOrder` para saber o que tem em mãos. A pergunta que decide é simples: o leitor descobre o tipo sem sair desta linha?

<details>
<summary>❌ Ruim: tipo obscuro</summary>

```csharp
var result = ProcessOrder(request); // Order? InvoiceResult? ViewModel? impossível saber
var discount = Calculate(order);    // decimal? int? percentual ou valor absoluto?
```

</details>

<details>
<summary>✅ Bom: tipo legível; `var` apenas onde óbvio</summary>

```csharp
Order order = ProcessOrder(request);
decimal discount = Calculate(order);

var items = new List<OrderItem>(); // tipo explícito no lado direito
```

</details>

<a id="const-and-readonly"></a>

## const trava em compilação, readonly trava em execução

`const` serve para o valor que já se conhece antes de rodar o programa: número, texto, valor literal. O compilador copia esse valor direto para dentro de quem usa. `readonly` serve para o valor que só aparece quando o programa sobe, como uma URL vinda da configuração: o construtor atribui e ninguém mais consegue reatribuir. Um campo privado sem nenhum dos dois modificadores fica aberto a qualquer método da classe, e aí descobrir de onde veio o valor atual vira uma busca por todos os pontos de escrita.

<details>
<summary>❌ Ruim: campo reatribuível onde o valor deveria ser fixo</summary>

```csharp
public class OrderService
{
    private static int maxRetries = 3; // qualquer método pode alterar
    private string _apiUrl;             // reatribuível após o construtor

    public OrderService(IConfiguration config)
    {
        _apiUrl = config["ApiUrl"];
    }
}
```

</details>

<details>
<summary>✅ Bom: valor fixo declarado explicitamente</summary>

```csharp
public class OrderService(IConfiguration config)
{
    private const int MaxRetries = 3;
    private readonly string _apiUrl = config["ApiUrl"];
}
```

</details>

<a id="records-immutable"></a>

## record para dados que não mudam depois de criados

Prefira `record` a `class` em **DTO** (Data Transfer Object · objeto que só carrega dados), request, response e value object. Uma linha declara o contrato inteiro, e as propriedades já nascem sem setter: depois de construído, o objeto não muda mais. O `record` ainda traz de graça a comparação por valor, ou seja, dois pedidos com os mesmos campos são considerados iguais, o que é o comportamento esperado de um contrato de dados.

<details>
<summary>❌ Ruim: class aberta a alteração como contrato de dados</summary>

```csharp
public class OrderRequest
{
    public string ProductId { get; set; } // setter público: qualquer código pode alterar
    public int Quantity { get; set; }     // estado alterado sem controle
}
```

</details>

<details>
<summary>✅ Bom: record immutable, contrato explícito</summary>

```csharp
public record OrderRequest(string ProductId, int Quantity);
```

</details>

<a id="magic-values"></a>

## Sem valores mágicos

Um número solto no meio de um `if` guarda uma regra de negócio que ninguém consegue ler. `order.Status == 2` obriga quem lê a caçar o significado de `2` em outro arquivo, e a caça se repete a cada nova leitura. Uma constante nomeada (`OrderStatusApproved`) guarda o mesmo `2` e responde a pergunta no lugar em que ela nasce.

<details>
<summary>❌ Ruim: literais sem significado</summary>

```csharp
if (order.Status == 2)    // o que é 2?
    return;

if (discount > 0.15m)    // limite de desconto? taxa? de onde vem esse número?
    return;
```

</details>

<details>
<summary>✅ Bom: constantes nomeadas</summary>

```csharp
private const int OrderStatusApproved = 2;
private const decimal MaxDiscountRate = 0.15m;

if (order.Status == OrderStatusApproved)
    return;

if (discount > MaxDiscountRate)
    return;
```

</details>

<a id="direct-mutation"></a>

## Devolver um novo objeto em vez de alterar o que chegou

Quando um método altera o objeto que recebeu por parâmetro, quem chamou fica com um objeto diferente do que entregou, e nada na assinatura avisa isso. `ApplyDiscount(order)` parece uma consulta e é uma escrita. A palavra-chave `with` do `record` cria uma cópia com os campos trocados, e o método passa a devolver o resultado. Aí a assinatura conta a história inteira: entra um pedido, sai um pedido com desconto.

<details>
<summary>❌ Ruim: alteração acoplada e efeito colateral oculto</summary>

```csharp
public void ApplyDiscount(Order order)
{
    order.Discount = 10; // altera o objeto do chamador
    order.Total -= 10;   // efeito colateral invisível
}
```

</details>

<details>
<summary>✅ Bom: retorna novo estado, sem efeitos colaterais</summary>

```csharp
public Order ApplyDiscount(Order order)
{
    var discountedOrder = order with { Discount = 10, Total = order.Total - 10 };
    return discountedOrder;
}
```

</details>
