# Segurança contra nulos

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Null tem um lugar certo no sistema: os limites. Quando o `?.` aparece espalhado pelo código inteiro, como defesa preventiva, isso indica que os **contratos de entrada não estão fechados**: o limite deixou passar um valor ausente, e cada função seguinte precisa checá-lo de novo.

Diante de cada `?.`, a pergunta a fazer é: _"esse null deveria ter chegado até aqui?"_

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Null** (valor ausente) | Representa ausência de valor; comportamento varia entre linguagens |
| **boundary** (limite do sistema) | Ponto onde dados externos entram no sistema: request, resposta de API, leitura de banco |
| **API** (Application Programming Interface · Interface de Programação de Aplicações) | Contrato externo que pode produzir nulls; checagem obrigatória no limite |
| **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) | Protocolo onde requests trazem dados não confiáveis |
| **I/O** (Input/Output · Entrada/Saída) | Operação que cruza o limite; banco, arquivo e rede são fontes de null |
| **JSON** (JavaScript Object Notation · Notação de Objetos JavaScript) | Formato de serialização onde campos ausentes viram `null` ou `undefined` |

## A regra: checa no limite, confia no interior

O sistema tem dois territórios, e as regras de um não valem no outro:

| Território    | O que é                                                                            | Regra                                        |
| ------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| **Limite**    | Onde dados de fora entram: request HTTP, resposta de API, leitura de banco, config | Checar. Normalizar. Rejeitar o inválido.     |
| **Interior**  | Domínio, serviços, funções de negócio                                              | Confiar no contrato. Sem checagem defensiva. |

```
entrada externa → limite (checa + normaliza) → domínio (confia no contrato)
```

Null que aparece no interior indica um limite que deixou passar. Corrija na entrada.

## O que é limite

| Limite                         | Exemplos                                               |
| ------------------------------ | ------------------------------------------------------ |
| Entrada de request             | Body, query params, path params de uma requisição HTTP |
| Resposta de API externa        | JSON de terceiros, webhooks                            |
| Retorno de banco de dados      | `findById` que pode retornar null quando não encontra  |
| Variáveis de ambiente / config | `process.env`, `appsettings.json`                       |

## O que não é limite

Funções internas, serviços de domínio, cálculos: tudo que recebe dados **já filtrados pelo limite**. Essas funções não checam nada, porque confiam que quem chamou entregou o contrato cumprido.

<details>
<summary>❌ Ruim: interior checando null que não deveria existir</summary>

```js
function calculateDiscount(order) {
  if (!order) return 0;
  if (!order.discountRate) return 0;

  return order.total * order.discountRate;
}
```

</details>

<details>
<summary>✅ Bom: interior opera com contrato garantido</summary>

```js
function calculateDiscount(order) {
  const discount = order.total * order.discountRate;
  return discount;
}
```

</details>

A diferença está em quem responde pelo quê. Passar um `Order` válido é responsabilidade de quem chama `calculateDiscount`. Se chegar inválido, o bug é de quem chamou, e checar dentro da função apenas esconderia esse bug.

## Como fechar o limite

Três padrões dão conta da maioria dos casos:

**1. Validação de schema na entrada**

```js
const orderRequest = CreateOrderSchema.parse(request.body); // lança se inválido

await createOrder(orderRequest); // domínio recebe dados garantidos
```

**2. Guard clause logo após I/O**

```js
const order = await orderRepository.findById(id);
if (!order) throw new NotFoundError(`Order ${id} not found`);

// a partir daqui, order é garantido: sem ?. no restante da função
const total = calculateTotal(order);
```

**3. Contratos não-nulos na construção**

```js
function buildOrder(id, items) {
  const order = { id, items: items ?? [] }; // items sempre [], nunca null
  return order;
}
```

<a id="collections-never-null"></a>

## Coleções: nunca null, sempre vazia

Uma lista já tem um estado neutro pronto: `[]`. Devolver null para dizer "não achei nada" não informa mais do que a lista vazia informaria, e obriga cada chamador a se defender antes de iterar.

