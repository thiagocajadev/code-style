# Visual Density

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Código é lido muito mais vezes do que escrito. **Visual density** (densidade visual, como o olho percorre o código) trata de agrupar o que pertence junto e separar o que é distinto, sem precisar de comentários para guiar o olho.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **blank line** (linha em branco) | Separador entre grupos coesos; uma só, nunca duas seguidas |
| **tight pair** (par grudado) | Duas linhas relacionadas, sem `blank line` entre elas; o respiro vem antes ou depois do par |
| **tight trio** (trio grudado) | Três declarações simples que se leem como um único grupo; sem `blank line` interna |
| **explaining return** (retorno explicativo) | `const X = …; return X;` — par grudado em que a constante nomeia o valor retornado |
| **semantic pair** (par semântico) | Duas linhas em que a final usa o valor da penúltima; ficam grudadas para mostrar a dependência |
| **orphan line** (linha órfã) | Declaração isolada entre `blank lines` que pertencia ao grupo anterior; cria pausa sem motivo |
| **declaration + guard** (declaração e guarda) | Variável seguida do `if` que a valida; o respiro vem depois do par, não entre ele |
| **wall of code** (muralha de código) | Quatro ou mais linhas relacionadas sem respiro; sempre quebrar em `2+2` |
| **method phase** (fase do método) | Etapa lógica (preparar, transformar, persistir, responder); cada fase ganha seu respiro |

## Referência rápida

| Regra | Descrição |
|---|---|
| **Grupo padrão: 2 linhas** | Linhas relacionadas ficam juntas; a separação natural é por par |
| **Trio tolerado** | Três declarações simples consecutivas (`const`, `let`, `var`) podem ficar juntas quando a divisão criaria uma linha solta |
| **4+ quebra em 2+2** | A partir de quatro linhas relacionadas, sempre dividir para evitar muralha |
| **Explaining return é par grudado** | `const X = …; return X;` é um par de duas linhas sem `blank line` entre declaração e `return` |
| **Blank line antes do return** | Quando há dois ou mais passos antes do `return`, uma `blank line` o destaca como encerramento |
| **Par semântico encadeado** | Quando a linha final depende da penúltima (ex: `label = f(cityLine)`), elas ficam grudadas |
| **Declaração + guarda = par** | A variável e o `if` que a valida ficam juntos; o respiro vem depois do par |
| **Strings longas** | Extrair fragmentos em variáveis nomeadas antes de montar o resultado |
| **Nunca duplo blank** | Exatamente uma `blank line` entre grupos; duas é ruído |

## A regra central

**Grupos pequenos separados por uma linha em branco.** Dois é o tamanho natural; três é permitido quando a divisão criaria uma linha solta. A partir de quatro, sempre quebrar. Nunca duas linhas em branco seguidas: é ruído, não respiro.

## Explaining return: par grudado

Uma `const` nomeada acima do `return` explica o valor retornado. Quando há **apenas esse passo** antes do `return`, os dois formam um par de duas linhas sem `blank line` entre eles. A `blank line` separa o par do que vem antes — ela não fragmenta o par.

<details>
<summary>❌ Ruim — blank line fragmenta o par</summary>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;

  return status;
}
```

A `blank line` isola o `return` como se fosse um parágrafo de encerramento, mas não há parágrafo antes — só uma linha. O olho procura o bloco que foi encerrado e não encontra.

</details>

<details>
<summary>✅ Bom — par grudado</summary>

```js
function mapErrorToStatus(error) {
  const status = errorStatusByCode[error.code] ?? 500;
  return status;
}
```

Duas linhas que se leem como uma unidade: "o status vem da tabela, retorne."

</details>

## Return separado: quando há 2+ passos antes

Quando o `return` é precedido por dois ou mais passos distintos (preparar dados, montar envelope, calcular status), a `blank line` antes dele marca a transição do "preparar" para o "entregar".

<details>
<summary>✅ Bom — 3 passos preparam o return</summary>

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

## Linha órfã é pior que trio grudado

Três declarações simples consecutivas formam um grupo coeso. Partir em `2+1` deixa a última linha solta entre `blank lines`, sem contexto: o leitor pausa procurando o motivo da separação e descobre que era só mais uma constante. Mantenha as três juntas. Só divida em `2+2` quando houver quatro ou mais.

<details>
<summary>❌ Ruim — linha órfã entre blank lines</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;

const ONE_DAY_MS = 86_400_000;
```

A linha solta parece um passo separado, mas é só mais uma constante. O leitor pausa procurando o motivo da separação e não encontra.

</details>

<details>
<summary>✅ Bom — trio grudado</summary>

```js
const MINIMUM_DRIVING_AGE = 18;
const ORDER_STATUS_APPROVED = 2;
const ONE_DAY_MS = 86_400_000;
```

</details>

<details>
<summary>✅ Bom — quatro declarações viram 2+2</summary>

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
<summary>❌ Ruim — dependência direta partida</summary>

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

`cityLine` é consumido imediatamente por `label`. Separá-los com `blank line` esconde a relação.

</details>

<details>
<summary>✅ Bom — par semântico grudado</summary>

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

Dois pares de duas linhas + `return` destacado. O leitor vê "nome, endereço / cidade, label final / entrega."

</details>

## Declaração + guarda = 1 grupo

Uma variável seguida do `if` que a valida formam um par semântico. A `blank line` vem **depois** do par, não entre ele.

## Fases de um método

Métodos com múltiplos passos (buscar, transformar, persistir, responder) devem deixar cada fase visível. Cada fase pode ter até 2 linhas antes de um respiro; 3 quando são declarações simples do mesmo tipo.

## Strings longas

Uma string longa colada em um `return` esconde as partes que a compõem. Extraia fragmentos em variáveis nomeadas antes de montar o resultado: o template final fica legível e os pedaços ganham semântica.

---

## Por linguagem

Os mesmos princípios com exemplos idiomáticos de cada stack:

- [JavaScript](../../javascript/conventions/visual-density.md)
- [C#](../../csharp/conventions/visual-density.md)
- [CSS](../../css/conventions/visual-density.md)
- [SQL](../../sql/conventions/visual-density.md)
