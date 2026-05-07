# TypeScript

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/docs/)

TypeScript é o superconjunto tipado de JavaScript. Os princípios de legibilidade deste guia:
nomes expressivos, guard clauses, funções pequenas, fluxo linear. Aplicam-se aqui com a mesma
força.

Este guia cobre o que é específico do TypeScript: quando anotar tipos, como nomear contratos,
como modelar variações e como extrair o máximo do sistema de tipos sem adicionar ruído.

→ [Quick Reference](quick-reference.md) — nomenclatura, type vs interface, utility types, narrowing

## Setup

Configuração inicial de um projeto TypeScript: compilador, estrutura e ferramentas.

| Tópico                                            | Conceitos                                        |
| ------------------------------------------------- | ------------------------------------------------ |
| [Project Foundation](setup/project-foundation.md) | tsconfig, strict mode, path aliases, pipeline    |

## Fundamentos

| Tópico                                          | Conceitos                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| [Variables](conventions/variables.md)           | Annotations, inferência, `as const`, `unknown` vs `any`            |
| [Naming](conventions/naming.md)                 | Interface, type alias, genérico: convenções de nome               |
| [Functions](conventions/functions.md)           | Return types, parâmetros tipados, overloads                        |
| [Types](conventions/types.md)                   | `type` vs `interface`, genéricos, utility types                    |
| [Narrowing](conventions/narrowing.md)           | Type guards, discriminated unions, exhaustiveness                  |
| [Control Flow](conventions/control-flow.md)     | Narrowing como guard, discriminated unions, exhaustiveness check   |
| [Visual Density](conventions/visual-density.md) | Passos separados, `return` separado, anotações na mesma linha      |

## Avançados

| Tópico                                                        | Conceitos                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| [Error Handling](conventions/advanced/error-handling.md)     | Erros tipados, BaseError, try/catch nas fronteiras            |
| [Async](conventions/advanced/async.md)                       | `Promise<T>`, typed async/await, generics em I/O             |
| [Performance](conventions/advanced/performance.md)           | `as const`, enums vs const objects, satisfies, tipos recursivos |
| [Observability](conventions/advanced/observability.md)       | Logger tipado, contexto de correlação tipado, níveis          |
| [Testing](conventions/advanced/testing.md)                   | Fixtures com `satisfies`, mocks tipados, `expectTypeOf`       |
| [Validation](conventions/advanced/validation.md)             | `z.infer`, `safeParse`, discriminated unions, output DTO      |
| [Dates](conventions/advanced/dates.md)                       | Branded types para timestamps, Temporal API tipada            |
| [Quick Reference](quick-reference.md)                        | Tipos, utilitários, taboos                                    |

## Frameworks

| Framework | Conceitos |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| [React + Next.js](frameworks/react-nextjs.md) | RSC, RCC, Server Actions, API Routes, caching, guards, formulários com Zod |
| [Angular](frameworks/angular.md) | Standalone, Signals, Smart/Dumb, guards, resolvers, formulários tipados, interceptors |
| [Vue + Nuxt](frameworks/vue.md) | `<script setup>`, Composition API, Pinia, Route Middleware, Server Routes, defineCachedEventHandler |

## Princípios

**Tipos**: quando anotar, quando inferir

| Princípio                                                                           | Descrição                                                                   |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Inferência por padrão](conventions/variables.md#inferência-por-padrão)             | Deixe o TypeScript derivar o tipo quando óbvio; anotação redundante polui  |
| [Anotar fronteiras](conventions/functions.md#return-type)                           | Funções exportadas sempre têm return type explícito                         |
| [Nunca any](conventions/variables.md#any-vs-unknown)                                | `unknown` força narrowing; `any` desativa o compilador                     |
| [Tipos sem prefixo](conventions/naming.md#prefixo-i)                                | Sem `I` em interfaces; o contexto já diz que é contrato                   |

<br>

**Contratos**: types, interfaces e modelos de domínio

| Princípio                                                                    | Descrição                                                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Interface para objetos](conventions/types.md#type-vs-interface)             | Contratos e shapes usam `interface`: extensíveis por padrão                     |
| [Type para uniões](conventions/types.md#type-vs-interface)                   | `type` para union types, mapped types e aliases de primitivos                    |
| [Union types > enums](conventions/types.md#enums)                            | Const object + union type: sem runtime overhead, sem conversão                  |
| [Genérico com propósito](conventions/types.md#genéricos)                     | Genérico quando a função precisa preservar o tipo do chamador, sem especulação  |

<br>

**Narrowing**: transitar entre tipos com segurança

| Princípio                                                                         | Descrição                                                                  |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Type guards explícitos](conventions/narrowing.md#custom-type-guards)             | Funções predicado nomeadas no lugar de type assertions inline              |
| [Discriminated unions](conventions/narrowing.md#discriminated-unions)             | Campo literal identifica o variant: narrowing automático no switch        |
| [Exhaustiveness check](conventions/narrowing.md#exhaustiveness)                   | `never` no default do switch; o compilador avisa se faltar um caso        |
