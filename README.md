<div align="center">
  <img src="assets/code-style-logo.svg" alt="Code Style" width="640" style="border: 1px solid #30363d; border-radius: 8px;" />
</div>

<br />

<div align="center">

[![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-F7DF1E?logo=javascript&logoColor=black)](docs/javascript/README.md)
[![C#](https://img.shields.io/badge/C%23-.NET-512BD4?logo=dotnet&logoColor=white)](docs/csharp/README.md)
[![SQL](https://img.shields.io/badge/SQL-Server%20%26%20PostgreSQL-336791?logo=postgresql&logoColor=white)](docs/sql/README.md)
[![CSS](https://img.shields.io/badge/CSS-BEM%20%26%20Custom%20Properties-1572B6?logo=css3&logoColor=white)](docs/css/README.md)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](docs/shared/git.md)
[![EditorConfig](https://img.shields.io/badge/EditorConfig-enabled-E0EFEF?logo=editorconfig&logoColor=black)](docs/shared/editorconfig.md)

</div>

# Code Style

Olá Dev! Nesse projeto documento meu **code style** (estilo de código) e **setup** (configurações).
Demonstro convenções, padrões e boas práticas que sigo.

> [!NOTE]  
> Busco aprimoramento contínuo. Esse guia é um reflexo do que pratico hoje, não um conjunto fechado
> de regras. Podem existir princípios adicionais ou que se sobrepõem dependendo do contexto: tipo de
> projeto, cultura da empresa ou alinhamento com outros profissionais. O entendimento coletivo
> sempre prevalece.

Para ilustrar os conceitos, uso a metodologia **learn by example** (aprender pelo exemplo).

## Como eu leio e escrevo código.

Os fundamentos aqui são agnósticos de linguagem. Escolhi usar JavaScript como linguagem para
ilustrar os conceitos. Os mesmos princípios se aplicam a qualquer **stack** (combinação de
tecnologias).

> [!NOTE]  
> Ao trabalhar em equipe, a melhor abordagem sempre é a **convenção definida pela organização**.

## Princípios

Cada princípio pode ser aplicado em qualquer linguagem.

<details>
<summary>Ver todos os princípios</summary>

| Princípio                                                                                                           | Descrição                                                            |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [Escrita em inglês](docs/javascript/conventions/naming.md#nomes-em-português)                                       | Código universal, nomes curtos e sem ambiguidade                     |
| [Código narrativo](docs/javascript/conventions/functions.md#god-function--múltiplas-responsabilidades)              | O código conta a história, sem precisar de comentários               |
| [Ponto de entrada limpo](docs/javascript/conventions/functions.md#ponto-de-entrada-limpo)                           | Caller de uma linha — o quê, não o como                              |
| [Orquestrador no topo](docs/javascript/conventions/functions.md#god-function--múltiplas-responsabilidades)          | Chamada visível antes dos detalhes — top-down                        |
| [Detalhes abaixo](docs/javascript/conventions/functions.md#direct-return)                                           | Helpers ficam abaixo do orquestrador — step-down rule                |
| [Retorno antecipado](docs/javascript/conventions/control-flow.md#else-após-return)                                  | Guard clauses no topo, fluxo principal livre                         |
| [Fluxo linear](docs/javascript/conventions/control-flow.md#aninhamento-em-cascata--arrow-antipattern)               | Guard clauses sobre condicionais aninhadas                           |
| [Baixa densidade visual](docs/javascript/conventions/functions.md#baixa-densidade-visual)                           | Linhas relacionadas juntas, grupos separados por uma linha em branco |
| [Nomes expressivos](docs/javascript/conventions/naming.md#identificadores-sem-significado)                          | Variáveis e funções que dispensam explicação                         |
| [Código como documentação](docs/javascript/conventions/naming.md#código-como-documentação)                          | Nomes substituem comentários — comentários mentem                    |
| [Funções pequenas](docs/javascript/conventions/functions.md#sla--orquestrador-ou-implementação-nunca-os-dois)       | Uma responsabilidade, um nível de abstração                          |
| [Cálculo vs formatação](docs/javascript/conventions/functions.md#separar-cálculo-de-formatação)                     | Computar dados e formatar saída em funções separadas                 |
| [CQS](docs/javascript/conventions/variables.md#mutação-direta-de-objetos)                                           | Separar comando de consulta, sem efeitos colaterais ocultos          |
| [Dependências explícitas](docs/javascript/conventions/async.md#api-client-centralizado)                             | Injetar via parâmetros, evitar estado global                         |
| [Imutabilidade por padrão](docs/javascript/conventions/variables.md#let-desnecessário)                              | `const` primeiro, `let` só quando necessário                         |
| [Sem valores mágicos](docs/javascript/conventions/variables.md#evitar-valores-mágicos)                              | Constantes nomeadas no lugar de números e strings soltos             |
| [Falhar rápido](docs/javascript/conventions/error-handling.md#múltiplos-tipos-de-retorno)                           | Validar cedo, interromper fluxo inválido                             |
| [Contratos consistentes](docs/javascript/conventions/error-handling.md#baseerror--abstração-centralizada)           | Respostas padronizadas, sempre o mesmo formato                       |
| [Retorno explícito](docs/javascript/conventions/error-handling.md#exceção-como-controle-de-fluxo)                   | Evitar exceções como controle de fluxo                               |
| [Tratamento centralizado de erros](docs/javascript/conventions/error-handling.md#baseerror--abstração-centralizada) | Classes de erro tipadas, try/catch nas fronteiras                    |
| [I/O assíncrono](docs/javascript/conventions/async.md#callback-hell)                                                | `async/await`, sem bloqueio                                          |
| [Sem lógica no retorno](docs/javascript/conventions/functions.md#sem-lógica-no-retorno)                             | Variável expressiva antes do `return`, simétrica à entrada           |
| [Estilo vertical](docs/javascript/conventions/functions.md#estilo-vertical--parâmetros)                             | Até 3 parâmetros por linha — 4+ usa objeto                           |
| [Testes estruturados](docs/javascript/conventions/testing.md#fases-misturadas--aaa)                                 | AAA — fases explícitas; assert limpo — sem expressões inline         |

</details>

## Seções

### Linguagens

| Linguagem                               | Descrição                                                        |
| --------------------------------------- | ---------------------------------------------------------------- |
| [JavaScript](docs/javascript/README.md) | Fundamentos ilustrados com JS — variáveis, funções, fluxo, async |
| [SQL](docs/sql/README.md)               | Formatação e nomenclatura para SQL Server e PostgreSQL           |
| [C#](docs/csharp/README.md)             | Convenções C#/.NET — records, Result\<T\>, async, LINQ           |
| [CSS](docs/css/README.md)               | BEM, custom properties, mobile-first, Tailwind, Bootstrap        |

### Shared

| Tópico                                      | Descrição                                           |
| ------------------------------------------- | --------------------------------------------------- |
| [EditorConfig](docs/shared/editorconfig.md)       | Configuração base de editor                         |
| [Git](docs/shared/git.md)                         | Branches, commits, pipeline e estratégia de entrega |
| [Observability](docs/shared/observability.md)     | Logging estruturado, níveis, PII, correlation ID    |

### Referências

**Princípios**  
Clean Code — Robert C. Martin _(livro)_  
The Clean Coder — Robert C. Martin _(livro)_  
[Command Query Separation — Martin Fowler](https://martinfowler.com/bliki/CommandQuerySeparation.html)  
[The Twelve-Factor App](https://12factor.net/)  
[Refactoring Guru](https://refactoring.guru/)

**Git**  
[Conventional Commits](https://www.conventionalcommits.org/)  
[Trunk-Based Development](https://trunkbaseddevelopment.com/)

**JavaScript**  
[Airbnb JavaScript Code Style](https://github.com/airbnb/javascript?tab=readme-ov-file)  
[Mozilla JavaScript Code Style](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/JavaScript)

**C#**  
[Google C# Code Style](https://google.github.io/styleguide/csharp-style.html)  
[Microsoft C# Code Style](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)

**SQL**  
[Guia de estilos SQL](https://www.sqlstyle.guide/)  
[Guia de referência SQL](https://brainstation.io/learn/sql/reference)

**CSS**  
[MDN CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference)  
[BEM Methodology](https://getbem.com/)  
[Tailwind CSS Docs](https://tailwindcss.com/docs)  
[Bootstrap Docs](https://getbootstrap.com/docs/)

**Dates**  
[Temporal API — TC39](https://tc39.es/proposal-temporal/docs/)  
[date-fns](https://date-fns.org/)  
[Luxon](https://moment.github.io/luxon/)

**Observability**  
[Pino](https://getpino.io/)  
[Serilog](https://serilog.net/)  
[Sentry](https://docs.sentry.io/)  
[New Relic](https://docs.newrelic.com/)
