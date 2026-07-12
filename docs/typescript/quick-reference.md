# Referência rápida

> Escopo: TypeScript. Resumo das convenções; os detalhes estão em `conventions/`.

## Nomenclatura

| Categoria             | Convenção                          | Exemplos                                              |
| --------------------- | ---------------------------------- | ----------------------------------------------------- |
| Interface             | PascalCase, sem prefixo `I`        | `User`, `OrderRepository`, `PaymentGateway`           |
| Type alias            | PascalCase                         | `OrderStatus`, `UserId`, `ApiResponse<T>`             |
| Genérico simples      | `T`                                | `function identity<T>(value: T): T`                   |
| Genérico com contexto | `TItem`, `TKey`, `TValue`          | `function map<TItem, TResult>(...)`                   |
| Enum (evitar)         | PascalCase + const object          | `ORDER_STATUS.active`; prefer union type              |

## type vs interface

| Cenário                           | Usar                           |
| --------------------------------- | ------------------------------ |
| Shape de objeto / contrato        | `interface`                    |
| Union type                        | `type`                         |
| Intersection de tipos             | `type`                         |
| Mapped type / conditional type    | `type`                         |
| Estender outra interface          | `interface ... extends`        |
| Alias de primitivo                | `type UserId = string`         |

## Utility types

| Utility          | Uso                                     | Exemplo                                  |
| ---------------- | --------------------------------------- | ---------------------------------------- |
| `Partial<T>`     | Todos os campos opcionais               | `Partial<User>` em updates parciais      |
| `Required<T>`    | Todos os campos obrigatórios            | `Required<Config>` após merge de padrões |
| `Pick<T, K>`     | Subconjunto de propriedades             | `Pick<User, 'id' \| 'email'>`            |
| `Omit<T, K>`     | Remover propriedades                    | `Omit<User, 'password'>` em DTOs         |
| `Record<K, V>`   | Mapa chave → valor tipado               | `Record<OrderStatus, string>`            |
| `Readonly<T>`    | Campos que não podem ser alterados      | `Readonly<Config>`                       |
| `ReturnType<T>`  | Tipo de retorno de uma função           | `ReturnType<typeof buildOrder>`          |
| `Parameters<T>`  | Tipos dos parâmetros de uma função      | `Parameters<typeof createUser>`          |
| `NonNullable<T>` | Remove `null` e `undefined` do tipo     | `NonNullable<string \| null>`            |

## O que evitar

| Evitar                             | Usar                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `any`                              | `unknown`: obriga a checar o tipo antes do uso                  |
| Prefixo `I` em interface           | PascalCase direto: `User`                                       |
| `as Type` para calar o compilador  | Uma checagem de verdade, ou repensar a função                   |
| Enum nativo                        | Objeto `as const` com o union type derivado dele                |
| `Object`, `String`, `Number`       | `object`, `string`, `number`: os primitivos, e não os wrappers  |
| `Function` como tipo               | A assinatura escrita: `(id: string) => Promise<User>`           |
| `!` (afirmação de não-nulo) solto  | Cláusula de proteção, ou uma checagem explícita                 |