| Função                         | Retorno correto                      | Por quê                                           |
| ------------------------------ | ------------------------------------ | ------------------------------------------------- |
| `findOrdersByUser(userId)`     | `Order[]`: `[]` se não há pedidos    | Ausência e vazio são equivalentes para quem itera |
| `findUserById(id)`             | `User \| null`: `null` se não existe | Ausência de entidade é informação relevante       |
| Propriedade de lista em classe | inicializada como `[]`               | Nunca precisa de `?.` para iterar                 |

## Quando `?.` e `??` ajudam e quando escondem um bug

Esses operadores existem para o campo que é **opcional por design no domínio**, aquele que legitimamente pode não estar lá. Não servem de escudo contra contrato mal fechado.

<details>
<summary>❌ Ruim: ?. como defesa contra contrato que deveria ser fechado</summary>

```js
const discount = order?.discountRate ? order.total * order.discountRate : 0;
// order.discountRate nunca deveria ser null: contrato fraco exposto com `?.`
```

</details>

<details>
<summary>✅ Bom: ?. e ?? para campos opcionais por design</summary>

```js
const display = user.nickname ?? user.name; // nickname é opcional no modelo
const city = user.address?.city ?? "N/A"; // endereço pode não existir
```

</details>

Se você precisa de `?.` para acessar um campo que "sempre deveria existir", o contrato está aberto. Feche o contrato e remova o operador.

<a id="new-column-on-existing-table"></a>

## Campo novo em tabela que já tem dados

Uma regra de negócio muda, um campo novo entra no banco, e os registros antigos ficam com null porque não havia valor para eles. Esse null é histórico e o domínio não deve recebê-lo. O repositório resolve o valor antes de entregar o dado.

```
campo novo → registros antigos nulos → limite absorve → domínio nunca vê null
```

Três abordagens, em ordem de preferência:

**1. Migration com DEFAULT: null nunca chega a existir no banco**

A saída mais limpa. A migration preenche os registros antigos e garante valor para os novos, e o domínio nunca vê null nenhum.

```sql
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal';
-- registros existentes recebem 'normal' automaticamente
```

**2. Normalização no repositório: o null morre no limite**

Use quando alterar o banco está fora de alcance: legado, multi-tenant, migration sob controle de outro time.

```js
async function findById(id) {
  const row = await database.queryOne("SELECT id, priority, status FROM orders WHERE id = ?", [id]);
  if (!row) return null;

  const order = {
    ...row,
    priority: row.priority ?? "normal", // null histórico normalizado no limite
  };

  return order;
}
```

**3. Campo opcional de verdade: quando a ausência significa alguma coisa**

Às vezes o null carrega informação: "esse pedido foi criado antes dessa feature existir". Nesse caso o campo é opcional por design, e o domínio resolve a ausência em uma função central, sem espalhar `?.` pelo código.

```js
// priority é opcional: ausência significa "criado antes dessa feature existir"
function getEffectivePriority(order) {
  const priority = order.priority ?? "normal"; // uma função resolve, sem espalhar ?. pelo domínio
  return priority;
}
```

| Situação                                   | Abordagem                                           |
| ------------------------------------------ | --------------------------------------------------- |
| Campo sem significado em registros antigos | Migration com `DEFAULT`                             |
| Banco legado, sem controle da migration    | Normaliza no repositório                            |
| Ausência tem significado de negócio        | Campo opcional, função de resolução centralizada    |
| `?.` espalhado "porque pode ser null"      | Problema de limite: fechar em um dos casos acima |

## Implementação por linguagem

- [TypeScript](../../typescript/conventions/advanced/null-safety.md): `strictNullChecks`,
  `noUncheckedIndexedAccess`, `??`, `?.`
- [C#](../../csharp/conventions/advanced/null-safety.md): nullable reference types, `required`, `??=`,
  `Array.Empty<T>()`
