# TypeScript

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/docs/)

TypeScript é o JavaScript com um sistema de tipos por cima. Todo o resto do guia continua valendo
aqui: nomes que dizem a intenção, cláusulas de proteção no início da função, funções pequenas,
fluxo que se lê de cima para baixo.

O que estas páginas cobrem é o que só existe em TypeScript. Quando escrever o tipo e quando deixar o
compilador inferir. Como nomear um contrato. Como modelar um valor que tem formas diferentes. E como
usar o sistema de tipos para o compilador acusar o erro antes de ele chegar no usuário, sem encher o
código de anotação que não informa nada.

→ [Referência rápida](quick-reference.md): nomes, `type` e `interface`, tipos utilitários, estreitamento de tipo

## Setup

Configuração inicial de um projeto TypeScript: compilador, estrutura e ferramentas.

| Tópico                                            | Conceitos                                        |
| ------------------------------------------------- | ------------------------------------------------ |
| [Fundação do projeto](setup/project-foundation.md) | tsconfig, modo estrito, apelidos de caminho, pipeline |

## Fundamentos

| Tópico                                          | Conceitos                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| [Variáveis](conventions/variables.md)           | Anotação, inferência, `as const`, `unknown` no lugar de `any`      |
| [Nomes](conventions/naming.md)                  | Interface, apelido de tipo e genérico: como nomear cada um         |
| [Funções](conventions/functions.md)             | Tipo de retorno, parâmetros tipados, sobrecargas                   |
| [Tipos](conventions/types.md)                   | `type` e `interface`, genéricos, tipos utilitários                 |
| [Estreitamento de tipo](conventions/narrowing.md) | Checagens que estreitam, uniões discriminadas, exaustividade     |
| [Controle de fluxo](conventions/control-flow.md) | A checagem que estreita o tipo, o `switch` exaustivo              |
| [Densidade visual](conventions/visual-density.md) | Passos separados, `return` junto do valor, anotação na mesma linha |

## Avançados

| Tópico                                                        | Conceitos                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| [Tratamento de erros](conventions/advanced/error-handling.md) | Erros com tipo, classe base, `try/catch` nos limites          |
| [Código assíncrono](conventions/advanced/async.md)           | `Promise<T>`, `async`/`await` tipado, genérico no cliente de I/O |
| [Performance](conventions/advanced/performance.md)           | `as const` no lugar do enum, `satisfies`, tipos recursivos    |
| [Observabilidade](conventions/advanced/observability.md)     | Logger tipado, contexto de correlação, níveis de log          |
| [Testes](conventions/advanced/testing.md)                    | Massa de teste com `satisfies`, mocks tipados, `expectTypeOf` |
| [Validação](conventions/advanced/validation.md)              | `z.infer`, `safeParse`, união discriminada, DTO de resposta   |
| [Datas](conventions/advanced/dates.md)                       | Tipo marcado para timestamps, a API Temporal tipada           |
| [Modelagem de entidades](conventions/advanced/entity-modeling.md) | Tipo marcado, lista somente leitura, união discriminada, `Entity<TId>`, fábrica |
| [Referência rápida](quick-reference.md)                      | Tipos, utilitários, o que evitar                              |

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
| [Inferência por padrão](conventions/variables.md#inference-by-default)             | Deixe o compilador derivar o tipo óbvio; a anotação repetida só ocupa espaço |
| [Anotar os limites](conventions/functions.md#return-type)                           | Toda função exportada declara o tipo que devolve                            |
| [Nunca any](conventions/variables.md#any-vs-unknown)                                | `unknown` obriga a checar antes de usar; `any` desliga o compilador         |
| [Tipos sem prefixo](conventions/naming.md#i-prefix)                                | Sem `I` em interface: a palavra `interface` já está ali                     |

<br>

**Contratos**: types, interfaces e modelos de domínio

| Princípio                                                                    | Descrição                                                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Interface para objetos](conventions/types.md#type-vs-interface)             | O contrato e a forma de um objeto usam `interface`, que aceita `extends`         |
| [Type para uniões](conventions/types.md#type-vs-interface)                   | `type` para união, interseção e apelido de primitivo                             |
| [União no lugar do enum](conventions/types.md#discriminated-unions)          | Objeto `as const` com o union derivado: não sobra código no arquivo final        |
| [Genérico com propósito](conventions/types.md#generics)                     | Genérico quando o retorno depende do tipo que entrou                             |

<br>

**Estreitamento de tipo**: chegar ao tipo específico com segurança

| Princípio                                                                         | Descrição                                                                  |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [Função predicado com nome](conventions/narrowing.md#custom-type-guards)          | Uma função `value is T` no lugar do `as` escrito no meio do código          |
| [União discriminada](conventions/narrowing.md#discriminated-unions)               | O campo literal diz qual é o formato, e o `switch` estreita o tipo sozinho  |
| [Verificação de exaustividade](conventions/narrowing.md#exhaustiveness)           | `never` no `default`: o compilador acusa o caso que ninguém tratou          |
