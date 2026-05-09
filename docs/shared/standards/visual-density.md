# Visual Density

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Código é lido muito mais vezes do que escrito. Densidade visual é sobre agrupar o que pertence junto e separar o que é distinto, sem precisar de comentários para guiar o olho.

## Referência rápida

| Regra | Descrição |
|---|---|
| **Grupo padrão: 2 linhas** | Linhas relacionadas ficam juntas; a separação natural é por par |
| **3 linhas atômicas toleradas** | Declarações simples consecutivas (const/let/var) podem ir até 3 linhas sem blank quando a divisão criaria órfão de 1 |
| **4+ quebra em 2+2** | A partir de 4 linhas relacionadas, sempre dividir para evitar muralha |
| **Explaining Return tight** | `const X = …; return X;` é par de 2 linhas sem blank entre declaração e return |
| **Blank antes do return** | Quando há 2 ou mais passos antes do return, blank line o destaca como encerramento |
| **Par semântico encadeado** | Quando a linha final depende da penúltima (ex: `label = f(cityLine)`), elas ficam tight |
| **Declaração + guarda = par** | A variável e o `if` que a valida ficam juntos; blank vem depois do par |
| **Strings longas** | Extrair fragmentos em variáveis nomeadas antes de montar o resultado |
| **Nunca duplo blank** | Exatamente uma linha em branco entre grupos; duas é ruído |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural; três é permitido quando a divisão criaria uma linha solitária. A partir de quatro, sempre quebrar. Nunca duas linhas em branco: é ruído, não respiro.

## Explaining Return: par tight

Uma `const` nomeada acima do `return` explica o valor retornado. Quando há **apenas esse passo** antes do `return`, os dois formam um par de 2 linhas sem blank entre eles. A linha em branco separa o par do que vem antes, não fragmenta o par.

<details>
<summary>❌ Bad — blank fragmenta o par</summary>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;

  return status;
}
```

O blank isola o `return` como se fosse um parágrafo de encerramento, mas não há parágrafo antes: só uma linha. O olho procura o bloco que foi encerrado e não encontra.

</details>

<details>
<summary>✅ Good — par tight</summary>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

Duas linhas que se leem como uma unidade: "o status vem da tabela, retorne."

</details>

## Return separado: quando há 2+ passos antes

Quando o `return` é precedido por dois ou mais passos distintos (preparar dados, montar envelope, calcular status), o blank line antes dele marca a transição do "preparar" para o "entregar".

<details>
<summary>✅ Good — 3 passos preparam o return</summary>

```js
app.get('/api/orders/:id', async (httpRequest, httpResponse) => {
  const result = await findOrderById.handle(httpRequest.params.id);
  if (result.isFailure) {
    const httpStatus = mapErrorToStatus(result.error);
    const envelope = buildErrorEnvelope(result.error.code, result.error.message, httpRequest);
    const errorResponse = httpResponse.status(httpStatus).json(envelope);

    return errorResponse;
  }

  const envelope = buildEnvelope(result.value, httpRequest);
  const okResponse = httpResponse.status(200).json(envelope);

  return okResponse;
});
```

</details>

## Órfão de 1 linha: pior que trio atômico

Três declarações simples consecutivas (const, let, var, atributos soltos) formam um grupo coeso. Partir em 2+1 deixa a última linha solitária entre blanks, sem contexto. Mantenha as três juntas. Só divida em 2+2 a partir de quatro declarações.

<details>
<summary>❌ Bad — órfão entre blanks</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
```

A linha solitária parece um passo separado, mas é só mais uma constante. O leitor pausa procurando o motivo da separação e não encontra.

</details>

<details>
<summary>✅ Good — trio tight (3 atomics)</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;
const ONE_DAY_MS = 86_400_000;
```

</details>

<details>
<summary>✅ Good — 4 atomics viram 2+2</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
const MAX_RETRY_ATTEMPTS = 3;
```

</details>

## Par semântico encadeado

Quando a linha final **depende** da penúltima (usa o valor recém declarado), as duas formam um par semântico. A quebra natural fica antes do par, não entre ele e sua dependência direta.

<details>
<summary>❌ Bad — dependência direta partida</summary>

```csharp
public static string BuildShippingLabel(Order order)
{
    var fullName = $"{order.Customer.FirstName} {order.Customer.LastName}";
    var addressLine = $"{order.Address.Street}, {order.Address.Number}";

    var cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}";

    var label = $"{fullName}\n{addressLine}\n{cityLine}\nOrder #{order.Id}";

    return label;
}
```

`cityLine` é consumido imediatamente por `label`. Separá-los com blank esconde a relação.

</details>

<details>
<summary>✅ Good — par semântico tight</summary>

```csharp
public static string BuildShippingLabel(Order order)
{
    var fullName = $"{order.Customer.FirstName} {order.Customer.LastName}";
    var addressLine = $"{order.Address.Street}, {order.Address.Number}";

    var cityLine = $"{order.Address.City} - {order.Address.State}, {order.Address.ZipCode}";
    var label = $"{fullName}\n{addressLine}\n{cityLine}\nOrder #{order.Id}";

    return label;
}
```

Dois pares de 2 linhas + `return` destacado. O leitor vê "nome, endereço / cidade, label final / entrega."

</details>

## Declaração + guarda = 1 grupo

Uma variável seguida do `if` que a valida formam um par semântico. A linha em branco vem **depois** do par, não entre eles.

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase visível. Cada fase pode ter até 2 linhas antes de um respiro; 3 quando são atômicas homogêneas.

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado: o template final fica legível e os pedaços ganham semântica.

---

## Por linguagem

Os mesmos princípios com exemplos idiomáticos de cada stack:

- [JavaScript](../../javascript/conventions/visual-density.md)
- [C#](../../csharp/conventions/visual-density.md)
- [CSS](../../css/conventions/visual-density.md)
- [SQL](../../sql/conventions/visual-density.md)
