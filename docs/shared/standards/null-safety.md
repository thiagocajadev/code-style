# Null Safety

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Null tem um espaço definido: as fronteiras do sistema. O sintoma mais comum de uso incorreto é `?.`
espalhado em todo o código como defesa preventiva. Isso é sinal de que os **contratos de entrada não
estão fechados**.

A pergunta certa é _"esse null deveria chegar até aqui?"_

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Null** (valor ausente) | Representa ausência de valor; comportamento varia entre linguagens |
| **Fronteira** (boundary) | Ponto onde dados externos entram no sistema: request, resposta de API, leitura de banco |
| **API** (Application Programming Interface, Interface de Programação de Aplicações) | Contrato externo que pode produzir nulls; checagem obrigatória na fronteira |
| **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto) | Protocolo onde requests trazem dados não confiáveis |
| **I/O** (Input/Output, Entrada/Saída) | Operação que cruza fronteira; banco, arquivo e rede são fontes de null |
| **JSON** (JavaScript Object Notation, Notação de Objetos JavaScript) | Formato de serialização onde campos ausentes viram `null` ou `undefined` |

## A regra: checa na fronteira, confia no interior

O sistema tem dois territórios com regras diferentes:

| Território    | O que é                                                                            | Regra                                        |
| ------------- | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| **Fronteira** | Onde dados de fora entram: request HTTP, resposta de API, leitura de banco, config | Checar. Normalizar. Rejeitar o inválido.     |
| **Interior**  | Domínio, serviços, funções de negócio                                              | Confiar no contrato. Sem checagem defensiva. |

```
entrada externa → fronteira (checa + normaliza) → domínio (confia no contrato)
```

Null que chega no interior é um **bug de fronteira** que deve ser corrigido na entrada.

## O que é fronteira

| Fronteira                      | Exemplos                                               |
| ------------------------------ | ------------------------------------------------------ |
| Entrada de request             | Body, query params, path params de uma requisição HTTP |
| Resposta de API externa        | JSON de terceiros, webhooks                            |
| Retorno de banco de dados      | `findById` que pode retornar null quando não encontra  |
| Variáveis de ambiente / config | `process.env`, `appsettings.json`                      |

## O que não é fronteira

Funções internas, serviços de domínio, cálculos: tudo que recebe dados **que já passaram pela
fronteira**. Essas funções confiam que quem chamou já garantiu o contrato.

<details>
<summary>❌ Ruim: interior checando null que não deveria existir</summary>
<br>

```js
function calculateDiscount(order) {
  if (!order) return 0;
  if (!order.discountRate) return 0;

  return order.total * order.discountRate;
}
```

</details>

<br>

<details>
<summary>✅ Bom: interior opera com contrato garantido</summary>
<br>

```js
function calculateDiscount(order) {
  const discount = order.total * order.discountRate;
  return discount;
}
```

</details>

A diferença é **responsabilidade bem definida**. Quem chama `calculateDiscount` é responsável por
passar um `Order` válido. Se não passar, é um bug de quem chamou.

## Como fechar a fronteira

Três padrões resolvem a maioria dos casos:

**1. Validação de schema na entrada**

```js
const orderRequest = CreateOrderSchema.parse(request.body); // lança se inválido

await createOrder(orderRequest); // domínio recebe dados garantidos
```

**2. Guard clause logo após I/O**

```js
const order = await orderRepository.findById(id);
if (!order) throw new NotFoundError(`Order ${id} not found`);

// a partir daqui, order é garantido — sem ?. no restante da função
const total = calculateTotal(order);
```

**3. Contratos não-nulos na construção**

```js
function buildOrder(id, items) {
  const order = { id, items: items ?? [] }; // items sempre [], nunca null
  return order;
}
```

## Coleções: nunca null, sempre vazia

Listas têm um estado neutro natural: `[]`. Retornar null para "sem resultados" força defesa em
cascata em cada caller, sem benefício nenhum.

| Função                         | Retorno correto                      | Por quê                                           |
| ------------------------------ | ------------------------------------ | ------------------------------------------------- |
| `findOrdersByUser(userId)`     | `Order[]`: `[]` se não há pedidos    | Ausência e vazio são equivalentes para quem itera |
| `findUserById(id)`             | `User \| null`: `null` se não existe | Ausência de entidade é informação relevante       |
| Propriedade de lista em classe | inicializada como `[]`               | Nunca precisa de `?.` para iterar                 |

## Onde usar `?.` e `??`

Esses operadores têm lugar nos campos **opcionais por design no domínio**, sem servir como defesa
contra contratos mal fechados.

<details>
<summary>❌ Ruim: ?. como defesa contra contrato que deveria ser fechado</summary>
<br>

```js
const discount = order?.discountRate ? order.total * order.discountRate : 0;
// order.discountRate nunca deveria ser null: contrato fraco exposto com `?.`
```

</details>

<br>

<details>
<summary>✅ Bom: ?. e ?? para campos opcionais por design</summary>
<br>

```js
const display = user.nickname ?? user.name; // nickname é opcional no modelo
const city = user.address?.city ?? "N/A"; // endereço pode não existir
```

</details>

Se você precisa de `?.` para acessar um campo que "sempre deveria existir", o problema está no
contrato.

## Schema evolution: campo novo em tabela existente

Quando uma regra de negócio muda e um campo novo entra no banco, os registros antigos ficam com null
por compatibilidade. Esse null não deve vazar para o domínio: o repositório é a fronteira que
absorve esse caso.

```
campo novo → registros antigos nulos → fronteira absorve → domínio nunca vê null
```

Três abordagens em ordem de preferência:

**1. Migration com DEFAULT: null nunca existe no banco**

A mais limpa. A migration preenche os registros antigos e garante valor para os novos. O domínio
nunca vê null.

```sql
ALTER TABLE orders ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal';
-- registros existentes recebem 'normal' automaticamente
```

**2. Normalização no repositório: null morre na fronteira**

Quando não é possível alterar o banco (legado, multi-tenant, sem controle da migration).

```js
async function findById(id) {
  const row = await database.queryOne("SELECT id, priority, status FROM orders WHERE id = ?", [id]);
  if (!row) return null;

  const order = {
    ...row,
    priority: row.priority ?? "normal", // null histórico normalizado na fronteira
  };

  return order;
}
```

**3. Campo opcional com semântica explícita: quando a ausência tem significado**

Às vezes null _quer dizer algo_: "esse pedido foi criado antes dessa feature existir". Nesse caso, o
campo é opcional por design, e o domínio tem uma função central que resolve a ausência.

```js
// priority é opcional — ausência significa "criado antes dessa feature existir"
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
| `?.` espalhado "porque pode ser null"      | Problema de fronteira: fechar em um dos casos acima |

## Implementação por linguagem

- [TypeScript](../typescript/conventions/advanced/null-safety.md): `strictNullChecks`,
  `noUncheckedIndexedAccess`, `??`, `?.`
- [C#](../csharp/conventions/advanced/null-safety.md): nullable reference types, `required`, `??=`,
  `Array.Empty<T>()`
