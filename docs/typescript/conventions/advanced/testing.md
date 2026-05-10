# Testing

> Escopo: TypeScript. Visão transversal: [shared/standards/testing.md](../../../shared/standards/testing.md).

Os padrões de testing do JavaScript se aplicam sem mudança. O TypeScript adiciona: **fixture** (massa de teste) tipada com **`satisfies`** (operador de conformidade), **mock** (dados fictícios) com contratos explícitos e verificação de tipos nos testes.

> Base JavaScript: [javascript/conventions/advanced/testing.md](../../../../javascript/conventions/advanced/testing.md)

Usa [Vitest](https://vitest.dev/) nos exemplos — mesma **API** (Application Programming Interface, Interface de Programação de Aplicações) do Jest, integração nativa com TypeScript.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **AAA** (Arrange, Act, Assert, Arranjar, Agir, Atestar) | Estrutura em três fases: preparar contexto, executar comportamento, verificar resultado |
| **fixture** (massa de teste) | Dado de entrada conhecido reutilizado entre testes; tipado com `satisfies` |
| **`satisfies`** (operador de conformidade) | Valida que a fixture cumpre o tipo sem alargar a tipagem inferida |
| **mock** (dados fictícios) | Objeto falso que substitui dependência real e devolve respostas pré-definidas |
| **stub** (resposta fixa) | Substituto simples que retorna valor fixo, sem registrar chamadas |
| **type-only test** (teste só de tipo) | Verificação de comportamento do compilador (`expectTypeOf`); não roda em runtime |
| **`Vitest`** (test runner com TS nativo) | Runner moderno com integração TypeScript, compatível com a API do Jest |
| **expressive naming** (nomeação expressiva) | Variáveis de assert com nome do conceito (`actualPrice`, `expectedName`) |

## Fixtures tipadas com satisfies

`satisfies` valida o objeto de teste contra o tipo sem alargá-lo. Campos ausentes ou com
tipo errado geram erro de compilação antes de rodar o teste.

<details>
<summary>❌ Ruim — fixture sem tipo, campo errado passa sem erro</summary>
<br>

```ts
test("applies discount to order", () => {
  const order = {
    id: "ord-1",
    customrId: "cust-99", // typo — sem erro de compilação
    total: 100,
  };

  const actualOrder = applyDiscount(order, 10);

  const expectedTotal = 90;
  expect(actualOrder.total).toBe(expectedTotal);
});
```

</details>

<br>

<details>
<summary>✅ Bom — satisfies valida o shape em compilação</summary>
<br>

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

## Mocks com interface

Mocks implementam a interface explicitamente. O compilador verifica que todos os métodos
necessários estão presentes e com as assinaturas corretas.

<details>
<summary>❌ Ruim — mock como objeto genérico, sem contrato</summary>
<br>

```ts
test("saves order and sends notification", async () => {
  const mockRepo = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(), // não usado — mas sem contrato, ninguém sabe se está faltando algo
  };

  const service = new OrderService(mockRepo as any);
  await service.createOrder({ customerId: "cust-1", total: 200 });

  expect(mockRepo.save).toHaveBeenCalledOnce();
});
```

</details>

<br>

<details>
<summary>✅ Bom — mock implementa a interface, compilador verifica o contrato</summary>
<br>

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

## expectTypeOf: testar contratos de tipo

`expectTypeOf` (Vitest) verifica que o tipo inferido de um valor corresponde ao esperado.
Útil para funções de utilidade de tipos e garantias de que generics preservam o tipo.

<details>
<summary>✅ Bom — expectTypeOf verifica o contrato em compilação e runtime</summary>
<br>

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

## Erros tipados

Testar que o tipo de erro correto foi lançado, não apenas que algum erro foi lançado.

<details>
<summary>❌ Ruim — qualquer erro passa</summary>
<br>

```ts
test("throws on invalid order", async () => {
  await expect(createOrder({ customerId: "", total: -1 })).rejects.toThrow();
});
```

</details>

<br>

<details>
<summary>✅ Bom — tipo e mensagem verificados</summary>
<br>

```ts
test("throws ValidationError when total is negative", async () => {
  const invalidInput = { customerId: "cust-1", total: -1 };

  const actual = createOrder(invalidInput);

  await expect(actual).rejects.toThrow(ValidationError);
});
```

</details>
