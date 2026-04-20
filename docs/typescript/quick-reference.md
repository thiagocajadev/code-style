# Quick Reference

> Escopo: TypeScript. Cheat-sheet das convenções; detalhes em `conventions/`.

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
| `Readonly<T>`    | Imutabilidade em compile time           | `Readonly<Config>`                       |
| `ReturnType<T>`  | Tipo de retorno de uma função           | `ReturnType<typeof buildOrder>`          |
| `Parameters<T>`  | Tipos dos parâmetros de uma função      | `Parameters<typeof createUser>`          |
| `NonNullable<T>` | Remove `null` e `undefined` do tipo     | `NonNullable<string \| null>`            |

## Taboos

| Evitar                             | Usar                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `any`                              | `unknown`: força narrowing antes do uso                         |
| Prefixo `I` em interface           | PascalCase direto: `User`, não `IUser`                          |
| `as Type` para silenciar o erro    | Narrowing real ou refatorar a função                            |
| Enum nativo                        | Const object + union type                                       |
| `Object`, `String`, `Number`       | `object`, `string`, `number`: tipos primitivos, não wrappers    |
| `Function` como tipo               | Assinatura explícita: `(id: string) => Promise<User>`           |
| `!` (non-null assertion) inline    | Guard clause ou narrowing explícito                             |
