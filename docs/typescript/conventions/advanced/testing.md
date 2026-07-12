# Testes em TypeScript

> Escopo: TypeScript. Visão transversal: [shared/standards/testing.md](../../../shared/standards/testing.md).

Os padrões de teste do JavaScript continuam valendo. O TypeScript acrescenta uma checagem que roda
antes do teste: a **fixture** (massa de teste) declarada com **`satisfies`** (operador de
conformidade) é conferida contra o tipo real na compilação, e o **mock** (dados fictícios) que não
cumpre a interface é acusado ali mesmo. Os testes deixam de quebrar por causa de uma massa de dados
desatualizada, porque a massa desatualizada nem chega a rodar.

> Base JavaScript: [javascript/conventions/advanced/testing.md](../../../javascript/conventions/advanced/testing.md)

Usa [Vitest](https://vitest.dev/) nos exemplos. Mesma **API** (Application Programming Interface · Interface de Programação de Aplicações) do Jest, integração nativa com TypeScript.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar) | Estrutura em três fases: preparar contexto, executar comportamento, verificar resultado |
| **fixture** (massa de teste) | Dado de entrada conhecido reutilizado entre testes; tipado com `satisfies` |
| **`satisfies`** (operador de conformidade) | Valida que a fixture cumpre o tipo sem alargar a tipagem inferida |
| **mock** (dados fictícios) | Objeto falso que substitui dependência real e devolve respostas pré-definidas |
| **stub** (resposta fixa) | Substituto simples que retorna valor fixo, sem registrar chamadas |
| **type-only test** (teste só de tipo) | Verificação de comportamento do compilador (`expectTypeOf`); não roda em runtime |
| **`Vitest`** (test runner com TS nativo) | Runner moderno com integração TypeScript, compatível com a API do Jest |
| **expressive naming** (nomeação expressiva) | Variáveis de assert com nome do conceito (`actualPrice`, `expectedName`) |

## A massa de teste é conferida com `satisfies`

Uma massa de teste escrita como objeto solto envelhece em silêncio. O campo `total` vira
obrigatório na entidade, e o objeto do teste continua sem ele, porque nada liga os dois. O teste
passa, e o que ele está testando deixou de existir.

`satisfies User` liga a massa ao tipo real. Campo que falta e campo com tipo errado viram erro de
compilação, e a massa continua sendo o objeto literal que era, com cada valor no seu tipo exato.

<details>
<summary>❌ Ruim: a massa não tem tipo, e o campo errado passa despercebido</summary>

```ts
test("applies discount to order", () => {
  const order = {
    id: "ord-1",
    customrId: "cust-99", // typo: sem erro de compilação
    total: 100,
  };

  const actualOrder = applyDiscount(order, 10);

  const expectedTotal = 90;
  expect(actualOrder.total).toBe(expectedTotal);
});
```

</details>

<details>
<summary>✅ Bom: satisfies confere a massa contra o tipo real na compilação</summary>

```ts
test("applies 10% discount to order total", () => {
  const order = {
    id: "ord-1",
    customerId: "cust-99",
    total: 100,
  } satisfies Order;

  const actualOrder = applyDiscount(order, 10);
  const expectedTotal = 90;

  expect(actualOrder.total).toBe(expectedTotal);
});
```

</details>

## O mock implementa a interface de verdade

Um mock escrito como objeto qualquer só tem os métodos que o teste de hoje usa. Quando alguém
acrescenta um método na interface, o mock fica incompleto, e ninguém fica sabendo: o teste continua
passando contra um dublê que já não representa a dependência real.

Declarar o mock como `UserRepository` faz o compilador conferir a lista inteira de métodos e as
assinaturas de cada um. O método novo aparece como erro no teste, no mesmo commit em que foi criado.

<details>
<summary>❌ Ruim: o mock é um objeto solto, e não acompanha a interface</summary>

```ts
test("saves order and sends notification", async () => {
  const mockRepo = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(), // não usado: mas sem contrato, ninguém sabe se está faltando algo
  };

  const service = new OrderService(mockRepo as any);
  await service.createOrder({ customerId: "cust-1", total: 200 });

  expect(mockRepo.save).toHaveBeenCalledOnce();
});
```

</details>

<details>
<summary>✅ Bom: o mock declara a interface, e o compilador confere método por método</summary>

```ts
test("saves order on creation", async () => {
  const mockRepo: IOrderRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByCustomer: vi.fn().mockResolvedValue([]),
  };
  const service = new OrderService(mockRepo);
  await service.createOrder({ customerId: "cust-1", total: 200 });

  expect(mockRepo.save).toHaveBeenCalledOnce();
});
```

</details>

## `expectTypeOf` testa o tipo, e não o valor

Algumas funções existem para preservar tipos, e o teste comum não alcança isso. Um genérico que
devolve `TItem` a partir de `TItem[]` pode estar devolvendo `any` sem que nenhuma asserção de
valor perceba, porque `any` passa em qualquer comparação.

`expectTypeOf` (do Vitest) verifica o tipo que o compilador inferiu. Ele é a forma de testar as
funções utilitárias de tipo e de garantir que o genérico chega ao retorno como deveria.

<details>
<summary>✅ Bom: expectTypeOf confere o tipo que o compilador inferiu</summary>

```ts
import { expectTypeOf } from "vitest";

test("findById returns Order or null", () => {
  const result = findById("ord-1");
  expectTypeOf(result).toEqualTypeOf<Promise<Order | null>>();
});

test("applyDiscount preserves Order shape", () => {
  const order = { id: "ord-1", customerId: "cust-1", total: 100 } satisfies Order;
  const result = applyDiscount(order, 10);

  expectTypeOf(result).toEqualTypeOf<Order>();
});
```

</details>

## O teste verifica qual erro foi lançado

`expect(fn).rejects.toThrow()` passa quando qualquer erro sobe, inclusive um `TypeError` causado
por um bug no próprio teste. O teste fica verde por um motivo errado, e continua verde quando a
regra de negócio que ele deveria proteger some.

Verificar a classe do erro e a mensagem amarra o teste ao comportamento que interessa: o pedido
inexistente lança `NotFoundError`, e nada além disso conta como sucesso.

<details>
<summary>❌ Ruim: o teste aceita qualquer erro, inclusive um bug do próprio teste</summary>

```ts
test("throws on invalid order", async () => {
  await expect(createOrder({ customerId: "", total: -1 })).rejects.toThrow();
});
```

</details>

<details>
<summary>✅ Bom: a classe do erro e a mensagem são verificadas</summary>

```ts
test("throws ValidationError when total is negative", async () => {
  const invalidInput = { customerId: "cust-1", total: -1 };
  const actual = createOrder(invalidInput);

  await expect(actual).rejects.toThrow(ValidationError);
});
```

</details>
