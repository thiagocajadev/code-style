# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.0] - 2026-07-13

### Changed

- **`docs/html/` e `docs/css/` reescritos na voz sênior-para-leigo (Épico C8, Ciclo C).** 24 arquivos `.md` e 6 scripts, 3.553 linhas, entregues como unidade única. É o épico mais leve do ciclo (o TypeScript teve 7.589 linhas, o VB.NET 8.377), e chegou com duas superfícies prontas: `## Conceitos fundamentais` já existia nos 20 arquivos técnicos, e nenhum link com âncora entra em `html/` ou `css/` vindo de fora. Contraste binário, metáfora de mecânica, fecho de efeito e advérbio banido zerados nas duas pastas.
- **Os 24 H1 viraram pt-BR**: `Naming` → "Nomes em HTML", `Structure` → "Estrutura do documento HTML", `Null Safety` → "Valor ausente em CSS", `Responsive` → "Layout responsivo em CSS", `Project Foundation: HTML` → "Base de um projeto HTML", `Quick reference` → "Referência rápida". Os preservados são nome de produto (HTML, CSS, jQuery, Bootstrap, Tailwind).
- **Os 138 `<summary>` de Bom/Ruim foram varridos**, que é o escopo novo do Ciclo C. Saíram `utility sprawl`, `override via custom properties`, `delegation no container`, `hero sem lazy (above the fold)`, `chain, uma seleção`, `keywords semânticos no lugar de valores sentinela` e `magic numbers espalhados`, entre outros. Todos viraram descrição em pt-BR na voz de `docs/javascript/`.
- **Os dois `conventions/visual-density.md` espelharam o canônico JavaScript.** Os headings ganharam a redação de `docs/javascript/conventions/visual-density.md` ("Não deixe uma linha sozinha entre espaços", "Não alinhe o código em colunas", "Depois de um bloco de várias linhas, deixe um respiro"), e o jargão cunhado saiu das tabelas de Conceitos (`tight siblings`, `orphan element`, `landmark phase`, `sibling block`, `scannability`, `declaration group`), virando descrição no corpo. A tabela do HTML caiu de 8 para 6 linhas, e a do CSS de 7 para 6.
- **13 âncoras que resolviam por slug gerado do texto viraram id ASCII explícito**, com os referrers dos dois README reescritos no mesmo passo. Em HTML: `#ids-and-classes`, `#data-attributes`, `#heading-hierarchy`, `#lang-and-charset`, `#images`, `#label`, `#defer-and-async`, `#lazy-loading`, `#title-and-description`. Em CSS: `#bem`, `#specificity`, `#property-order`, `#mobile-first`.
- **O `README.md` do root passou pelo gate de escrita.** O `audit:prose` já passava limpo nele, e o gate manual achou o resto: 3 caudas de contraste binário ("o retorno nomeia o resultado, não o computa", a mesma que o README do VB.NET perdeu no C6; "o quê, não o como"; "um reflexo do que pratico hoje, não um conjunto fechado de regras"), 1 metáfora com agência ("porque comentários mentem"), a tradução canônica violada em "Imutabilidade por padrão" (virou "`const` como padrão", com a descrição do comportamento) e os headings em Title Case ("Conceitos Compartilhados", "Controle de Qualidade").
- **A glosa de `breakpoint` deixou de ser "ponto de quebra" e virou "largura de corte"**, em `docs/css/conventions/responsive.md` e `docs/css/bootstrap.md`. A tradução nova descreve o comportamento em vez de nomear o jargão, que é o que a diretriz do projeto já pedia. Ela também tira do caminho um falso positivo da regra `[drama]` do `audit:prose`, que acusava a expressão "de quebra".

### Fixed

- **Os 16 em dash de `docs/html/` moravam dentro de fenced block e de script `.html`, e nenhum era comentário.** Eram conteúdo de exemplo, quase todos em `<title>Products — Acme Store</title>`, mais duas linhas de frete em `scripts/forms.html` e duas frases de prosa em `scripts/structure.html`. Todos viraram dois pontos ou vírgula. **É a divergência intencional de bloco desta release** (autorizada pelo Thiago), e alcança 3 dos 24 arquivos `.md`: `conventions/advanced/seo.md` (6), `conventions/visual-density.md` (2) e `setup/project-foundation.md` (1). Os outros 21 batem por SHA-256 com o HEAD; os 7 em dash restantes estavam nos scripts, que o gate de hash não cobre.
- **2 `<summary>` de `docs/html/conventions/advanced/seo.md` e 1 de `docs/css/conventions/naming.md` carregavam a expansão de sigla dentro do título do exemplo**, o que é bug de formatação. `❌ Ruim: hierarquia implícita, acoplada ao **HTML** (HyperText Markup Language · Linguagem de Marcação de Hipertexto)` virou prosa curta.

### Added

- **`html` e `css` entraram em `LANGS` de `.github/workflows/docs.yml`**, e as duas linguagens passam a ser publicadas no site. A lista agora é `javascript csharp sql shared typescript html css`. `vbnet` segue fora por decisão do Thiago, mesmo tendo sido entregue em v2.4.0.

## [2.5.1] - 2026-07-13

Correções em linguagens fora do escopo do épico C8, achadas ao fechar os buracos de gate que o épico expôs. O `audit:prose` passou a ler o interior dos fenced blocks e os arquivos de `docs/*/scripts/**`, e a primeira varredura com o escopo novo acusou o que nenhum gate lia.

### Fixed

- **26 em dash em 9 scripts, que nenhum gate automático alcançava.** O `audit:prose` só lia `.md`, então `docs/*/scripts/**` nunca foi auditado. A varredura repo-wide achou 12 em `docs/java/` (`control-flow.java`, `variables.java`, `test/testing.junit.java`), 8 em `docs/nosql/` (`mongodb/03-update.js`, `mongodb/04-delete.js`, `redis/03-sets.js`) e **6 em `docs/csharp/` (`test/testing.mstest.cs`, `test/testing.nunit.cs`, `test/testing.xunit.cs`), que é regressão em linguagem já revisada no Ciclo B**. Quase todos moravam em banner de seção, separando título e subtítulo; viraram dois pontos ou vírgula. Os 58 scripts do repositório estão limpos.
- **"Imutabilidade estrutural" no banner de `docs/java/scripts/variables.java`** virou "o valor não muda depois de atribuído", que é a tradução canônica do projeto: descrever o comportamento em vez de nomear o jargão.
- **6 `<summary>` carregavam a glosa do termo dentro do título do exemplo**, o que é bug de formatação, e não de voz. O título de um exemplo é prosa curta, e a expansão de sigla pertence ao corpo. Um deles ainda arrastava um "2" solto no fim. Corrigidos em `docs/python/` ×2 (`conventions/advanced/testing.md`, `setup/project-foundation.md`), **`docs/vbnet/` ×3, também já revisada** (`conventions/advanced/dates.md`, `conventions/advanced/observability.md`, `setup/legacy-desktop.md`) e `docs/nosql/sgbd/redis.md`.
- **2 caudas de contraste binário que moravam em `docs/javascript/conventions/functions.md` desde sempre**: "Quem chama a função diz o **quê**, não o **como**" e "O retorno dá nome ao resultado, não o calcula". São a origem das frases que o `README.md` do root repetia. Reescritas para enunciar direto o que acontece.

### Changed

- **6 headings de `docs/javascript/` ganharam id ASCII explícito**, porque o `README.md` do root os referenciava por slug gerado do texto, contra a diretriz de âncora do projeto: `#clean-entry-point` e `#low-visual-density` (`conventions/functions.md`), `#if-and-else` e `#nested-conditionals` (`conventions/control-flow.md`), `#meaningless-identifiers` (`conventions/naming.md`) e `#mixed-phases-aaa` (`conventions/advanced/testing.md`). Só prosa: nenhum fenced block de `docs/javascript/` foi tocado.

## [2.5.0] - 2026-07-12

### Changed

- **`docs/typescript/` reescrito na voz sênior-para-leigo (Épico C7, Ciclo C).** 22 arquivos `.md` e 8 scripts `.ts`, 7.589 linhas, entregues como unidade única. 20 dos 22 H1 viraram pt-BR (`Naming` → "Nomes em TypeScript", `Narrowing` → "Estreitamento de tipo em TypeScript", `Quick Reference` → "Referência rápida", com `Taboos` → "O que evitar"). Os 3 preservados são nome de produto (React + Next.js, Vue + Nuxt, Angular). Contraste binário, metáfora de mecânica, fecho de efeito e advérbio banido zerados na pasta.
- **Os `<summary>` de Bom/Ruim entraram no escopo, e eram o alvo mais pesado do ciclo até aqui**: 247 títulos de exemplo. Saíram `type assertion no lugar de narrowing`, `narrowing não reutilizável`, `satisfies valida sem alargar`, `const object + union type: sem overhead runtime`, `pipeline colapsado`, `status hardcoded` e `type guard valida o contrato na fronteira`. Todos viraram descrição em pt-BR na voz de `docs/javascript/`.
- **Os termos nativos do TypeScript ficaram em inglês, com glosa na primeira ocorrência** (decisão do Thiago): `narrowing`, `type guard`, `satisfies` e `discriminated union` são vocabulário real da comunidade, e um deles dá nome a um arquivo do guia. O que saiu foi o fragmento telegráfico e o jargão cunhado pelo projeto.
- **`conventions/visual-density.md` espelhou o canônico JavaScript.** Os 15 headings ganharam a redação de `docs/javascript/conventions/visual-density.md` (`Explaining Return: par tight` → "O `return` fica junto da linha que nomeia o valor"; `Órfão de 1 linha` → "Não deixe uma linha sozinha entre espaços"; `Fragmentos → montagem` → "Prepare as partes, depois monte o resultado"), e a **tabela de Conceitos caiu de 14 para 8 linhas**: o jargão cunhado (`tight pair`, `atomic trio`, `semantic pair`, `single-line orphan`, `explaining return`, `fragments → assembly`) saiu da tabela e virou descrição pt-BR no corpo. As 2 linhas específicas do TypeScript (anotação de tipo, genérico) ficaram, porque carregam regra de densidade própria da linguagem.
- **9 âncoras que resolviam por slug gerado do texto viraram id ASCII explícito**, com os referrers reescritos no mesmo passo: `#i-prefix` (era `#prefixo-i`, o único pt-BR), `#any-vs-unknown`, `#return-type`, `#type-vs-interface`, `#discriminated-unions`, `#custom-type-guards`, `#exhaustiveness`. Nenhum link com âncora entra em `docs/typescript/` vindo de fora, então toda a sincronia coube no próprio README.
- **`conventions/advanced/entity-modeling.md` recebeu edição cirúrgica**, como em C# e SQL: o arquivo já estava na voz certa, e saíram 2 dramas (`receita certa de bug`, `carregar o universo`) e 3 caudas de contraste binário.

### Fixed

- **A página de nomes afirmava que o apelido de tipo protegia contra a troca de argumentos, e ele não protege.** `type UserId = string` e `type ProductId = string` são a mesma `string` para o compilador, que aceita um no lugar do outro sem reclamar. A prosa agora diz o que o apelido faz (deixa a assinatura legível: `createOrder(userId: UserId, productId: ProductId)` mostra qual valor vai em qual posição) e explicita o que ele não faz.
- **4 em dash em comentário dos scripts `.ts`**, em `scripts/test/testing.jest.ts` e `scripts/test/testing.vitest.ts`. Nenhum gate automático lê `.ts` (o `audit:prose` só olha `.md`), então o buraco é o mesmo que o épico do VB.NET expôs, e nos mesmos arquivos. Viraram dois pontos e vírgula.
- **"Imutabilidade por padrão" em `scripts/variables.ts`** virou "valor não muda depois de atribuído", que é a tradução canônica do projeto: descrever o comportamento em vez de nomear o jargão.
- **"Fronteira" sobrevivia em 3 comentários dentro de fenced blocks**, contrariando a tradução canônica do projeto (mesma classe do `_repo`). Corrigidas para "limite" em `conventions/advanced/null-safety.md` e na árvore de diretórios de `frameworks/react-nextjs.md`. **É a única divergência de bloco desta release**, e alcança 2 dos 22 arquivos; os outros 20 batem por SHA-256 com o HEAD.

### Added

- **`conventions/variables.md` ganhou a seção "O que é inferência de tipo"** (a pedido do Thiago). O arquivo mandava deixar o compilador inferir sem nunca explicar o que inferência é. A seção nova abre pelo mecanismo (`const userName = "Alice"`: ninguém disse que é `string`, o compilador leu o valor e concluiu), mostra que isso vale para retorno de função e item de array, e fecha pelo limite da inferência: array vazio, variável sem valor e resposta de rede não têm de onde inferir, e ali a anotação é a única fonte de informação.
- **`typescript` entrou em `LANGS` de `.github/workflows/docs.yml`**, e a linguagem passa a ser publicada no site. `vbnet` segue fora por decisão do Thiago, mesmo tendo sido entregue em v2.4.0: o comentário do workflow avisa que o escopo é reduzido porque o build não cabia no runner free, e uma linguagem por vez é o salto seguro.

## [2.4.1] - 2026-07-12

### Fixed

- **O jargão cru sobreviveu nos `<summary>` dos exemplos, que as revisões de voz anteriores nunca tocaram.** A prosa dos arquivos tinha sido reescrita, os títulos dos blocos Bom/Ruim não, então `par tight`, `blank fragmenta o par`, `Explaining Return tight`, `4 atomics viram 2+2`, `statements colados` e `muralha de quatro` continuavam na primeira linha que o leitor lê. Todos viraram descrição em pt-BR na voz de `docs/javascript/`, que é a referência: "a `var` e o `return` juntos", "a linha em branco parte a dupla no meio", "quatro constantes viram dois grupos de duas", "parede com quatro ALTERs seguidos". Alcança `csharp/conventions/visual-density.md` (28 títulos), `sql/conventions/visual-density.md` (8) e `csharp/conventions/{types,methods}.md`.
- **"Colado" tinha sentido bom e ruim ao mesmo tempo**, ora descrevendo o par que deve ficar unido, ora o bloco que deveria respirar. A palavra virou "junto" nas quatro páginas de densidade visual (`shared`, `csharp`, `sql` e `csharp/conventions/methods.md`), e nos títulos Ruim quem carrega o problema é o complemento: "dois comandos juntos, sem nada marcando onde o primeiro termina". "Muralha" virou "parede" em `shared/standards/visual-density.md`, alinhando com o SQL.
- **`discountPct` era abreviatura em bloco Good, a mesma classe de erro do `_repo`.** Renomeado para `discountPercentage` nas 8 linguagens onde aparecia, `.md` e scripts de teste.
- **Em `csharp/conventions/types.md`, a metáfora da "caverna de herança diamante"** virou a descrição do que acontece de fato: quem implementa duas interfaces com o mesmo método herda duas versões concorrentes dele. Junto dela saíram `template method` sem tradução, o comentário `// narrowed para Order não-nulo`, que não explicava nada, e `capability`, `discriminated result` e `constraint` nos títulos dos exemplos.
- **`record immutable` virou "registro somente leitura"** em `csharp/conventions/variables.md`.
- **A tabela SQL Server contra PostgreSQL estava dentro do bloco de citação** em `sql/conventions/naming.md`, e a formatação a apagava ao ser publicada em outro projeto. Saiu do `>` e virou tabela normal.
- **O primeiro par Bom/Ruim de `sql/conventions/formatting.md` não tinha explicação nenhuma**, só `❌ Ruim` e `✅ Bom`. Os dois ganharam título descritivo e um parágrafo dizendo o que muda. O heading "Cada cláusula começa a própria linha" ganhou a preposição que faltava.
- **O `VALUES` de `sql/conventions/advanced/batch.md` tinha 2 espaços de indentação a mais** que a forma canônica de `crud.md` e de `sgbd/`. Alinhado.

### Added

- **UUID v4 e v7 lado a lado nos exemplos**, em `javascript/conventions/advanced/performance.md` e `csharp/conventions/advanced/performance.md`. Cada bloco mostra um identificador de verdade com uma seta apontando o primeiro caractere do terceiro grupo, que é onde a versão fica escrita: `4` no v4, `7` no v7. Um parágrafo antes explica que dá para saber a versão só de olhar o valor.
- **`actual` e `expected` na tabela de Conceitos fundamentais de testes** (`shared/standards/testing.md`, `javascript/conventions/advanced/testing.md`, `csharp/conventions/advanced/testing.md`): `actual` é o valor atual, o que o código devolveu de fato; `expected` é o valor esperado, o que você escreve à mão como referência.
- **`quantity: 2` no `order` de `javascript/conventions/advanced/testing.md`**, para as contas do exemplo fecharem: 2 × 50 é o total de 100 que já estava lá.

## [2.4.0] - 2026-07-12

### Changed

- **`docs/vbnet/` reescrito na voz sênior-para-leigo (épico C6 do Ciclo C).** Os 25 arquivos `.md` e os 7 scripts `.vb` da linguagem, entregues como uma unidade. H1 em pt-BR em todos, menos os três que são nome próprio (`README`, `Dapper`, `ADO.NET`), pelo mesmo critério que preservou `# PostgreSQL` no ciclo do SQL. Heading de jargão virou frase descritiva com id ASCII explícito, e as violações do `audit:prose` (drama, metáfora de mecânica, contraste binário, em dash, advérbio banido) foram zeradas.
- **`conventions/visual-density.md` espelhou o canônico do JavaScript**, como o C# já tinha feito: os 16 headings ganharam a mesma redação, e a tabela de Conceitos caiu de 12 para 6 linhas. O jargão cunhado (`tight pair`, `atomic trio`, `semantic pair`, `single-line orphan`, `explaining return`, `fragments → assembly`) saiu da tabela e virou descrição em português no corpo.
- **`conventions/advanced/entity-modeling.md` recebeu edição cirúrgica**, mesmo tratamento do C# e do SQL, porque a voz já estava próxima da certa e os headings precisavam bater com os das outras linguagens. Saíram 2 dramas, 5 caudas de contraste binário que o linter não pega (uma delas em célula de tabela) e 3 ocorrências de "fronteira", que a diretriz manda escrever como "limite".
- **Cada armadilha ganhou o mecanismo no lugar da afirmação.** O deadlock explicado pelas duas pontas do impasse (a thread parada esperando a `Task`, a `Task` esperando aquela thread). O `Select` com side effect explicado pela execução adiada: o e-mail não sai se ninguém percorrer o resultado, e sai duas vezes se dois percorrerem. O `DateTime.SpecifyKind` explicado pelas três horas que o valor passa a mentir sobre si mesmo. A captive dependency explicada pelo sintoma, o dado de um usuário aparecendo na sessão de outro.
- **Convenção `SP_` executada em `setup/ado-net.md` e `setup/dapper.md`.** As procedures de exemplo eram blocos Good que contrariavam a convenção `SP_VERBO_TABELA` já adotada em `docs/sql/` e em `csharp/setup/dapper.md`. `FindPurchasesByCustomer` virou `SP_LIST_PURCHASES_BY_CUSTOMER_ID` (verbo `LIST`, porque devolve coleção filtrada), `CreatePurchase` virou `SP_ADD_PURCHASE`, e os dois `Get` viraram `SP_GET_PURCHASE_DASHBOARD` e `SP_GET_PURCHASE_REPORT`, com os comentários `-- EXEC` e os nomes de arquivo `.sql` acompanhando. Os métodos VB.NET seguem em PascalCase (`FindByCustomerAsync`), porque seguem a convenção da linguagem, e os dois arquivos ganharam o parágrafo que explica essa separação.
- **4 âncoras do `README.md` resolvidas.** `#trycatch-vs-on-error-goto` e `#async-function-vs-async-sub` já eram ASCII e viraram id declarado. `#await-nunca-result-ou-wait` e `#linq-puro-sem-side-effects` eram geradas do texto em português e viraram `#no-blocking-await` e `#pure-linq`, com o referrer reescrito no mesmo passo. Os rótulos das tabelas do README passaram a casar com os H1 novos.

### Fixed

- **Em dash em comentário de script, que nenhum gate automático cobria.** O `audit:prose` só lê `.md` e o `audit:docs` só lê fenced block, então os 7 scripts `.vb` de `docs/vbnet/scripts/` nunca tinham sido varridos. Quatro em dash em `test/testing.nunit.vb` e `test/testing.mstest.vb` viraram dois pontos e vírgula. A diretriz proíbe em dash em qualquer superfície, inclusive comentário de código.
- **Em `scripts/variables.vb`, "imutabilidade por padrão" virou "valor não muda depois de atribuído"**, que é a tradução canônica do projeto: descrever o comportamento em vez de nomear o jargão.
- **Em dash em `conventions/advanced/testing.md`**, que passou despercebido porque o `audit:prose` só audita arquivo alterado contra o HEAD, e a página ainda não tinha sido tocada.

## [2.3.3] - 2026-07-12

### Fixed

- **12 exemplos em que o blank line separava uma declaração da única linha que a consumia.** O caso que abriu a investigação, em `csharp/frameworks/blazor.md`: `var editRoute = $"/orders/{OrderId}/edit";` seguido de blank e de `navigation.NavigateTo(editRoute);`. O método tem uma fase só, navegar, e a declaração apenas monta o argumento dela; o blank anunciava uma divisão que não existe. Corrigido em `csharp/frameworks/blazor.md` (3 casos), `javascript/conventions/advanced/null-safety.md`, `javascript/frameworks/bot/{discord,telegram,whatsapp}.md` (4), `nosql/sgbd/redis.md`, `php/conventions/advanced/error-handling.md` e `swift/conventions/variables.md`.
- **Nos três bots, o blank subiu em vez de sumir.** A linha de embalagem estava colada no grupo que faz trabalho (`const replyPayload = { embeds: [embed] };` logo abaixo de `fetchOrder` e `buildOrderEmbed`). O blank passou para antes dela, e o exemplo passou a ler como duas fases: preparar os dados, enviar.

### Changed

- **`density-lonely-chain` deixou de discriminar por "o consumidor atribui ou não".** A regra isentava toda chamada de side-effect, e com isso perdia o par que só existe para alimentar a chamada. O critério novo é a natureza da declaração: se o lado direito chama ou aguarda algo, ela é uma fase do fluxo e o blank fica (`const input = schema.parse(sanitized);` antes de `await createUser(input);` segue isento); se ela só monta um valor, é preparação do argumento e o par vira tight.
- **Exceção nova para a cadeia de cálculo.** `temperature = 27 - (voltage - 0.706) / 0.001721`, em `python/conventions/advanced/micropython.md`, fecha uma conta que começou em `raw = adc.read_u16()`. Aritmética que consome a variável declarada na linha imediatamente acima é continuação do cálculo, não embalagem de argumento, e mantém o blank antes do `print`.
- **Dois bugs de cobertura que a regra nova revelou.** `TEST_BLOCK_PATTERN` não reconhecia teste em PHP, porque `assertSame` não casava com `\bassert[.!(_ ]`, e um bloco AAA de `php/conventions/visual-density.md` era acusado indevidamente. E `isCallStatement` lia a definição `def summarize(state: OrderState)` como chamada, acusando um type alias em `python/conventions/advanced/entity-modeling.md`. Seis casos novos em `audit-docs.test.mjs` (44, antes 38).

## [2.3.2] - 2026-07-12

### Fixed

- **`_repo` nos exemplos de `docs/csharp/`, que contradiziam a regra ensinada pelo próprio `quick-reference.md`.** A linha `| Abreviações em campo | \`_svc\`, \`_mgr\`, \`_ctrl\`, \`_repo\` | \`_service\`, \`_repository\` |` já reprovava a abreviação, e 31 blocos de exemplo usavam ela mesmo assim. O prefixo `_` está correto, é a convenção .NET para campo privado; o que viola o code-style é abreviar o nome. Corrigido em `conventions/naming.md`, `conventions/advanced/async.md`, `conventions/advanced/error-handling.md`, `conventions/advanced/null-safety.md` e `conventions/advanced/performance.md`. Em `null-safety.md`, o parâmetro `repo` do construtor virou `repository`, junto com o `nameof`.
- A linha da regra em `quick-reference.md` ficou intacta: ali `_repo` é o exemplo do que evitar.
- **Por que escapou do Ciclo B**: os épicos de reescrita de prosa congelam os fenced blocks e conferem o hash SHA-256 contra o HEAD, então nenhuma varredura de voz olhava para dentro do código. O desvio apareceu quando o épico do VB.NET encontrou o mesmo `_repo` em `vbnet/conventions/naming.md`. O bloco Bad de `csharp/setup/security.md` mantém `repo` e `ctx` de propósito, porque exemplo Bad concentra anti-pattern; o Good correspondente já usa `orderRepository`.

## [2.3.1] - 2026-07-12

### Fixed

- **As 25 metáforas que as regras novas do `audit:prose` passaram a acusar em páginas já revisadas.** As regras `drama-charging` e `drama-swallowing` nasceram no fim do épico de SQL (v2.3.0), então v2.0.0 (`javascript`), v2.1.0 (`shared`) e v2.2.0 (`csharp`) fecharam sem que o gate olhasse para elas. Escopo desta correção: `javascript/`, `csharp/`, `shared/` e `sql/`, que são as pastas já revisadas; as demais 15 linguagens ficam para quando o épico chegar nelas. São 21 linhas de prosa em 16 arquivos, e nenhum fenced block foi tocado (conferido por SHA-256 contra o HEAD).
- **O compilador do C# deixou de "cobrar o tratamento" e passou a fazer o que faz.** Em `null-safety.md` e `types.md`, ele avisa no ponto onde um valor que pode ser nulo é usado sem verificação; em `control-flow.md`, exige o caso `_` do `switch` expression; em `types.md`, acusa a variante que ficou sem tratamento. Em `testing.md`, `Assert.ThrowsAsync<NotFoundException>` só passa quando a exceção lançada é do tipo declarado.
- **O heading `## try/catch que engole o erro` de `javascript/conventions/advanced/error-handling.md` virou "## try/catch que captura o erro e não avisa ninguém"**, com id ASCII explícito (`catch-that-hides-the-error`). Nenhum link apontava para a âncora antiga.
- **Outras reescritas**: "o Slack cobra pontualidade do seu bot" virou o prazo de resposta que ele impõe; "as três decisões se pagam ou se cobram por anos" virou o tempo que o time convive com elas; "o Context cobra um preço" virou a dependência que não aparece na assinatura; "o cache passa a cobrar quase tudo o que economiza" virou o gasto que ele faz; "a camada extra cobra manutenção e não devolve nada" virou o componente a mais para manter, monitorar e atualizar.

### Changed

- **`audit-prose.mjs`: a isenção de cobrança monetária deixou de ser uma frase rígida.** `MONETARY_CHARGE` cobria só a forma `cobra por <unidade>`, e reprovava prosa correta. Agora cobre cada forma em que o dinheiro aparece de fato nas docs: o preço comparado ("o serviço gerenciado cobra mais caro por hora"), as duas linhas da fatura ("as APIs cobram entrada e saída"), quem paga ("sem cobrar o cliente duas vezes") e o verbo citado como ação de domínio (`A compensação de "cobrar" é "reembolsar"`). Três linhas de `shared/` que o gate acusava eram cobrança literal e ficaram como estavam.
- **Isenção nova para a glosa do jargão em inglês.** A linha `| **swallow** (engolir) | Capturar erro sem tratar nem propagar |` da tabela de Conceitos traduz o termo que o leitor vai encontrar na literatura, e sobrevive ao gate. A prosa que usa o verbo continua reprovada.
- **`drama-swallowing` passou a pegar a forma enclítica** (`engoli-las`), que escapava do regex. A ocorrência de `shared/architecture/backend-flow.md` só não passou despercebida porque a mesma linha tinha um "cobrar" que a outra regra acusou. Três testes novos em `audit-prose.test.mjs` (19 casos, antes 16).

## [2.3.0] - 2026-07-12

### Fixed

- **Ciclo B do épico writing-soul: `docs/sql/` reescrito por inteiro na voz sênior-para-leigo (18 páginas, 5.784 linhas, 8 batches).** Mesmo protocolo de v2.0.0 (`javascript`), v2.1.0 (`shared`) e v2.2.0 (`csharp`): cada arquivo relido e reescrito, com os blocos de código verificados por hash SHA-256 contra o HEAD. **T1** naming, formatting. **T2** crud, migrations, setup. **T3** visual-density, advanced, procedures, scripts. **T4** performance. **T5** null-safety. **T6** postgres. **T7** sql-server, sqlite. **T8** entity-modeling, batch, README, quick-reference.
- **H1 em pt-BR e headings de jargão renomeados para frases descritivas, com id ASCII explícito.** `Naming` virou "Nomes em SQL"; `CRUD` virou "As quatro operações básicas sobre uma tabela"; `Consulta em linha única` virou "Cada cláusula começa a própria linha"; `Hard DELETE` virou "Marcar como inativo em vez de apagar"; `= NULL nunca funciona` virou "Use IS NULL, porque `= NULL` nunca devolve linha"; `Taboos` virou "O que evitar". Os nomes de produto (SQL Server, PostgreSQL, SQLite) ficaram como estão.
- **Explicações no lugar de afirmações.** A conversão implícita de tipo passou a aparecer pelo estrago (a query de 20 ms vira 4 segundos com o código-fonte igual ao que sempre esteve); o `NOT IN` com um NULL na subquery, pelo sintoma (devolve zero linhas para sempre, sem erro); o `AVG`, pela conta errada (devolve 15 onde a resposta era 10, porque o divisor virou 2); o page split, pelo mecanismo (a linha nova cai no meio de uma página cheia e o banco parte a página em duas); o `IMMEDIATE` do SQLite, pela janela de disputa que o `DEFERRED` deixa aberta.
- **`visual-density.md` seguiu o canônico de JavaScript**: a tabela de Conceitos podada de 9 para 6 linhas, e o jargão cunhado no projeto (`blank line`, `clause separator`, `CTE separator`, `multi-line block`, `signature / body boundary`, `statement separator`, `orphan statement`) saiu da tabela para virar descrição do mecanismo em pt-BR.

### Changed

- **Convenção `SP_`/`fn_` aplicada aos exemplos, fechando pendência antiga do backlog.** Os exemplos Good contrariavam o `naming.md` do próprio guia. As procedures do SQL Server passaram a seguir `SP_VERBO_TABELA` (`SP_GET_FOOTBALL_TEAM_BY_ID`, `SP_GET_TEAM_PERFORMANCE_REPORT`, `SP_LIST_PLAYERS_BY_TEAM_AND_POSITION`, com o verbo `LIST` porque devolve coleção filtrada). As functions do PostgreSQL foram consertadas por inteiro: estavam em PascalCase dentro de blocos Good, e passaram a `fn_get_football_team_by_id` em `snake_case`, com nome, parâmetro, colunas e tabelas. O parâmetro leva o prefixo `p_` (`p_team_id`) porque, sem ele, colide com a coluna `team_id` dentro do corpo e o PL/pgSQL não resolve a ambiguidade. Os blocos Bad (`sp_GetData`, `get_team`) ficaram intactos, porque neles a ausência do prefixo é o anti-pattern. Dois scripts renomeados: `scripts/procedures/SP_GET_FOOTBALL_TEAM_BY_ID.sql` e `scripts/functions/fn_get_football_team_by_id.sql`. São 8 divergências intencionais de fenced block, e nenhuma além delas.
- **Âncoras frágeis convertidas em id ASCII, com os referrers sincronizados no mesmo passo.** `#tipo-de-id-bigint-vs-uuid` virou `#id-type-bigint-vs-uuid`, e ela tinha **três** referrers, e não os dois que o levantamento previa: `javascript/conventions/advanced/performance.md`, `csharp/conventions/advanced/performance.md` e `sql/sgbd/sql-server.md`. O `#select-`, cuja âncora dependia do slug do asterisco em `## SELECT *`, ganhou `#select-star`. Também entraram `#object-prefixes`, `#named-constraints`, `#indentation`, `#join-simple-on`, `#early-filters`, `#forward-only`, `#nested-subquery` e `#chained-ctes`, todos com o `docs/sql/README.md` sincronizado. O `#batch-operations` e o `#diagnostics` de postgres e sql-server foram preservados de propósito, porque recebem 5 links de `shared/platform/database.md`.
- **`csharp/setup/dapper.md` passou a apontar para a seção, e não mais para o arquivo.** O link esperava o id ASCII no heading `## Prefixos de objetos` do `naming.md`, que este ciclo criou. Um contraste binário que passou no épico do C# saiu junto ("segue a convenção do banco, e não a do C#").

### Added

- **Os anti-patterns de `sql/conventions/advanced/entity-modeling.md` ganharam exemplos Bad/Good** (pedido do Thiago durante o ciclo). Eram oito parágrafos de prosa corrida; viraram oito seções com id próprio, lead explicando o sintoma e par Bad/Good em PostgreSQL: god table, campos nulos por design ruim, lista disfarçada de colunas numeradas, JSONB no lugar de coluna tipada, JOIN em outro agregado, FK removida entre agregados, `tenant_id` repetido na tabela filha e ENUM para status que carrega dados extras. São 16 blocos novos, com constraint nomeada, formatação vertical e coluna qualificada; os 8 Good passaram no `audit:docs` sem violação.
- **Três regras novas no `audit:prose`, atacando a família da metáfora em vez da frase exata.** `drama-charging` pega qualquer forma do verbo cobrar aplicado a mecânica, `drama-swallowing` pega engolir, e `drama-false-promise` avisa sobre a construção "parece dar X, e Y". A lista de frases fixas vinha deixando passar cada redação nova da mesma metáfora ("cobra caro", "cobra três preços", "cobrava esse custo"), e cinco delas foram escritas durante os próprios batches deste ciclo, depois da recitação do checklist. A cobrança monetária de provedor ("o provedor cobra por token") é isenta pela regra `MONETARY_CHARGE`, porque ali a cobrança é literal. Testes de 10 para 16, cobrindo cada regra e os dois falsos positivos mapeados.

### Notas

- As regras novas do `audit:prose` acusam 31 ocorrências em páginas que os épicos anteriores deram como revisadas (`shared/` 14, `csharp/` 6, `javascript/` 5, mais 6 nas linguagens ainda não revisadas). O gate só falha nos arquivos alterados, então nada está bloqueado. A limpeza está no backlog como `fix:` separado, restrita às pastas já revisadas.
- Próximo alvo do épico: as 15 linguagens restantes.

## [2.2.0] - 2026-07-11

### Fixed

- **Ciclo B do épico writing-soul: `docs/csharp/` reescrito por inteiro na voz sênior-para-leigo (27 páginas, 9.495 linhas, 8 batches).** Mesmo protocolo de v2.0.0 (`javascript`) e v2.1.0 (`shared`): cada arquivo relido e reescrito, com os blocos de código verificados por hash SHA-256 contra o HEAD. **T1** núcleo (naming, variables, methods). **T2** control-flow, types, visual-density. **T3** async, error-handling, null-safety, validation. **T4** linq, dates, observability, performance, testing, dependency-injection. **T5** entity-modeling, api-design. **T6** project-foundation, security, vertical-slice. **T7** entity-framework, dapper. **T8** blazor, razor-mvc, README, quick-reference.
- **H1 em pt-BR nas 27 páginas, e headings de jargão renomeados para frases descritivas, todos com id ASCII explícito.** `Sufixo Async` virou "O sufixo Async avisa que a chamada precisa de await"; `SLA: orquestrador ou implementação` virou "Um nível de abstração por método"; `Circuit break` virou "Parar de percorrer assim que encontrar"; `Sealed por padrão` virou "Toda classe concreta nasce sealed"; `Global exception handler` virou "Barreira final para a exceção que ninguém tratou"; `Forward-only` virou "Só para a frente"; `Taboos` virou "Nomes proibidos". O `docs/csharp/README.md` teve as 15 âncoras afetadas sincronizadas no mesmo passo, e as quatro tabelas de tópicos ganharam rótulos em pt-BR casando com os H1 novos.
- **`visual-density.md` espelhou o canônico de JavaScript**: os 13 headings replanados na mesma redação, e a tabela de Conceitos podada de 12 para 6 linhas. O jargão cunhado no projeto (`tight pair`, `atomic trio`, `semantic pair`, `single-line orphan`, `explaining return`, `fragments → assembly`) saiu da tabela e virou descrição do mecanismo em pt-BR no corpo.
- **Contraste binário, metáfora de mecânica e fecho de efeito eliminados da pasta inteira, inclusive de dentro de headings.** `JWT: middleware valida, não ReadJwtToken` virou "Deixe o middleware validar o token". Saíram os aforismos ("contrato implícito é contrato errado", "Dois donos para a mesma invariante é receita certa de bug"), as metáforas ("volta o C# ao mundo do JavaScript dos anos 2000", "o TenantId vazio denuncia o problema", "contamine os módulos vizinhos") e as caudas "…, não Y".
- **Explicações no lugar de afirmações.** O N+1 passou a aparecer pelo sintoma (dez pedidos em desenvolvimento não mostram nada; em produção a mesma tela leva segundos); o `AsSplitQuery` pelo número (5 itens × 3 pagamentos devolvem 15 linhas); o `Task.WhenAll` pelo ganho (300 ms em vez de 900 ms); a captive dependency pelo estrago (dado de um usuário aparecendo na sessão de outro); o `order?.Total ?? 0m` pelo perigo (zero é um total plausível, e o erro atravessa o sistema disfarçado de dado válido); o `DateOnly` pelo bug (a meia-noite de 21 de agosto em São Paulo é dia 20 em UTC, e a data de nascimento anda um dia para trás).
- **Duas correções de voz do ciclo JavaScript replicadas aqui**: a glosa de JWT saiu de "Token Web em JSON" (literal, não explica) para "token assinado que identifica o usuário", e a de middleware virou "função que roda antes do handler".
- **Correções do Thiago incorporadas no caminho**: glosa de `thread` e de `log` faltando na primeira ocorrência (o `log` virou linha própria da tabela de Conceitos de observabilidade, descrito como o diário de bordo do sistema); "dado cru" virou "dado bruto"; o diagrama do pipeline de validação foi traduzido para pt-BR; e a expressão "por trás" foi banida e varrida do repositório.
- **Procedures do `setup/dapper.md` renomeadas para a convenção do banco.** `FindOrdersByCustomer` virou `SP_LIST_ORDERS_BY_CUSTOMER_ID` e `CreateOrder` virou `SP_ADD_ORDER`, seguindo o `SP_VERBO_TABELA` que o próprio guia declara em `sql/conventions/naming.md` e que os exemplos de C# contrariavam. O método do repositório que chama a procedure continua em PascalCase (`FindByCustomerAsync`), porque ele é código C#; a distinção entre as duas convenções virou parágrafo explícito, com cross-link para o SQL. Pendência antiga do backlog, fechada no lado C#.
- **O `audit:prose` pegou quatro violações escritas durante os próprios batches**, depois da recitação do checklist: a metáfora "paga o preço" (performance), o advérbio banido "realmente" (vertical-slice) e dois contrastes binários (entity-modeling). É a mesma lição do ciclo anterior: a violação inédita escapa do olho e o gate automático a segura.
- **Gates do ciclo**: audit 2518 blocos Good / 391 arquivos / 0 violações; test:docs 38/38; test:prose 10/10; audit:prose 27 arquivos com 0 erro e 0 aviso; audit-concepts csharp 25 OK / 0 MISSING / 0 NO-PARENS / 0 PT-IN-BOLD; lint 0; em dash zerado; 348 links com âncora e 0 quebrado. Blocos de código idênticos ao HEAD por SHA-256 em 24 das 27 páginas. As três exceções são intencionais: o diagrama de `validation.md`, traduzido a pedido, e dois blocos que o Thiago formatou à mão (`razor-mvc` e `dapper`), colando o `return` à variável que o nomeia e agrupando dois `parameters.Add` consecutivos, conforme a própria `visual-density.md` manda.

### Notas

- Próximo alvo do épico: `docs/sql/`, depois as 15 linguagens restantes.

## [2.1.0] - 2026-07-11

### Fixed

- **Ciclo B do épico writing-soul: `docs/shared/` reescrito por inteiro na voz sênior-para-leigo (57 páginas, 13.043 linhas, 8 batches).** Mesmo protocolo do `docs/javascript/` em v2.0.0: cada arquivo relido e reescrito por completo (prosa, `<summary>` e headings), com os blocos de código verificados idênticos byte a byte contra o HEAD por hash SHA-256. **T1** `standards/` (8 arquivos, piloto). **T2** `architecture/` núcleo (7). **T3** `architecture/` pesados (transactions, entity-modeling, domain-events). **T4** `architecture/` fluxos (3). **T5** `platform/` pesados (integrations, api-design, database, performance). **T6** `platform/` restante (9). **T7** `process/` e `mobile/` (13). **T8** `ai/` (10).
- **H1 em pt-BR nas 57 páginas, e headings de jargão renomeados para frases descritivas.** `Boundary transacional é boundary do agregado` virou "Uma transação cobre um agregado", `Locking: otimista vs pessimista` virou "Esperar na fila ou conferir a versão na hora de gravar", `Queue vs Pub/Sub` virou "A fila entrega a um, o tópico entrega a todos", `MCP vs tool use direto` virou "Quando usar MCP e quando bastam ferramentas próprias", entre dezenas de outros. Os H1 no formato `Termo EN (Tradução PT)` viraram título pt-BR descritivo, com o termo em inglês glosado na introdução e na tabela de Conceitos; a sigla ficou no título onde ela é o nome pelo qual o leitor conhece a coisa (RAG, MCP, CI/CD).
- **Contraste binário eliminado do `docs/shared/` inteiro.** A construção "não é X, é Y" e a cauda "…, não Y" saíram de toda a pasta, e cada ocorrência passou a enunciar Y direto: "O código de domínio fala em findByEmail, não em SELECT", "A rede é um detalhe de implementação, não um estado de erro", "a lógica de negócio fica nas ferramentas, não no loop de execução" e outras dezenas. O mesmo vale para metáfora de mecânica ("o N+1 se esconde", "a conta chega", "o handler engole o que vier"), fecho de efeito e AIismo.
- **Explicações no lugar de afirmações.** As páginas passaram a dizer o porquê onde antes só declaravam o quê: por que o debounce existe (o contato do botão bate e volta), por que a sessão em memória quebra com duas instâncias, por que o reflog recupera commit depois de `reset --hard` e por que ele não viaja no push, por que mudar uma vírgula no system prompt invalida o cache de prompt inteiro (ele casa por prefixo), por que "cão" e "cachorro" caem perto no espaço vetorial sem dividir uma letra, e por que o overlap do chunking existe.
- **Gate de escrita automatizado**: `.ai/skills/checklist-soul.md` (recitação obrigatória antes de cada arquivo) e `npm run audit:prose`, que audita os arquivos alterados contra o HEAD e falha com drama, metáfora, contraste binário, em dash ou advérbio banido. Ele pegou metáfora inédita escrita durante os próprios batches.
- **Correções de voz do Thiago incorporadas no caminho**: glosa de sigla com interpoint (`**API** (Application Programming Interface · Interface de Programação de Aplicações)`) no lugar de vírgula; JWT reglosado de "Token Web em JSON" para "token assinado que carrega a identidade do usuário"; "UI state é efêmero" virou "pertence à tela e dura o que a tela durar"; diagramas de `operation-flow` e `backend-flow` traduzidos para pt-BR com passos numerados e tabela explicando cada passo.
- **READMEs realinhados**: as tabelas de Plataforma, Processo, Mobile e IA do `README.md` raiz e os mapas de tópicos de `mobile/` e `ai/` passaram a casar com os H1 novos.
- **Gates do ciclo**: audit 2518 blocos Good / 391 arquivos / 0 violações; test:docs 38/38; test:prose 10/10; audit:prose 0 erro e 0 aviso; audit-concepts shared 55 OK / 0 / 0 / 0; lint 0; em dash zerado em `docs/shared/`; blocos de código idênticos ao HEAD por SHA-256 em todas as 57 páginas, com a única exceção intencional dos diagramas traduzidos a pedido. Links repo-wide: 348 com âncora, 0 quebrado. Próximo alvo do épico: `docs/csharp/`, depois SQL e as 15 linguagens restantes.

### Notas

- O catálogo de modelos de `shared/ai/` ficou intacto de propósito (`models.md` e `tokens.md` ainda citam Opus 4.7, Sonnet 4.6, GPT-5 e Gemini 2.5). O refresh sai como `fix:` separado, com dados frescos dos provedores.

## [2.0.1] - 2026-07-11

### Fixed

- **Âncoras de link agora são ids ASCII em inglês, declarados explicitamente.** Todo heading que é alvo de link ganhou um `<a id="ingles-ascii"></a>` logo acima dele, e os links passaram a apontar para esse id em vez da âncora que o renderer deriva do texto do heading. O motivo prático: heading em pt-BR gera âncora acentuada (`#operações-longas-viram-sequência-de-passos-curtos`), e o épico writing-soul renomeia headings o tempo todo, então toda reescrita de prosa quebrava link. Com o id explícito, o link deixa de depender do texto. Sweep de 127 ids inseridos em 18 linguagens mais `shared/`, e 177 links reescritos, com zero âncora acentuada restante em `docs/`, `README.md`, `REFERENCES.md` e `.ai/`.
- **Vocabulário canônico dos ids**: `no-logic-in-return` (12 alvos), `portuguese-names` (11), `single-level-of-abstraction` (10, unificando as quatro variantes de heading do SLA), `magic-values` (10), `case-conventions` (7), mais `god-function`, `code-as-documentation`, `multiple-return-types`, `collections-never-null`, `correlation-id`, `batch-operations`, `long-running-saga`, `multitenancy` e `ddd-and-domain-modeling`.
- **Sete links que já estavam quebrados foram consertados no caminho.** O `README.md` raiz ainda apontava para âncoras renomeadas pelo épico do JS (`#god-function-múltiplas-responsabilidades` em duas linhas, `#sla-orquestrador-ou-implementação-nunca-os-dois`, `#mutação-direta-de-objetos`, `#direct-return`, `#api-client-centralizado`, `#callback-hell`), e `.ai/backlog/troubleshoot.md` apontava para `#return-sempre-separado`. Os READMEs de cada linguagem tinham sido atualizados na época; o raiz ficou para trás.
- **Gates**: 384 links com âncora na árvore, 0 quebrados, 0 id duplicado por arquivo, 0 id dentro de bloco de código; audit 2516 blocos Good / 391 arquivos / 0 violações; test:docs 38/38; lint 0.

## [2.0.0] - 2026-07-11

### Fixed

- **Ciclo B do épico writing-soul: `docs/javascript/` reescrito por inteiro na voz sênior-para-leigo (22 arquivos, 6 batches).** Marca o major v2.0.0, a primeira revisão real contra o contrato de clareza fixado no Ciclo A (v1.28.28). Não foi edição cirúrgica: cada arquivo foi relido e reescrito por completo (prosa, `<summary>` e headings), com os blocos de código verificados idênticos byte a byte contra o HEAD por hash SHA-256. **T1 piloto**: `conventions/functions.md`, `conventions/visual-density.md`. **T2 core**: `naming.md`, `variables.md`, `control-flow.md`. **T3 avançado I**: `async.md`, `error-handling.md`, `null-safety.md`, `validation.md`, `performance.md`. **T4 avançado II**: `dates.md`, `observability.md`, `testing.md`, `entity-modeling.md`. **T5 frameworks/bot**: `discord.md`, `slack.md`, `telegram.md`, `whatsapp.md`. **T6 setup e topo**: `setup/project-foundation.md`, `setup/security.md`, `README.md`, `quick-reference.md`.
- **Princípios aplicados em todo o Ciclo B.** Jargão cunhado em inglês (`tight`, `blank`, `single-line`) trocado por descrição do mecanismo em pt-BR; termos com forma pt-BR natural traduzidos na prosa e mantidos em inglês só na introdução do termo (`arrow`→função flecha, `match`→corresponde); termos glosados inline na 1ª ocorrência e re-glosados quando reaparecem longe; H1 em pt-BR nos 22 arquivos; headings de jargão renomeados para frases descritivas com as âncoras dos READMEs sincronizadas (`God function`→`Função que faz tudo`, `SLA`→`Um nível de abstração por função`, `Callback hell`→`Callbacks aninhados sem controle`, `Setup do Client`→`Abrir a conexão e escutar eventos`, `Taboos`→`Nomes proibidos`, entre dezenas de outros); tabelas de Conceitos podadas para conter só termos genuínos da indústria (visual-density caiu de 12 para 6 linhas, com os rótulos internos inventados virando prosa). Correções do Thiago incorporadas no caminho: metáforas que travam a leitura ("troca de altura") viraram descrição concreta, "a mais/de menos" virou "sobrando/faltando", `colado` ficou proibido por já nomear o caso ruim, e a glosa de middleware recusou "componente de pipeline" e "esteira de processamento" até chegar em "função que roda antes do handler".
- **Seção nova em `setup/security.md`: o que fazer quando o segredo vaza.** Lidera pela inversão que quase todo mundo erra (rotacionar a credencial antes de limpar o histórico, porque reescrever commits não desfaz as cópias que já saíram), segue por invalidar as sessões que o segredo sustentava, caçar uso indevido nos logs do provedor, só então reescrever o histórico com `git filter-repo`, e avisar quem a política manda avisar. Fecha em prevenção: secret scanning com push protection e `gitleaks` como hook de pre-commit. `handler` e `token` viraram linhas próprias das tabelas de Conceitos, e o JWT deixou a glosa literal ("Token Web em JSON") por uma que ensina ("token assinado que identifica o usuário").
- **`docs/javascript/README.md` realinhado ao vocabulário novo.** Intro reescrita, rótulos das quatro tabelas traduzidos para casar com os H1 pt-BR (`Variables`→Variáveis, `Error Handling`→Tratamento de erros, `Quick Reference`→Referência rápida), Setup reordenado para fundação antes de segurança, e todos os targets de link e âncora preservados. Nenhuma âncora quebrada em nenhuma linguagem (o link cross-language de `docs/typescript/conventions/functions.md` foi conferido e atualizado).
- **Gates do ciclo**: audit 2516 blocos Good / 391 arquivos / 0 violações; test:docs 38/38; audit-concepts javascript 20 OK / 0 / 0 / 0; lint 0; em dash, advérbios banidos e openers zerados nos 22 arquivos. Diff de 712 inserções e 525 remoções, só prosa. Próximo alvo do épico: `docs/shared/`, depois C#, SQL, AI e as 15 linguagens restantes.

## [1.28.28] - 2026-07-10

### Fixed

- **Writing soul elevado de lista de proibições para contrato de clareza** (`.ai/skills/writing-soul.md`), Ciclo A do épico de alinhamento de documentação. Duas seções novas ancoram a compreensão como meta: "Why this soul exists" (clareza acima de brevidade, cleverness e completude; o teste do leitor que segue o texto na primeira passada) e "Clarity mandate" (simplificar a frase, explicar em vez de só afirmar, glosar entre parênteses o termo que o leitor pode não conhecer julgando pela audiência e não por ser sigla, liderar pela conclusão). A regra de em dash passou a valer em qualquer surface, inclusive comentários de código e scripts de exemplo. Anti-AIismo reforçado: heurística "machine-generated smell" (parágrafos de tamanho par, hedges balanceados, tricolons arrumados → reescrever como um sênior explicando a um colega) e listas de openers e jargão ampliadas (leverage/utilize/delve/seamless/robust, "It's worth noting", "That said", "When it comes to", "At the end of the day"). A glosa na Default voice virou dirigida por compreensão, com 2ª glosa quando o termo reaparece longe da primeira. "Language of delivery" agora reconhece os `docs/**` pt-BR e aponta as Standing Directives de `tasks.md` como SSOT do formato pt-BR. Standing Directives ganharam a linha do contrato de clareza no topo (cross-ref, sem duplicar). Gates: soul sem em dash próprio (só menções da regra) nem adverbs banidos, dogfood `just` corrigido; audit 2514/391/0; test:docs 38/0; writing-lint 19/0; lint 0. Base canônica para os próximos ciclos (JS redo profundo → shared → C# → SQL → AI → 15 linguagens).

## [1.28.27] - 2026-07-10

### Added

- **Versionamento de API** em `docs/shared/platform/api-design.md`: seção nova que fixa o contrato no prefixo da rota (`/api/v1`), separa mudança aditiva de incompatível numa tabela, mostra `/api/v2` convivendo lado a lado com `/api/v1` e deixa `GET /health` fora do contrato de versão. Todos os exemplos de rota do arquivo passaram a carregar o prefixo de versão (`/api/orders` → `/api/v1/orders`, incluindo verbos, convenções de rota e blocos de código).
- **Verbo QUERY** em `api-design.md`: linha nova na tabela de verbos REST e seção "Leituras com corpo" explicando a leitura segura e idempotente que carrega o filtro no body (rascunho na IETF), com exemplo `curl` e a ressalva de tooling do OpenAPI 3.1/3.2. GraphQL entra ao lado como a outra forma de recorte por campo.
- **Erros no padrão Problem Details (RFC 9457)** em `api-design.md`: seção nova com a tabela de campos (`type`, `title`, `status`, `detail`, `instance`, `code`, `errors`) e o mapeamento do `{ code, message }` mínimo para a forma completa do RFC.
- **Paginação** e **Limite de requisições** em `api-design.md`: `meta.pagination` com `page`/`pageSize`/`totalPages`/`totalItems` e o porquê do teto de `pageSize`; contrato de `429 Too Many Requests` com `Retry-After` e cabeçalhos `X-RateLimit-*`, por cliente e por rota.
- **Documentação a partir do schema** e **Padrões e RFCs** em `api-design.md`: um schema gera validação, tipos e OpenAPI de uma vez (Scalar, Swagger UI, Redoc, GraphiQL); tabela de normas com links (RFC 9110, 9457, rascunho QUERY, 6750, 7519, 8259, OpenAPI 3.1) e quem é a IETF. Novas linhas na tabela de Conceitos: `versioning`, `QUERY`, `Problem Details`, `RFC`, `IETF`.
- **Integração com observabilidade** em `docs/shared/platform/integrations.md`: seção nova mostrando que o contrato estável (envelope único, `error.code` previsível, `traceId` em toda resposta) deixa Sentry, Datadog, New Relic, Grafana, Logtail e Slack consumirem os mesmos campos sem adaptação por rota.
- **CORS** em `docs/shared/platform/security.md`: seção "CORS: allowlist no boundary" com Bad/Good (allowlist vs `*`), a incompatibilidade de `Access-Control-Allow-Credentials: true` com `*` e a nota de que CORS só existe no navegador; linha nova na tabela de Conceitos.
- **APIs, HTTP e RFCs** em `REFERENCES.md`: seção nova de bibliografia com RFC 9110, 9457, rascunho QUERY, 6750, 7519, 8259, OpenAPI 3.1 e o catálogo oficial das RFCs.

### Changed

- **Alinhamento do C#** em `docs/csharp/conventions/advanced/api-design.md`: nota apontando que versionamento (`Asp.Versioning.Http`), verbo QUERY (`MapMethods`) e Problem Details (`TypedResults.Problem`) são agnósticos e vivem na SSOT, com o idiom de cada um em ASP.NET Core.
- Diagrama do pipeline de requisição em `api-design.md` reescrito como dois fluxos lineares da esquerda para a direita (Requisição / Resposta), no lugar do desenho bidirecional com setas de retorno.

## [1.28.26] - 2026-07-10

### Changed

- **Layout AAA dos testes padronizado para "interp 1"** em 15 linguagens (`docs/*/conventions/advanced/testing.md`), na visão transversal (`docs/shared/standards/testing.md`) e nos scripts de referência (`docs/*/scripts/test/*`): todas as declarações do teste (arrange + act + `expected`) formam um bloco único e uma linha em branco isola a asserção — antes as fases apareciam fragmentadas (`1+1+1`), agora formam o `2+2` da regra de densidade visual. Casos finos: 1 declaração + 1 assert ficam juntos sem blank; objeto/array multi-linha ganha respiro depois; exemplos rotulados com `// Arrange // Act // Assert` (Go, Kotlin, Java, PHP, Swift, Dart) ficaram tersos sem os comentários de fase. Também corrigido o callout `[!NOTE]` quebrado em `docs/javascript/conventions/advanced/testing.md` (o marcador precisa de linha própria). `node --test` no script node: 3 pass, 0 fail.
- **Glosa de sigla passa a usar interpoint `·`** no lugar da vírgula entre a expansão em inglês e a tradução em português: `**API** (Application Programming Interface · Interface de Programação de Aplicações)`, `**AAA** (Arrange, Act, Assert · Arranjar, Agir, Atestar)`. Substituição literal ancorada em `(EN, ` → `(EN · ` — segura contra vírgulas de prosa e cobre glosas quebradas em duas linhas —, ~470 ocorrências em 165+ arquivos; separadores antigos do AAA (`,` `/` `;` `:`) normalizados para `·`. Preservados por não serem glosas: assinaturas de método (`(Guid id, CancellationToken ct)`), listas de traits (`(Debug, Clone)`) e comparações de tecnologia (`(PostgreSQL, SQL Server)`). Audit clean: 2509 blocos Good em 391 arquivos.

## [1.28.25] - 2026-07-06

### Fixed

- Revisão writing soul da prosa explicativa, task T5 completa: `docs/shared/ai/` inteiro (10 arquivos, todos editados) — fecha a task 1 de 2 (T1–T5: README raiz + `shared/` + `javascript/` + `csharp/` + `shared/ai/`). Prosa apenas: blocos de código Good/Bad intactos. **LLM unificado** para "Modelo de Linguagem de Grande Escala" (security, agents e advanced usavam "Modelo de Linguagem Grande") e **RAG unificado** para "Geração Aumentada por Recuperação" (README e o H1 de rag.md usavam "Geração com Recuperação Aumentada"); o H1 de rag.md também foi reduzido à forma curta da regra de título (verificado zero links inbound para âncoras). **fronteira→limite zerado** (Trust boundary na tabela de Conceitos + prosa de mitigação em security) — diretiva boundary→limite sem pendências no projeto. **Expansão de sigla removida de dentro de nomes próprios** (mesma regra do "SQL Server" na v1.28.23): Mistral AI, Voyage AI, OpenAI Agents SDK e o AI Gateway do intro de advanced. Defeitos substantivos: célula quebrada `|;` na tabela de context window (tokens.md, saída máxima do Llama 4 Scout → "não divulgada"); bold aninhado quebrado em tools-mcp.md ("Exemplo de schema em JSON"); blank dupla entre seções (models.md); comma splice no parágrafo-resumo do README (→ dois-pontos). Tabela de Conceitos do README conformada manualmente (o audit-concepts pula README): **Quantização** PT-em-bold → **Quantization** (quantização); **Prompt** e **Token** sem parênteses ganharam tradução; gloss de token que repetia o próprio termo corrigida. Anglicismos e calques: performam/performa→funcionam/funciona, parseável/parsabilidade→processável por código, roundtrips→chamadas de ida e volta, registry→registro, "Por API call"→"Por chamada de API", Sweet spot→Ponto de equilíbrio, formatos legacy→antigos, "Deep Think mode"→"modo Deep Think", hardware consumer→doméstico; typo harnessses→harnesses ×2; agentico→agêntico ×4. Glosses novas no padrão consolidado: grounding = ancoragem (bold no README), stateless = não retém estado, upstream/downstream = etapa anterior/seguintes, time travel, primacy/recency bias = viés de primazia e recência, K-nearest neighbors = os K vizinhos mais próximos, HyDE com tradução PT, PII em security (padrão das tabelas de observability), APIs glossada na primeira ocorrência de tokens.md (a expansão estava enterrada dentro de "Batch API" no fim do arquivo). Glosses deduplicadas pós-tabela: GGUF ×2 (models.md); LLM no intro do README agora glossado na primeira ocorrência em prosa. Gramática: "resultado de treinamento"→"resultante do treinamento", "responderia a query"→"à query", "por si só, só produzem"→"sozinhos, só produzem", alignment padding normalizado no bloco de mitigação (advanced.md). Revisão paralela do Thiago em advanced.md incorporada no mesmo ciclo (LoRA = Adaptação de Posto Reduzido, PII scrubbing glossado, compliance→conformidade, OSS→open-source por extenso). Audit clean: 2509 blocos Good em 391 arquivos; tests 38/38; audit-concepts shared/ai 9 OK + shared 55 OK / 0 violações; em dash, fronteira, `↓`, advérbios banidos e "pra" zerados em shared/ai

## [1.28.24] - 2026-07-06

### Fixed

- Revisão writing soul da prosa explicativa, task T4 completa: `docs/csharp/` inteiro (27 arquivos revisados, 24 editados; naming.md já estava limpo). Prosa apenas: blocos de código Good/Bad intactos. **Diagrama vertical zerado**: o pipeline com `↓` de setup/vertical-slice.md virou fluxo linear + tabela Etapa/Papel/I-O/Falha — era a última pendência de diagrama do checkpoint; o bloco cercado deixou de contar no audit (2510→2509, delta esperado e sem violações). **fronteira→limite zerado** (~10 ocorrências), incluindo dois headings renomeados com verificação prévia de âncoras (grep doc-wide, zero links inbound): linq.md "Materialização nas fronteiras"→"nos limites" e null-safety.md "validação nas fronteiras"→"nos limites"; variables.md "Mutação direta"→"Alteração direta" com a âncora do README de C# atualizada no mesmo edit. **mutar/mutável→descrição comportamental** em 8 arquivos (variables, types, linq, entity-modeling, testing, vertical-slice, null-safety, performance): "qualquer código pode alterar", "estado que muda", "não muda depois de criada". Glosses deduplicadas após a tabela de Conceitos (api-design, async, dependency-injection, linq, observability, security, testing AAA) e prosa triplicada do assert/`expected` condensada em testing.md — mesmo achado do T3 em JS. Glosses novas no padrão consolidado: LINQ = consulta integrada à linguagem, fall-through = execução que continua no caso seguinte, narrowing = estreitamento do tipo, constraint = restrição de tipo, boilerplate = código repetitivo de cerimônia, timezone = fuso horário, guard rail = barreira de proteção, handler = processador de requisição (razor-mvc usava "manipulador"); a pedido do Thiago: thread pool = conjunto gerenciado de linhas de execução, lazy evaluation = avaliação sob demanda (intro do LINQ reescrita sem "composável e com avaliação preguiçosa"). **MVC unificado** para "Modelo-Visão-Controlador" (api-design usava "Controle"); mock sem "dublê" (testing). Anglicismos e calques: aliasa→dá apelido, co-localizada/os→reunida/junto, enforcement→filtro aplicado, dumping ground→depósito, shift→deslocamento, borbulham→propagam, refator→refatoração, racional→porquê, "pra"→"para"; advérbio banido "genuinamente" (types) e "genuíno"→"legítimo". Expansões de sigla removidas de `<summary>` (regra de título): HTTP em control-flow, glosses de middleware/handler em security, ad hoc em blazor/razor-mvc. Defeitos substantivos: "valide as saídas no topo"→"trate os casos inválidos no topo" (guard clauses, control-flow); frase emaranhada da paginação em entity-framework; blockquote duplicado do shared removido (null-safety, observability); duas seções sem prosa introdutória ganharam contexto (níveis de log, o que nunca logar); "Essa estrutura"→"Esta estrutura" (dapper, project-foundation). Audit clean: 2509 blocos Good em 391 arquivos; tests 38/38; audit-concepts csharp 25 OK / 0 violações; em dash, `↓`, fronteira, advérbios e "pra" zerados em csharp

## [1.28.23] - 2026-07-05

### Fixed

- Revisão de `docs/sql/` completa: densidade visual nos exemplos + writing soul na prosa (16 arquivos editados). **Densidade**: blank espúria antes de `SET @Rows = @@ROWCOUNT` removida em 4 pontos (batch.md ×2, visual-density.md, sql-server.md) — o par DML + `SET @var = @@ROWCOUNT` é encadeado (o SET consome o resultado do statement anterior) e fica colado; a exceção do **par encadeado** agora está documentada em visual-density.md (prosa da seção Control flow + linha nova na Referência rápida), corrigindo o próprio bloco Good que ensinava o padrão errado. O padrão `VALUES` vertical já estava 100% conforme (25 ocorrências auditadas, zero desvio); o desvio real de indentação era um CREATE TABLE com 4 espaços em performance.md. Alignment padding normalizado para espaço único em 8 blocos (batch, sql-server, postgres, sqlite, null-safety, performance, migrations). **Writing soul**: 11 em dashes + fronteira→limite + "genuinamente" eliminados (entity-modeling.md); fronteira→limite ×2 (visual-density.md); falso cognato "idiomas"→idioms ×9 (advanced, migrations, procedures, sgbd ×3, README); anglicismos "enforce/enforçada/enforça"→"impõe/aplicada/aplica" (sqlite.md, sqlfluff.md); "pra"→"para" ×3; 5 `<summary>` com expansão de sigla encurtados para a forma de título (UUID movido para a tabela de Conceitos do sql-server.md, CSV para a prosa de BULK INSERT/COPY); expansão de SQL removida de dentro do nome próprio "SQL Server" ×3; gloss de CI repetida após a tabela de Conceitos removida (foundation.md); gloss de CRUD deduplicada entre intro e tabela (crud.md). **Dogfood em blocos Good**: `PRIMARY KEY` inline sem nome → `CONSTRAINT PK_` nomeada (naming.md + migration `create_football_teams.sql`, que também ganhou `FK_Players_FootballTeams` nomeada); colunas qualificadas `ExternalUsers.*` no INSERT...SELECT de crud.md; `GETDATE()`→`GETUTCDATE()` no soft delete; casing `orders.id`→`Orders.Id` no diagnóstico do sql-server.md; alias `PositionInTeam`→`position_in_team` em exemplo snake_case (postgres.md); `UPDATE orders` alinhado ao padrão vertical (postgres.md RETURNING); vírgula faltante em Bad de null-safety.md (erro de sintaxe não-intencional); frase quebrada no intro de performance.md ("o otimizador escolhe um plano só pode escolher") corrigida; blockquote duplicado de null-safety removido; 2 labels de link com profundidade errada corrigidos (entity-modeling.md, href intactos). Deferido para decisão: procedures/functions de exemplo sem prefixo `SP_`/`fn_` (GetFootballTeamById) contrariam o padrão de naming.md — renomear implica renomear arquivos de scripts/. Audit clean: 2510 blocos Good em 391 arquivos; tests 38 pass; audit-concepts sql 16 OK / 0 violações; nenhum heading renomeado

## [1.28.22] - 2026-07-05

### Fixed

- Revisão writing soul da prosa explicativa, task T3 completa: `docs/javascript/` inteiro (22 arquivos revisados, 19 editados; `variables.md`, `README.md` e `quick-reference.md` já estavam limpos — coerente com o status de referência canônica da revisão de 2026-05-09). Prosa apenas: blocos de código Good/Bad intactos. Defeitos substantivos: **falso cognato** `redaction` glossado como "redação" em observability.md → "mascaramento de dados sensíveis"; **erro factual** em setup/security.md ("chaves com valor zero indicam segredos" quando as chaves do `.env.example` estão vazias, não zeradas); **verbo inventado** "coercionam/coercidas" (control-flow, null-safety) → "avaliam como"/"convertidas"; prosa triplicada do AAA/`expected` explícito em testing.md condensada (intro + preâmbulo + seções repetiam o mesmo texto); frase duplicada verbatim removida em validation.md; em dash em comentário de código zerado (entity-modeling). Anglicismos e calques: Trap→Armadilha, dumping ground→depósito, co-localizados→lado a lado, parseia→faz parse, deprecado/deprecated→descontinuado, "sob os panos"→"por baixo dos panos", Blank lines→Linhas em branco, shape/constraints→formato/restrições, replies→respostas, "é quebrado"→"não funciona", "pra"→"para", "refator"→"refatoração", "quebra cabeça"→"quebra-cabeça". Glosses novas no padrão consolidado: Handler = processador de requisição/evento, polling = consulta periódica, UI = Interface do Usuário, thread = linha de execução, timezone = fuso horário, duck-typing = verificação pela forma do objeto, prototype pollution, tradeoffs, SDK, ESM-only, fall-through, arrow antipattern, Strategy Map, time-ordered, retry, match. Expansões de sigla removidas de `<summary>` (regra de título usa forma curta): ISO, JSON, API. Consistência de gênero: "a Slack"→"o Slack" quando é o produto agindo (empresa permanece "a Slack"). Gramática: "coladas"→"colados" (concordância), "confirmar dono"→"confirmar o dono", API completada para "Interface de Programação de Aplicações" (naming.md). Nenhum heading renomeado: âncoras e links internos intactos. Audit clean: 2510 blocos Good em 391 arquivos; tests 38/38; audit-concepts javascript 20 OK / 0 violações

## [1.28.21] - 2026-07-05

### Fixed

- Revisão writing soul da prosa explicativa, tasks T1 e T2 completas: README raiz + `docs/shared/` inteiro (architecture 13, platform 13, standards 8, process 7, mobile 6), 44 arquivos alterados, blocos de código Good/Bad intactos. Padrões aplicados: em dashes eliminados; **fronteira → limite** com ajuste de gênero (null-safety, testing, methodologies — diretiva boundary→limite agora sem pendências em shared/); traduções literais substituídas por comportamentais (worker ≠ trabalhador → "processo que executa tarefas em segundo plano", Data Mart ≠ "mercado de dados", watchdog ≠ "cão de guarda", deadlock → "impasse entre transações", kill switch → "chave de emergência", Handler → "processador de requisição"); diagramas verticais com `↓` convertidos para lineares (observability, offline-first, permissions); expansões unificadas (UI = Interface do Usuário, URL = Localizador Uniforme de Recurso, CPU = Unidade Central de Processamento, LLM = Modelo de Linguagem de Grande Escala, CNAB/SPED sem duplicação); glosses repetidos removidos (ARIA, BOM, EOF, pipeline, pre-commit); PT-em-bold corrigido fora do alcance do audit (authentication/authorization em security, cyclomatic complexity em testing, boundary em null-safety). Defeitos substantivos encontrados pela revisão: link para `.ai/skills/` (gitignored, quebrado no clone e no site) em configuration.md redirecionado para `principles.md#dependências-explícitas`; tabela de estratégias de cache em performance.md com header de 2 colunas e linhas de 3; semântica invertida em "TTL curto = cache quente" (performance.md) e no princípio servidor/cliente de consultas NoSQL (database.md); typos "precisa muda" (configuration.md) e "negocio" (governance.md); "pra" → "para" e gloss triplo do TBD (git.md). Workflow `docs.yml` passa a publicar `sql` no site (4/18 linguagens). Audit clean: 2510 blocos Good em 391 arquivos; tests 38/38; audit-concepts shared 55 OK / 0 violações

## [1.28.20] - 2026-07-05

### Fixed

- Densidade visual em blocos Good + scripts de exemplo, segunda varredura: padrões de blank line estranha que as regras da v1.28.16 não cobriam. 16 correções em 15 arquivos / 10 linguagens, em três famílias: (1) **declaração + guard de 1 linha separados por blank** — o par fica tight, com respiro depois (`csharp/naming.md`, que tinha guard quebrado com `if` numa linha e `return` na outra; discord; whatsapp ×2; typescript variables/performance/types); (2) **par semântico encadeado fragmentado** — consumidor direto isolado da declaração que consome (kotlin dates, dart types, go performance, php performance, ruby types, `mongodb/04-delete.js`); (3) **trio atômico fragmentado** em `2+1` ou `1+1+1` (javascript null-safety, rust variables, kotlin null-safety com `require` órfão). Linter ganhou duas regras permanentes: `density-guard-split` (declaração + guard de linha única com blank no meio; `if` headless separado do corpo) e `density-lonely-chain` (declaração solitária + consumidor direto solitário), com exceções codificadas para os padrões legítimos — fase de guards consecutivos, fases AAA de teste, constantes SCREAMING_CASE, return separado e side-effect sem atribuição como fase própria. Tests +8 (38 pass). Os 59 scripts de exemplo e teste das linguagens entraram na varredura: testes jest/vitest/mstest/nunit já estavam no padrão AAA. Audit clean: 2510 blocos Good em 391 arquivos

## [1.28.19] - 2026-07-05

### Fixed

- Sete achados da avaliação profunda do repositório resolvidos em ciclo único. **Predicado impuro em bloco Good** (o mais grave): `isInvalid` disparava `notifyDefault` dentro da query (violação de CQS), chamava função inexistente no exemplo e, no JS, retornava o `undefined` do comando — cliente inadimplente passava como válido e a invoice era emitida. Corrigido em `javascript/functions.md`, `java/methods.md` + `methods.java` e `python/functions.md` (variante `is_valid`/`notify_default`, encontrada pela regra nova de lint, não pelo grep manual): predicado puro com guards paralelos, notificação movida ao orquestrador como comando explícito (`notifyRejection`). **Regra `predicate-purity`** no linter local: função com prefixo booleano (`is/has/can/...`) que chama verbo de comando (`notify`, `save`, `send`, `log`, `print`...) no corpo agora falha o audit; +3 testes (30 pass). **Guard style reconciliado**: docs/ é SSOT do guard de linha única; governança local passa de `curly: all` para `curly: multi-line`. **LICENSE** CC BY 4.0 (texto oficial da Creative Commons) e **CONTRIBUTING.md** (fluxo de proposta, gates de qualidade, estilo dos exemplos) criados; README ganhou badge de licença e seções Contribuindo/Licença. **Link-check CI** (`.github/workflows/link-check.yml`): lychee `--offline --include-fragments` valida links e âncoras internas de todos os `.md` em push/PR — os 135+ links quebrados da v1.28.15 não acumulam mais em silêncio. **Badges sem versão pinada**: 29 badges do README de-versionados (Next 16, FastAPI 0.136.0, SQLite 3.53...); versões permanecem apenas nas descrições da tabela, que documentam o escopo dos docs. **`functions.md` (JS)**: nova seção "Helpers aninhados: quando extrair" com par Bad/Good (`formatCurrency` duplicado em dois orquestradores → promovido ao módulo) e trade-offs nomeados (teste isolado, reuso, recriação por closure); rationale operacional do Explaining Return (breakpoint, diff, naming). Conceitos **helper** e **SLA** (Single Level of Abstraction, Único Nível de Abstração) adicionados às tabelas de Conceitos fundamentais de 10 linguagens, com tradução unificada ao canônico de `shared/architecture/principles.md`. Audit clean: 2510 blocos Good em 391 arquivos

## [1.28.18] - 2026-06-26

### Fixed

- Termo `Paid` renomeado para `Settled` em todos os exemplos da documentação. A pronúncia de "Paid" em pt-br é interpretada de forma jocosa, o que destoava do tom profissional dos docs. Rename mecânico **case-preserving** do morfema (`PAID`→`SETTLED`, `Paid`→`Settled`, `paid`→`settled`), que cobre todas as formas derivadas: estado/enum (`OrderState.Settled`, `OrderStatus::Settled`), boolean (`isSettled`, `is_settled`, `IsSettled`), timestamp (`settledAt`, `settled_at`, `SettledAt`), eventos (`OrderSettled`, `OrderSettledV1`, `OrderSettledHandler`), métodos (`markAsSettled`, `mark_as_settled`, `MarkOrderAsSettled`), negações (`unsettled`, `UnsettledOrderError`) e literais de string. 251 ocorrências em 49 arquivos / 18 linguagens + shared. `Settled` mantém a gramática de particípio passado da regra de naming em `domain-events.md` (`Placed, Cancelled, Refunded, Shipped, Settled`). Tokens de tradução PT (`pago`, `Pago`, `pagamento`) preservados intactos — só o token inglês mudou. Audit clean: 2509 blocos Good em 391 arquivos

## [1.28.17] - 2026-06-26

### Added

- Publicação do C# no site de docs (`.github/workflows/docs.yml`). A etapa "Sync docs content into renderer" passou de dois `cp` hardcoded (`javascript`, `shared`) para um loop sobre `LANGS="javascript csharp shared"` — acrescentar uma linguagem agora é só editar a lista. csharp soma 27 arquivos `.md` (~106 páginas no total, +34% sobre as ~79 anteriores), folgado no orçamento do runner free. Verificado autocontido: zero links cross-language (relativos internos + `shared`), estrutura idêntica à do javascript, então a navegação do renderer monta igual (ordem alfabética: csharp, javascript, shared). **Guarda de estrutura** no mesmo loop: antes de copiar cada pasta, falha rápido com `::error::` se a pasta estiver ausente (path errado) ou sem nenhum `.md` (vazia → nav quebrada silenciosa). Escopo segue reduzido de propósito (comentário atualizado) enquanto o build completo das 18 linguagens não cabe no runner free.

## [1.28.16] - 2026-06-26

### Fixed

- Densidade visual em blocos Good: linhas soltas (orphans) que quebravam a leitura. Dois padrões: (1) Explaining Return fragmentado por blank quando a declaração que nomeia o valor retornado é single-line — incluindo object/array literal inline (`const userData = { user, orders, invoices };`) e linguagens sem keyword de declaração (Python, PHP); (2) órfão de `await` sequencial em trio `2+1`. 38 ocorrências corrigidas em 12 arquivos / 6 linguagens (js, ts, csharp, php, python, swift): ambos `fetchUserData` e `fetchDashboard` (async.md), 12 em react-nextjs, 3 em angular (um movendo o blank para depois do bloco multi-line), dapper e vertical-slice (fragments→assembly), guard órfão de `BusinessError` em error-handling.md. Lint `audit-docs.mjs` ampliado: `density-explaining-return-blank` agora detecta declaração single-line nomeando o retorno em qualquer indentação, com guard de indentação que exclui declaração em bloco aninhado (ex: `match/case` do Python); `density-orphan-single-line` passa a pegar trios homogêneos de `await` além de literais. Tests +5 (27 pass). Audit clean: 2509 blocos Good em 391 arquivos

## [1.28.15] - 2026-06-23

### Fixed

- Links e âncoras quebrados em toda a documentação (varredura completa: 0 restantes). `docs/csharp/setup/vertical-slice.md`: 2 links relativos com pasta errada (`../advanced/...` → `../conventions/advanced/...`) e bloco anti-pattern ganhou o par **✅ Bom** que faltava (CQS, query separada do comando, regra de negócio no step, sem lógica no return). 78 alvos de arquivo inexistentes corrigidos em 47 arquivos: profundidade relativa errada, arquivos `shared/` movidos (`platform/observability.md` → `standards/observability.md`), 4 links órfãos `null-safety.md` em python/ruby repontados ao canônico `shared/standards/null-safety.md`, e 2 dir-links `../../../nosql/`. 57 âncoras `#secção` stale (headings renomeados nas revisões writing-soul: em-dash → dois-pontos muda o slug de `--` para `-`; seções expandidas) corrigidas em READMEs por linguagem e no README raiz. Audit clean: 2509 blocos Good em 391 arquivos

## [1.28.14] - 2026-06-23

### Fixed

- Lint limpo (7 erros pré-existentes → 0). `.ai/tooling/scripts/translate-bad-good.mjs`: regex de extensões extraído para constante `SUPPORTED_EXTENSION` + condição convertida em guard clause (elimina linha longa e aninhamento); cálculo de `matches` com operador `+` no fim da linha e blank lines nos pontos exigidos pela regra `local/semantic-spacing`. `docs/nosql/scripts/mongodb/04-delete.js`: blank line antes do explaining-return group em `removePlayer`, dogfood da própria regra de densidade visual. Audit clean: 2508 blocos Good em 391 arquivos

## [1.28.13] - 2026-06-23

### Fixed

- `docs/csharp/README.md` restaurado: o commit `72a7f9f` corrompeu o arquivo inserindo a linha de Entity Modeling entre cada linha original (96 cópias), quebrando badge, intro e todas as tabelas. README reconstruído a partir da versão íntegra com a linha `[Entity Modeling]` no lugar correto — tabela Avançados, entre Dates e Quick Reference — seguindo o padrão de java, go e typescript. Varredura nos 17 READMEs de `docs/*/` confirmou a corrupção isolada em C#: demais íntegros (1 referência `entity-modeling.md` cada; `---` e cabeçalhos de tabela repetidos são legítimos)

## [1.28.12] - 2026-05-11

### Changed

- `REFERENCES.md` ganha nova seção `## DDD e Modelagem de Domínio` com 7 entradas: livros _Domain-Driven Design_ (Evans), _Implementing Domain-Driven Design_ (Vernon) e _Patterns of Enterprise Application Architecture_ (Fowler, com link para martinfowler.com); o link "Domain-Driven Design Reference, Eric Evans" foi movido de "Metodologias e Processo" para a nova seção (lugar mais natural); três bliki posts do Fowler adicionados (Aggregate, Value Object, Bounded Context)
- `docs/shared/architecture/entity-modeling.md` — seção Referências reorganizada para separar cross-links internos (5 docs do guia) de bibliografia externa (ponteiro `→ REFERENCES.md#ddd-e-modelagem-de-domínio`), restaurando o SSOT: bibliografia centralizada em REFERENCES.md, cross-links contextuais inline. Audit clean: 2336 blocos Good em 374 arquivos

## [1.28.11] - 2026-05-11

### Changed

- `docs/shared/architecture/entity-modeling.md` revisado aplicando writing-soul estrita: tabela de Conceitos fundamentais expandida de 9 para 17 termos (adicionados invariant, boundary, nullable, God Object, repository, ORM, soft delete, row-level security) cobrindo todos os termos técnicos usados no corpo; 9 aberturas de seção suavizadas com tom convidativo e bridging sentences (intro com explícito "esta página serve a duas pessoas", Strongly-typed IDs abrindo pelo bug concreto antes da defesa, BaseEntity com sequência tentadora "já que tem base...", Composição com motivação antes dos três padrões, Anti-patterns com critério de revisão); cardinality e nullable ganham gloss funcional na tabela; explanação inline de mixin/trait/protocol/interface ao primeiro uso. Audit `npm run audit:docs` clean: 2336 blocos Good em 374 arquivos. 834 linhas

## [1.28.10] - 2026-05-11

### Added

- `docs/shared/architecture/entity-modeling.md` criado (820 linhas, 12 seções, 13 blocos Bad/Good): modelagem de entidades transversal com exemplos em JavaScript puro. Cobre tamanho saudável (heurística de coesão 5-10 / 10-15 / 15+), composição via value object embutido/opcional/satélite (Address, TaxInfo, CustomerProfile), strongly-typed IDs (CustomerId vs string crua), BaseEntity mínima com auditoria por composição, propriedade vs lista (cardinalidade 0..1, 1, 0..N), relacionamentos 1:N com aggregate root protegendo invariantes, N:N com entidade intermediária quando há atributos próprios (Enrollment), identidade vs referência cruzando aggregate boundary, multitenancy com TenantId só no aggregate root + enforcement no repositório, e 8 anti-patterns nomeados. README raiz +1 entrada na tabela Architecture. Audit `npm run audit:docs` clean: 2336 blocos Good em 374 arquivos

## [1.28.9] - 2026-05-11

### Changed

- `.ai/skills/writing-soul.md` — rubrica reescrita: rótulos AI-poéticos removidos (Mouth vs Soul, Visual serenity, Professional peerage, Stop-Slop, Personality); adicionada seção `## Who reads what we write` nomeando os dois leitores (recém-chegado e retornante); travessões eliminados do próprio corpo da rubrica; advérbios PT adicionados à lista banida (realmente, simplesmente, basicamente, literalmente, fundamentalmente, profundamente, verdadeiramente) e aberturas PT ("Vamos explorar...", "Antes de mais nada,"); frases vazias ("Make complexity accessible") substituídas por instrução concreta
- `docs/**` — pass de revisão de copy em 344 arquivos `.md` nas 18 pastas: **4595 → 9 travessões** (os 9 remanescentes são literais em exemplos `<title>X — Y</title>` e `<meta content="X — Y">` em `docs/html/conventions/advanced/seo.md` e `visual-density.md`, conteúdo didático intencional). Substituições contextuais: dois-pontos para aposto/elaboração, vírgula para conexão tight, parênteses para aside, split em duas frases para ideias distintas. Padrão `<summary>❌ Ruim — X</summary>` virou `<summary>❌ Ruim: X</summary>` em todos os blocos `<details>`. Clichés "contar a história por si só" e "micro-história" substituídos por frase concreta ("quando o nome carrega a intenção, o comentário deixa de fazer falta"). Audit `npm run audit:docs` clean: 2327 blocos Good em 373 arquivos, 0 violações

## [1.28.8] - 2026-05-11

### Changed

- `docs/**` — remoção de `<br>` redundantes em 293 arquivos: o `<br>` colado logo após `</summary>` (gerava linha em branco extra dentro do `<details>`) e o `<br>` separador entre blocos `</details>` e `<details>` consecutivos (já havia linha em branco). Blocos de exemplo agora abrem e separam apenas com whitespace markdown padrão.

## [1.28.7] - 2026-05-11

### Changed

- `docs/{csharp,typescript,python,java,kotlin,swift,dart,go,rust,ruby,php,vbnet,sql,nosql,css,html}/conventions/visual-density.md` — **doc canônica de densidade visual reescrita nas 16 linguagens** espelhando o JS canônico (regras: Explaining Return tight, Declaração + guarda com critério visual inline-vs-bloco, Multi-linha pede respiro depois, Ifs consecutivos cenário B, Sem column alignment, Fragmentos → montagem, par semântico encadeado, órfão de 1, atomic trio, fases de método, testes). Cada linguagem com exemplos idiomáticos (C# `var`, Python `=`/PEP 8, Java builders + switch expressions, Kotlin lambdas + `?:`, Swift `guard let`, Dart cascade, Go `err != nil`, Rust `Ok()`/`?`/`let else`, Ruby postfix-`if`/blocks, PHP enum match, VB.NET `If Then`, SQL/NoSQL pipelines, CSS rulesets, HTML landmarks). Tabela `**termo-en** (tradução pt-br)` mantida em Conceitos fundamentais
- `docs/csharp/conventions/**` + `scripts/**` — 16 arquivos: 12 Explaining Return tight, 4 trios atômicos, 5 testes AAA reorganizados (`async.cs`, `methods.cs`, `test/testing.{xunit,mstest,nunit}.cs`)
- `docs/typescript/conventions/**` + `scripts/**` — 15 arquivos: 19 Explaining Return tight + blank após side effects, trio inline guards em `error-handling.md`
- `docs/python/conventions/**` + `frameworks/**` — 15 arquivos: ~25 Explaining Return tight, blank antes de blocos guarda em `control-flow.md` e `functions.md` (`is_valid`, `process_order`)
- `docs/java/conventions/**` + `frameworks/spring.md` + `scripts/**` — 14 arquivos: 11 blanks antes de return após multi-linha, 6 column alignments removidos (switch arrows `case X    ->`)
- `docs/kotlin/conventions/**` — 8 arquivos: 4 Explaining Return tight, 3 lambdas/builders multi-linha com blank depois
- `docs/swift/conventions/**` — 4 arquivos: 4 blanks após guard/dict multi-linha em `control-flow.md`, `error-handling.md`, `testing.md`
- `docs/dart/conventions/**` + `frameworks/flutter/**` + `README.md` — 4 arquivos: 1 Map multi-linha, 1 chamada `_channel.invokeMethod` multi-linha, 1 âncora morta corrigida
- `docs/go/conventions/**` + `setup/project-foundation.md` — 15 arquivos: 25 Explaining Return tight em métodos de repository, validators, observability helpers
- `docs/rust/conventions/**` + `setup/**` + `frameworks/blockchain.md` — 14 arquivos: 8 `Ok(x)` tight, walls 4→2+2 em `variables.md` e `setup/project-foundation.md`, column alignment removido em `control-flow.md`
- `docs/ruby/conventions/**` + `frameworks/rails.md` — 9 arquivos: 6 Explaining Return tight, 5 column alignments removidos (scopes, traits, case/when)
- `docs/php/conventions/**` + `setup/**` + `README.md` — 15 arquivos: ~30 violações corrigidas (Explaining Return + column alignment em enum cases/match), âncora morta corrigida
- `docs/vbnet/conventions/**` + `setup/**` + `scripts/**` — 17 arquivos: 48 violações corrigidas (Explaining Return fragmentado + par semântico encadeado partido)
- `docs/sql/conventions/**` + `sgbd/{sql-server,sqlite,postgres}.md` — 10 arquivos: 24 column alignments removidos em CREATE TABLE/CREATE INDEX/JOIN ON. Regras de Explaining Return e Declaração+Guarda descartadas (não aplicáveis a SQL declarativo); regra "4+ statements homogêneos quebra em 2+2" adaptada para ALTER/CREATE INDEX
- `docs/nosql/conventions/**` + `sgbd/**` + `scripts/{mongodb,redis}/**` — 12 arquivos: 13 Explaining Return tight em repositórios (`findById`, `updateManager`, `softDelete`, `purgeExpired`, Redis hashes/sets)
- `docs/css/conventions/**` + `scripts/variables.css` — 3 arquivos: column alignments removidos em tokens semânticos, primitivos neutros, tema dark. Regras descartadas (não aplicáveis a CSS declarativo): Explaining Return, par semântico, fragmentos → montagem, declaração + guarda
- `docs/html/conventions/**` + `scripts/structure.html` — 6 arquivos: landmarks com blank entre `<header>`/`<main>`/`<footer>`, twitter cards reorganizadas em 2+2, lazy `<img>` em 1+3 (hero+trio)
- `docs/{csharp,java}/conventions/visual-density.md` — 2 últimos `❌ no-logic-in-return`: `BuildOrderResponse`/`buildOrderResponse` extraem `response`/`new OrderResponse(...)` em variável nomeada antes do return (audit `npm run audit:docs` finalizou limpo: 2327 blocos Good em 373 arquivos)

## [1.28.6] - 2026-05-11

### Changed

- `docs/javascript/conventions/visual-density.md` + `docs/shared/standards/visual-density.md` — regra **Explaining Return** refinada: `return` tight com a `const` imediatamente acima sempre que essa linha for single-line e nomeie o valor retornado, independente de quantos passos haja acima (antes a regra antiga "2+ passos → blank" criava falsos positivos). Novas seções: `## Multi-linha: respiro depois do bloco` (objeto/array/statement quebrado em várias linhas pede blank depois), `## Ifs consecutivos: blocos com chaves precisam de respiro` (cenário B + exceção do trio atômico para guardas inline), `## Sem alinhamento de coluna` (espaço único, sem padding artificial), `## Fragmentos → montagem` (blank antes do consumidor que costura múltiplos fragmentos, em contraste com par semântico encadeado)
- `docs/javascript/conventions/visual-density.md` + `docs/shared/standards/visual-density.md` — regra **Declaração + guarda** refinada com critério **visual**: guarda inline (`if (...) return;`) forma par tight com a `const` acima; guarda em bloco `{ }` (qualquer corpo, mesmo uma única instrução) vira fase própria e pede blank antes. Adicionado terceiro exemplo Bom mostrando bloco com instrução única
- `docs/javascript/conventions/visual-density.md` — `Conceitos fundamentais` ganha `tight pair`, `atomic trio`, `semantic pair`, `multi-line block`, `fragments → assembly`, `column alignment`; tabela do shared traduz todos os termos no corpo (mantendo `**termo-en** (pt-br)` na coluna Conceito como padrão canônico)
- `docs/javascript/conventions/functions.md` — 9 violações corrigidas: `issueInvoice`, `buildLineItems`, `getOrderSummary`, `calculateTotals`, `formatSummary`, `buildGreeting`, `buildShippingLabel`, `buildConfirmationEmail` viraram Explaining Return tight; `fetchProduct` ajustado (declaração + guarda inline tight)
- `docs/javascript/conventions/advanced/error-handling.md` — `findUser` ajustado (declaração + guarda inline tight); `findProductById` preserva blank antes do `if` bloco (guarda multi-linha com throw expandido)
- `docs/javascript/conventions/advanced/validation.md` — `validateOrderRules` ganha blank entre os dois `if` quebrados em múltiplas linhas (regra de statement multi-linha pedindo respiro)
- `docs/javascript/scripts/{variables.js,test/testing.jest.js,test/testing.node.js,test/testing.vitest.js}` — 4 console.logs em `variables.js` quebrados em 2+2; nos 3 arquivos de teste, `applyDiscount` refatorado para Explaining Return e cada `it`/`test` reorganizado para eliminar órfãos de 1 linha do padrão AAA
- `docs/shared/standards/null-safety.md` — `buildOrder` e `getEffectivePriority` viraram Explaining Return tight
- `docs/shared/architecture/frontend-flow.md` — `loadOrderDetail` e `OrderDetailPage` viraram Explaining Return tight; `submitOrder` recuperou blank antes do `if` bloco
- `docs/shared/architecture/backend-flow.md` — `dispatchWebhookEvent` preserva blank antes do `if` bloco multi-linha (log + return)
- `docs/shared/platform/api-design.md` — 7 funções alinhadas: `buildEnvelope` e `buildErrorEnvelope` ganham blank após `meta` multi-linha + Explaining Return tight; `registerOrdersController`, `createOrderHandler.handle`, `parseOrderRequest`, app.post boundary, `findOrderByIdHandler.handle`, `handle(id)` e `app.get '/api/orders/:id'` recebem blank antes dos `if` bloco e Explaining Returns tight quando aplicável
- `docs/shared/platform/performance.md` — `loadOrdersWithCustomers` 4 declarações reorganizadas em 2+2 semântico (carregar+extrair / carregar+indexar)

## [1.28.5] - 2026-05-10

### Fixed

- `.github/workflows/docs.yml` — bump de 6 actions para majors que rodam em Node 24, eliminando warnings de deprecation de Node 20 antes da força-migração do GitHub em 2/jun/2026: `actions/checkout@v4→v6` (2x), `actions/configure-pages@v5→v6`, `actions/setup-node@v4→v6`, `actions/cache@v4→v5`, `actions/upload-pages-artifact@v3→v5`, `actions/deploy-pages@v4→v5`. `node-version: 24` (Active LTS até abr/2028) mantido; `pnpm/action-setup@v4` permanece (sem deprecation)
- `docs/javascript/conventions/naming.md` — parágrafo de abertura reescrito sem forçar metáfora: "Nomear bem as coisas ajuda o programador a ler e entender o código". A referência a **API** (Application Programming Interface) fica restrita a funções e módulos, onde o termo é tecnicamente correto. Variável local não é API; o texto antigo confundia o programador iniciante

## [1.28.4] - 2026-05-10

### Added

- `docs/javascript/conventions/functions.md` — nova seção `## Arrow function — preservar this em callbacks`: 3 pares Ruim/Bom mostrando como `() => {}` evita confusão com `this` (callback em `forEach`, `setInterval` em classe, e o caso inverso de arrow indevida como método de objeto). Descritivo pedagógico com causa-raiz ("`this` é decidido por quem chama"), comparação `function` vs arrow em bullets paralelos, e regra prática (arrow em callback / shorthand em método). Termos EN com tradução PT na primeira ocorrência: callback, strict mode, arrow function, lexical, method shorthand, call site

### Changed

- `.github/workflows/docs.yml` — copiar `assets/` para o renderer (`cp -r code-style/assets docs-renderer/assets`); resolve as imagens referenciadas via `../../../assets/...` em `docs/shared/process/ci-cd.md`, `docs/shared/platform/integrations.md` e `docs/css/conventions/formatting.md`

## [1.28.3] - 2026-05-10

### Changed

- `docs/shared/standards/visual-density.md` — refatoração: removido o vocabulário "atomic/atômico" (`atomic block`, `linhas atômicas`, `trio atômico`, `atomics`); substituído por terminologia transparente (`tight pair` → par grudado; `tight trio` → trio grudado; "três declarações simples"); explicações reescritas em voz mais direta; padrão EN→PT explícito em todos os conceitos
- `docs/shared/` — gaps R3/R3b zerados (26 → 0): expansão `**SIGLA** (English, PT)` na primeira ocorrência em color-theory (WCAG/OKLCH/UI/AAA), testing (SQL), mobile/{navigation,offline-first,state-management} (URL/UI), platform/{bots,bots-advanced} (callback/UI/API/REST/URL/HTTP/Secret), platform/iot (IoT/CPU), platform/integrations (API/REST/CI/CD/XML/ISO/RTS/CTS/UX em linha única para o padrão capturar)
- `docs/**/*.md` + `docs/**/*.java` — 3025 substituições em 299 arquivos: `❌ Bad` → `❌ Ruim`, `✅ Good` → `✅ Bom`. Classificação dos blocos pelos auditores continua via emoji ✅/❌, então `audit:docs` segue limpo

## [1.28.2] - 2026-05-09

### Changed

- `docs/<lang>/` e `docs/shared/` — `## Conceitos fundamentais` replicado em todas as 18 linguagens + shared (~200 arquivos editados): csharp+vbnet (37), typescript (16), java+python (29), php+sql+nosql (28), html+css (17), shared (24), dart+go+kotlin (43), ruby+rust+swift (44). Padrão: `**termo-en ou sigla** (tradução pt-br)` no campo "Conceito"; bold sempre EN, parens sempre PT
- Padronização de termos transversais: `**AAA** (Arrange, Act, Assert — Arranjar, Agir, Atestar)` em 12 arquivos (cognato direto de "Arrange", preserva o A do mnemônico); `**DTO** (Data Transfer Object, Objeto de Transferência de Dados)` consolidado em 11 arquivos; `validação de schema` → `validação de esquema` em 4 arquivos
- Auditoria final: `audit-concepts.py` 0 MISSING / 0 NO-PARENS / 0 PT-IN-BOLD em 355 arquivos com a seção; `npm run audit:docs` 2113 blocos Good em 373 arquivos

### Added

- `.ai/tooling/scripts/audit-concepts.py` — auditoria SSOT da seção Conceitos fundamentais por linguagem (`python3 .ai/tooling/scripts/audit-concepts.py <lang...>`)

## [1.28.1] - 2026-05-09

### Changed

- `docs/javascript/` — `## Conceitos fundamentais` em todos os arquivos técnicos (12 adicionados, 7 já existiam): conventions/ (variables, naming, functions, control-flow, visual-density), conventions/advanced/ (error-handling, null-safety, observability, performance, testing, validation), frameworks/bot/whatsapp.md
- `docs/javascript/` — padronização de termos: `fronteira/fronteiras` → `limite/limites` (8 ocorrências); `mutável/imutável/mutabilidade` → `pode mudar / não muda / fixo / valor pode ser alterado` (3 ocorrências)
- `docs/javascript/` — todas as 132 linhas de Conceitos fundamentais em 19 tabelas seguem o padrão `**termo-en ou sigla** (tradução pt-br)`; descrições de `mock` (dados fictícios), `stub`, `spy` revisadas

## [1.28.0] - 2026-05-07

### Added

- `docs/shared/standards/color-theory.md` — guia conceitual transversal de teoria das cores (8 seções): Conceitos fundamentais (OKLCH, matiz, croma, luminosidade, gamut, APCA), Círculo cromático e OKLCH (perceptualmente uniforme; quentes/frias/temperatura), Harmonias (complementar, análoga, triádica, split-complementar, tetrádica, quadrada, neutros), Composição (60-30-10, hierarquia por contraste, contraste de luminosidade vs. temperatura, espaço em branco como cor), WCAG (1.4.3, AA/AAA, proporção de contraste, OKLCH ↔ WCAG, APCA, 1.4.6, 1.4.11), Hierarquia de superfícies (background/surface/card/popover/foreground, ΔL mínimo 0.05-0.08, sombras tonalizadas), Light/Dark themes (fundos não-pretos, off-white em dark, saturar destaques no escuro, bordas sutis), Escala tonal 50-950 (combos testados, regra de 4 paradas, parada 500, cuidados com amarelos/cianos)
- `README.md` raiz — entrada "Color Theory" na tabela Standards
- `REFERENCES.md` — nova seção "Cor e Acessibilidade Visual" (13 links: oklch.com, Evil Martians, MDN oklch, WCAG 1.4.3, WCAG 1.4.11, WebAIM Contrast Checker, APCA Calculator, Adobe Color, Smashing Magazine, Material Design 3, Refactoring UI, Tailwind v4 Colors, shadcn/ui Themes)

### Changed

- `docs/shared/standards/ui-ux.md` — seção "Temas Claro e Escuro" enxugada (24 → 17 linhas) com cross-link para `color-theory.md` como SSOT de OKLCH, harmonias, escala tonal e estratégias light/dark

## [1.27.0] - 2026-05-07

### Added

- `docs/typescript/frameworks/vue.md` — guia Vue 3.5 LTS + Nuxt 4.4 + Pinia 3 (1071 linhas, 13 seções): Conceitos fundamentais, Fluxo de Operação (Vue puro SPA + Nuxt fullstack), Estrutura de pastas, SFC com `<script setup>`, Composition API + reactive props destructuring (Vue 3.5), Smart/Dumb Components + `defineModel`, Composables, Pinia 3 setup syntax, Route Middleware do Nuxt, Formulários com Zod + Server Route, Server Routes (`defineEventHandler`, `readValidatedBody`), Webhook Handler (HMAC, `timingSafeEqual`, idempotência), Caching (`defineCachedEventHandler`, `useFetch`)
- `docs/typescript/README.md` — linha "Vue + Nuxt" na tabela `## Frameworks`
- `README.md` raiz — badges Vue 3.5 LTS e Nuxt 4.4 na linha Frontend
- `REFERENCES.md` — seção "Vue e Nuxt" (12 links: Vue.js docs, API, Releases, `<script setup>`, Composition API, Pinia, Nuxt 4, server directory, useFetch, Nitro caching, Vite, VueUse)

## [1.26.0] - 2026-04-27

### Added

- `docs/java/` — skeleton completo: README, quick-reference, setup×2, conventions×6 (naming, variables, control-flow, methods, visual-density, types), advanced×8 (error-handling, async, null-safety, testing, performance, observability, validation, dates)
- `docs/java/frameworks/spring.md` — Spring Boot 4.0: @RestController, DI, Spring Data JPA, @ControllerAdvice, paginação, Actuator
- `docs/java/setup/security.md` — Spring Security 7: BCrypt, JWT, @PreAuthorize, CORS explícito
- `REFERENCES.md` — seção Java e Spring (20 links, versões abril 2026)
- README raiz — badges Java 25 LTS e Spring Boot 4.0; tabela Linguagens com Java

### Fixed

- `docs/java/conventions/control-flow.md` — early return guard clause dogfood (variável nomeada antes do return)
- `docs/java/frameworks/spring.md` — `OrderResponse.from()` dogfood (resultado nomeado antes do return)
- `docs/java/setup/security.md` — `passwordEncoder()` dogfood (variável nomeada antes do return)

## [1.25.0] - 2026-04-26

### Added

- `docs/ruby/` — skeleton completo: README, quick-reference, setup×2, conventions×6 (naming, variables, control-flow, methods, visual-density, types), advanced×7 (error-handling, async, testing, performance, observability, validation, dates)
- `docs/ruby/frameworks/rails.md` — Rails 8.0: MVC, controller thin, ActiveRecord, Strong Parameters, migrations, rotas RESTful, Solid Queue, auth generator, Concerns
- `REFERENCES.md` — seção Ruby e Rails (17 links, versões abril 2026)
- README raiz — badges Ruby 4.0 e Rails 8.0; Backend reordenado: linguagem colada ao(s) framework(s)

## [1.24.0] - 2026-04-26

### Added

- `docs/rust/` — skeleton completo: README, quick-reference, setup×2, conventions×6 (naming, variables, control-flow, functions, visual-density, types), advanced×8 (error-handling, async, null-safety, testing, performance, observability, validation, dates)
- `docs/rust/frameworks/blockchain.md` — Solana/Anchor 1.0: modelo de programa, accounts, instrução BAD/GOOD em Rust
- `docs/shared/platform/iot.md` — padrões de domínio IoT com MicroPython 1.28: naming de sensores, debounce, FSM, alertas idempotentes, watchdog, polling vs IRQ
- `docs/python/conventions/advanced/micropython.md` — diff da stdlib CPython, restrições de hardware, asyncio, boas práticas
- `REFERENCES.md` — seções Rust 1.95, Blockchain/Solana, IoT/MicroPython (26 links, versões abril 2026)

### Fixed

- `docs/rust/conventions/control-flow.md` — reescrito na ordem canônica simples→complexo (if/else · if expressão · ? · if let/let-else · lookup · match · circuit break · for · while · loop)
- `docs/rust/conventions/advanced/testing.md` — seção `assert` com `PartialEq + Debug`; AAA documentado
- `docs/shared/platform/iot.md` — debounce: `antirrepique` → `filtragem de ruído`
- `docs/shared/standards/control-flow.md` — Rust adicionado em Veja também
- AAA — `Arrumar, Agir, Atestar` padronizado em 11 arquivos (anteriormente: Preparar/Executar/Verificar, Preparar/Agir/Verificar, sem tradução)

## [Unreleased]

### Added

- `docs/shared/platform/integrations.md` — GraphQL: intro conceitual sobre grafos (nós, arestas), mini-grafo ASCII (Pedido → Cliente/Itens), schema Countries API como imagem, BAD/GOOD com query nomeada e variável de servidor

### Fixed

- `docs/javascript/conventions/control-flow.md` — 3 seções reordenadas de BAD BAD GOOD GOOD para BAD GOOD BAD GOOD: circuit break, for...of, while
- `docs/csharp/conventions/control-flow.md` — 3 seções reordenadas de BAD BAD GOOD GOOD para BAD GOOD BAD GOOD: switch expression, circuit break, while
- `docs/go/conventions/control-flow.md` — `idx` renomeado para `index` em exemplo Good (banned abbreviation)
- `README.md` — badges reorganizados em tabela semântica (Área | Stack): Frontend, Backend, Mobile, Banco de dados, Bots & Integrações, Padrões; SQL separado em SQL Server 2025, PostgreSQL 18 e SQLite 3.53 com logos individuais

## [1.23.0] - 2026-04-26

### Added

- `docs/kotlin/` skeleton completo — Kotlin 2.2 (K2 compiler): README, quick-reference, setup/tooling, conventions/{naming,variables,control-flow,methods,visual-density,types}, advanced/{async,coroutines,error-handling,null-safety,performance,testing,validation,dates,observability}
- `docs/swift/` skeleton completo — Swift 6.1 (strict concurrency, actors, Sendable): README, quick-reference, setup/tooling, conventions/{naming,variables,control-flow,functions,visual-density,types}, advanced/{concurrency,error-handling,null-safety,performance,testing,validation,dates,observability}
- `docs/dart/` skeleton completo — Dart 3.7 (null safety, records, patterns, streams): README, quick-reference, setup/tooling, conventions/{naming,variables,control-flow,functions,visual-density,types}, advanced/{async,streams,error-handling,null-safety,performance,testing,validation,dates,observability}
- `docs/dart/frameworks/flutter/` — Flutter 3.29 (framework dentro de Dart): README, quick-reference, conventions/widgets, advanced/{state-management,navigation,platform-channels,testing}; cross-links `shared/mobile/`
- `README.md` — badges Kotlin 2.2, Swift 6.1, Dart 3.7, Flutter 3.29; tabela de linguagens atualizada
- `REFERENCES.md` — seções Kotlin, Swift, Dart e Flutter (28 links: docs oficiais, coding conventions, linters, frameworks de teste, pub.dev)
- `docs/kotlin/conventions/control-flow.md` — `## if-expression` (ternário Kotlin via if/else expressão, limite 2 alternativas, escalada para `when`)
- `docs/swift/conventions/control-flow.md` — `## Ternário` (? : para 2 valores, ternário aninhado → switch) e `## Dictionary como lookup` (chaves dinâmicas + ?? fallback)
- `docs/dart/conventions/control-flow.md` — `## Ternário` (? : para 2 valores, aninhado → switch expression) e `## Map como lookup` (const Map + ?? fallback)

### Fixed

- `docs/kotlin/conventions/methods.md` — helpers SLA com lógica no `return` convertidos para single-expression syntax (`=`) — dogfood explaining return
- `docs/swift/conventions/functions.md` — `generateReport` GOOD: construtor `Report(...)` extraído para `let report` antes do return
- `docs/swift/conventions/advanced/performance.md` — `findTopSpenders` GOOD: conversão `Array(topSpenderNames)` extraída para `let topSpenders` antes do return
- `docs/swift/conventions/visual-density.md` — chains GOOD: `Array(recentPaidSummaries)` extraído para `let recentPaid` antes do return
- `docs/dart/conventions/visual-density.md` — chains GOOD: `.take(5).toList()` extraído para `final recentPaid` antes do return
- `docs/dart/conventions/advanced/validation.md` — `validateProfile` GOOD: list comprehension `[if (...) ...]` extraída para `final profileErrors` antes do return
- `docs/dart/frameworks/flutter/README.md` — 5 links `../../../../shared/mobile/` corrigidos para `../../../shared/mobile/`
- `docs/kotlin/conventions/control-flow.md`, `docs/swift/conventions/control-flow.md`, `docs/dart/conventions/control-flow.md` — seções reordenadas de simples para complexo (ternário/guards → switch/lookup → pattern matching → loops)
- `.ai/tooling/scripts/audit-docs.mjs` — lint auto-fix (trailing comma + semantic-spacing)

## [1.22.1] - 2026-04-25

### Fixed

- `docs/go/` — dogfood strict nos Good examples: construtores inline extraídos para variável nomeada (`NewOrderService`, `NewOrderIndex`, `newFakeOrderRepository`, `NewRepository`); chamadas de função no return extraídas (`processOrder`, `g.Wait`, `http.ListenAndServe`, `context.WithValue`, `http.HandlerFunc`, `scheduledAt.UTC`); bug real em goroutines errgroup corrigido (`fmt.Errorf("...: %w", nil)` sempre produzia erro não-nil); variável intermediária `customerResult` removida
- `docs/php/conventions/functions.md` — BAD example para arrow functions (closures com `use` explícito vs `fn() =>`); BAD example para stepdown rule (helpers antes do orquestrador); VD tight em explaining return (`$summary` + `return` sem blank); quebra de linha em `usort` (> 80 chars)

## [1.22.0] - 2026-04-25

### Added

- `docs/go/` — skeleton completo Go 1.26: `README.md` (badges + tabela de convenções), `quick-reference.md` (cheat-sheet naming/booleans/verbos/taboos/controle de fluxo/erros/goroutines), `setup/project-foundation.md` (go.mod, toolchain, estrutura de diretórios, Config, entry point, domain packages), `setup/security.md` (secrets via env, prepared statements `$1`, context timeout, validação na fronteira), `conventions/naming.md` (PascalCase/camelCase, prefixo Err, naming order, domain-first, booleanos), `conventions/variables.md` (`:=` vs `var`, zero values, magic values, iota enums, imutabilidade, blank identifier), `conventions/control-flow.md` (guard clauses, no else after return, switch, for, defer, type switch), `conventions/methods.md` (functions vs methods, value vs pointer receivers, SLA, explaining return, named params via struct, stepdown), `conventions/visual-density.md` (parágrafo de intenção, explaining return, struct grouping, import grouping), `conventions/types.md` (interfaces at consumer, structs como domain types, named types, embedding, generics, type assertions, compile-time verification), `conventions/advanced/error-handling.md` (error as value, `%w` wrapping, sentinel errors, custom error types, panic para invariantes, fronteira HTTP), `conventions/advanced/async.md` (`context.Context` propagation, `context.WithTimeout`, `errgroup` para chamadas paralelas), `conventions/advanced/concurrency.md` (goroutines + WaitGroup, channels, select com timeout, RWMutex, sync.Once, worker pool), `conventions/advanced/null-safety.md` (nil pointer check, zero value vs pointer, map nil panic, interface nil trap, ok idiom), `conventions/advanced/testing.md` (table-driven tests, `require` vs `assert`, fake in-memory repo, error path, t.Helper), `conventions/advanced/observability.md` (`log/slog` JSON handler, structured logging, correlation ID via context, PII avoidance), `conventions/advanced/performance.md` (benchmarks com -benchmem, escape analysis, pre-alloc slices, sync.Pool, strings.Builder, N+1 avoidance), `conventions/advanced/validation.md` (go-playground/validator tags, structured ValidationResponse, custom tags, path/query params), `conventions/advanced/dates.md` (time.Time com timezone explícito, RFC 3339, `*time.Time` opcional, duration constants, truncation para DB)
- `docs/php/` — skeleton completo PHP 8.4: `README.md` (badges + tabela), `quick-reference.md`, `setup/project-foundation.md` (Composer, PSR-12, PHPStan level 9, strict_types), `setup/security.md` (secrets env fail-fast, PDO prepared statements, htmlspecialchars, ARGON2ID, CSRF), `conventions/naming.md` (PSR-1/PSR-12), `conventions/variables.md` (readonly, typed properties, property hooks 8.4, constants), `conventions/control-flow.md` (strict `===`, guard clauses, match, nullsafe `?->`, null coalescing `??`), `conventions/functions.md` (SLA, named arguments, explaining return, max 3 params), `conventions/visual-density.md`, `conventions/types.md` (union types, backed enums, readonly classes, `never`), `conventions/advanced/error-handling.md` (domain exception hierarchy, try/catch nas fronteiras, finally), `conventions/advanced/traits.md` (traits coesos, métodos abstratos, conflito insteadof/as, tabela trait vs interface vs composição), `conventions/advanced/async.md` (workers/queues, Fiber, Revolt/Amp, CURLOPT_TIMEOUT), `conventions/advanced/null-safety.md` (nullable types, `?->`, `??`, null para ausência vs exceção para falha), `conventions/advanced/testing.md` (PHPUnit 11, `#[DataProvider]`, AAA, createMock, expectException), `conventions/advanced/observability.md` (Monolog + JsonFormatter, PSR-3 LoggerInterface, structured context, correlation ID via Processor), `conventions/advanced/performance.md` (OPcache, N+1 com batch loading, generators, lazy objects PHP 8.4, implode), `conventions/advanced/validation.md` (Symfony Validator attributes, structured error response, custom constraints, `#[Assert\Valid]`), `conventions/advanced/dates.md` (`DateTimeImmutable` vs `DateTime`, timezone explícito, createFromFormat, ISO 8601 serialization)
- `README.md` — badges Go e PHP + linhas nas tabelas de linguagens
- `.ai/tooling/scripts/audit-docs.mjs` — exceção `GO_IDIOMATIC_ABBREVIATIONS` (`ctx`, `req`) na regra `banned-abbreviations` para blocos de código Go

## [1.21.0] - 2026-04-25

### Added

- `docs/shared/mobile/` — subdomínio de fundamentos cross-platform: `README.md` (nativo vs cross-platform, mapa de tópicos), `app-lifecycle.md` (estados, cold/warm start, process death), `navigation.md` (stack, tab bar, modal, deep link, back stack), `state-management.md` (UI state vs domain state, unidirectional data flow, reatividade), `offline-first.md` (cache strategy, sincronia, conflict resolution, optimistic update, network-aware UX), `permissions.md` (runtime permissions, graceful degradation, permanently denied). Badge Mobile + tabela em `README.md`

## [1.20.1] - 2026-04-24

### Added

- `docs/shared/ai/security.md` — boas práticas contra prompt injection: tipos de ataque (direct injection, indirect injection, jailbreak, prompt leaking), 5 mitigações com exemplos BAD/GOOD em `<details><summary>`, tabela de erros comuns. Cross-links em `README.md` e `prompts.md`

## [1.20.0] - 2026-04-24

### Added

- ESLint v9 flat config (`eslint.config.mjs`) com SDG custom rules: `local/semantic-spacing`, `local/no-boolean-comparison`, `local/no-inline-assert`, `local/blank-before-assertion` (test files); `curly: all`, `no-nested-ternary`, `multiline-ternary`, `operator-linebreak`, `padding-line-between-statements`. `sdgTestConfig` wired para `**/*.test.*` e `**/*.spec.*`. Node.js globals + Jest globals para arquivos de teste. `docs/` incluída no lint (sem ignore). `printWidth: 80` enforça quebra de chains longas via Prettier. Script `npm run lint`. `.vscode/settings.json` com `formatOnSave` + `source.fixAll.eslint`

## [1.18.0] - 2026-04-24

### Added

- `docs/shared/platform/bots.md` — guia conceitual agnóstico de linguagem: webhook vs polling, command routing com Strategy Map, session state (opções em tabela: in-memory/Redis/DB), rate limits (global vs per-user, janela deslizante), lifecycle de shutdown limpo. `## Conceitos fundamentais` com 11 termos (Bot, Gateway, Event, Command, Handler, Webhook, Polling, Rate limit, Session, Intent, Callback). Cross-links para `bots-advanced.md`, `messaging.md`, `api-design.md`
- `docs/shared/platform/bots-advanced.md` — primitivas específicas por plataforma: Discord (tabela Gateway Intents, fluxo de registro de Slash Commands, limites de Embed), Telegram (setup BotFather, polling vs webhook, tipos de Inline Keyboard, tabela de tipos de chat), WhatsApp (tabela oficial vs não-oficial, janela de 24h da Business API, verificação de webhook). `## Conceitos fundamentais` com 9 termos (Gateway Intent, Slash Command, Embed, Inline Keyboard, BotFather, Bot Token, Business API, Unofficial Client, Template Message). Cross-links para `bots.md`
- `docs/javascript/frameworks/bot/discord.md` — discord.js v14.19 com Node.js 22: import via `Events`/`GatewayIntentBits` enum (sem strings literais), `REST({ version: '10' })` + `SlashCommandBuilder`, `isChatInputCommand()` type guard, `deferReply`/`editReply` para operações assíncronas, `EmbedBuilder` + `{ embeds: [embed] }` array syntax, eventos `GuildMemberAdd`/`MessageReactionAdd` com guards de null e bot
- `docs/javascript/frameworks/bot/telegram.md` — Telegraf v4.16 com Node.js 22: `context` (sem abreviação `ctx`), `message` filter de `telegraf/filters`, separação compute/format/action, `answerCbQuery` obrigatório após callback, `bot.createWebhook()` com `secretToken` e shutdown limpo
- `docs/javascript/frameworks/bot/whatsapp.md` — Baileys v7 (ESM-only, `makeWASocket` como default export, reconnect automático, guard `fromMe`, Strategy Map) + Meta Cloud API v21.0 (fetch nativo Node.js 22, verificação `hub.mode`+`hub.verify_token`, 200 imediato antes de processar, Template Messages)
- `docs/javascript/README.md` — seção `## Frameworks` com tabela cobrindo discord.js, Telegraf e Baileys/Meta Cloud API
- `README.md` — badge Discord (discord.js), Telegram (Telegraf), WhatsApp (Baileys | Meta API); linha `Bots` na tabela Plataforma

## [1.17.2] - 2026-04-23

### Fixed

- Estrutura pedagógica em 136 arquivos de `docs/`: 330 gaps zerados em ciclo único (ciclos A+B+C+D fundidos do relatório `audit-pedagogical-structure.md`). R1×25 (parágrafos de intro após H1), R2×18 (seções `## Conceitos fundamentais` + tabela), R3×248 (siglas `**SIGLA** (English, PT)` na 1ª ocorrência), R3b×38 (não-siglas `**termo** (tradução)`), R4×1 (título com expansão completa → tradução curta). Zero toque em código, exemplos Good/Bad ou estrutura de arquivos. Audit final: 0 gaps em 182 arquivos; `audit:docs` mantém 0 violações em 1230 blocos Good / 201 arquivos

## [1.17.1] - 2026-04-23

### Added

- `.ai/tooling/scripts/audit-pedagogy.mjs` — auditor reusável de estrutura pedagógica em `docs/` (5 regras: R1 intro paragraph após H1, R2 `## Conceitos fundamentais` + tabela `\| Conceito \| O que é \|` quando há 3+ termos em inglês, R3 sigla na 1ª ocorrência `**SIGLA** (English, PT)`, R3b não-sigla `**termo** (tradução)`, R4 títulos com expansão completa). Catálogo embutido de ~100 siglas + ~50 termos. Filtros de ruído: code fences, tabelas (exceto intro válida), headings, blockquotes, cross-link items, backticks inline e expansões de outras siglas
- `.ai/backlog/audit-pedagogical-structure.md` — relatório de gaps por pasta: 330 gaps em 136 arquivos (de 182 auditáveis). Distribuição: R1×25, R2×18, R3×248, R3b×38, R4×1. Top 10 arquivos por densidade. Serve como input para ciclos `docs:` de correção
- `package.json` — script `audit:pedagogy`

## [1.17.0] - 2026-04-23

### Added

- `docs/shared/architecture/system-design.md` — guia conceitual leve: papel do System Design (raciocínio antes do código), requisitos funcionais vs não-funcionais, processo de decomposição (Entidades → Fluxos → Fronteiras → Contratos → Componentes), trade-offs essenciais em tabela (Consistência vs Disponibilidade, Latência vs Throughput, Simplicidade vs Escala, Custo vs Performance), quando começa e quando termina. Cross-links para scaling, patterns, methodologies, messaging, database, security
- `docs/shared/architecture/system-design-advanced.md` — instrumentos quantitativos: SLA/SLO/SLI e error budget, CAP (CP vs AP), PACELC (PA/EL, PC/EC, PC/EL, PA/EC), modelos de consistência (strong, sequential, causal, read-your-writes, eventual), back-of-the-envelope (cálculo QPS com referências de ordem de grandeza), sharding (range-based, hash-based, consistent hashing, directory-based), replicação (single-leader, multi-leader, leaderless com quórum `W + R > N`), particionamento vs replicação, checklist de System Design
- `docs/shared/process/design-thinking.md` — guia conceitual leve: papel do Design Thinking (raciocínio antes de decidir o que construir), 5 fases em tabela (Empathize → Define → Ideate → Prototype → Test) com técnicas para cada uma, HMW questions, fidelidade de protótipo (papel → wireframe → mockup), Design Thinking vs UI/UX (upstream vs downstream). Cross-links para ui-ux, methodologies, system-design
- `docs/shared/process/design-thinking-advanced.md` — técnicas estruturadas: Double Diamond (Discover → Define → Develop → Deliver), Service Blueprint em 4 camadas (customer actions, frontstage, backstage, support processes), Journey Map com dimensões (ação, objetivo, emoção, ponto de contato, fricção, oportunidade), técnicas de ideação (Crazy 8s, SCAMPER, Lotus Blossom, analogia forçada), estratégia de protótipo em 5 estágios, MVP vs MLP, Usability Testing (modalidades, think-aloud, métricas SUS/NPS/task success rate), checklist
- `README.md` — tabela Processo ganhou `Design Thinking` e `Design Thinking (avançado)`; tabela Arquitetura ganhou `System Design` e `System Design (avançado)`

## [1.16.0] - 2026-04-23

### Fixed

- `docs/shared/standards/visual-density.md` — SSOT refinado: nova regra "Explaining Return: par tight" (`const X = …; return X;` é par de 2 linhas sem blank entre declaração e return, blank antes do return só quando há 2+ passos antes); nova regra "Órfão de 1 linha: pior que trio atômico" (3 declarações atômicas consecutivas ficam juntas, 4+ viram 2+2); nova regra "Par semântico encadeado" (quando linha final depende da penúltima, ficam tight). Tabela de referência rápida reorganizada com 9 regras; BAD/GOOD em details/summary para cada refinamento
- `docs/shared/platform/api-design.md` — 9 blocos Good ajustados: pares `Result.fail + return failure` e `Result.ok + return success` agora tight; `mapErrorToStatus` (`const status = … ?? 500; return status;`) tight. Multi-step (`buildErrorEnvelope` + 2 linhas) mantém blank antes do return
- `docs/shared/platform/integrations.md` — `extractField` (CNAB240 fixed-width): par `const field = line.slice(...); return field;` tight
- `docs/shared/platform/performance.md` — `findHighestScore` (Math.max O(n)): par tight
- `docs/shared/standards/null-safety.md` — `calculateDiscount` com contrato garantido: par tight
- `docs/javascript/conventions/visual-density.md` — reestruturado para refletir SSOT refinado: subseções "Explaining Return: par tight", "Return separado: quando há 2+ passos antes", "Órfão de 1 linha: pior que trio atômico", "Par semântico encadeado"; 6 novos BAD/GOOD pairs em details/summary
- `docs/typescript/conventions/visual-density.md` — mesma estrutura refinada com exemplos TypeScript; anotações de tipo na mesma linha que a declaração
- `docs/csharp/conventions/visual-density.md` — estrutura refinada com exemplos em C# 13/.NET 10; exemplo de `DomainLimits` com `public const` para trio atômico
- `docs/vbnet/conventions/visual-density.md` — estrutura refinada com exemplos em VB.NET/.NET Framework 4.8; `Public Const` para trio atômico e `$"..."` strings de interpolação
- `docs/javascript/conventions/` — 20 blocos Good ajustados em functions.md, advanced/async.md, advanced/null-safety.md, advanced/error-handling.md, advanced/performance.md, control-flow.md, naming.md, variables.md
- `docs/typescript/conventions/` — 15 blocos Good ajustados em advanced/async.md, advanced/dates.md, advanced/performance.md, functions.md, narrowing.md; `docs/typescript/frameworks/` angular.md e react-nextjs.md também alinhados
- `docs/csharp/conventions/` — 20 blocos Good ajustados em advanced/{async,null-safety,performance,validation}.md, control-flow.md, methods.md, types.md; `docs/csharp/setup/` dapper.md e entity-framework.md também alinhados
- `docs/html/setup/javascript-vanilla.md` — 1 bloco ajustado (`createdOrder` tight)
- `docs/nosql/conventions/` e `docs/nosql/sgbd/` — 16 blocos ajustados em aggregation.md, performance.md, visual-density.md, cassandra.md, elasticsearch.md, mongodb.md, redis.md

### Added

- `.ai/tooling/scripts/audit-docs.mjs` — 2 regras novas: `density-explaining-return-blank` (flagra blank entre declaração única e return, ignora multi-step) e `density-orphan-single-line` (flagra declaração atômica isolada após par de atomics; ignora quando seguida de guard clause ou código não atômico; requer todos os 3 atomics serem literais simples sem `await` ou function call, evitando falsos positivos em fases de execução). Helpers `isAtomicDeclaration`, `isDeclarationBoundary`, `isSimpleLiteralAtomic`. Suporta `const`, `let`, `var`, `Dim`, `final`, `readonly`
- `.ai/tooling/scripts/audit-docs.test.mjs` — 6 testes novos cobrindo par tight aceito, blank em 1-prep flagrado, multi-step aceito, órfão atomic flagrado, split 2+2 aceito, fases com await aceitas. Total 23 testes passando
- Audit `docs/` 100% limpo: 0 violações em 1220 blocos Good, 197 arquivos

## [1.15.0] - 2026-04-23

### Added

- `docs/shared/platform/api-design.md` — novo SSOT do pipeline de API: BFF como boundary, pipeline linear (Controller thin → Handler → Service → Repository → Storage), Conceitos fundamentais (BFF, DTO, Envelope, Correlation ID, Result, Idempotência), contratos Request/Response com DTO e validação de schema, envelope `{ data, meta }` com shape padrão e tabela de campos, verbos REST e convenções de rota (kebab-case, plural, sem verbo na URL), status codes com distinção 400 vs 422, mapeamento Result → HTTP no boundary com tabela de códigos. Exemplos BAD/GOOD em JS

### Changed

- `docs/csharp/conventions/advanced/api-design.md` — seções `## Request e Response`, `## Response Envelope`, `## Verbos e rotas` e `## Status codes` removidas (agora SSOT em shared/platform/api-design.md); adicionada seção `## Contrato, envelope, verbos e status codes` com idioma C# (`record` com `required init`) e cross-link. Blockquote de escopo atualizado
- `docs/vbnet/conventions/advanced/api-design.md` — mesmas seções agnósticas removidas; adicionada seção com idioma VB.NET (`NotInheritable Class` com `ReadOnly` e construtor) e cross-link. Blockquote de escopo atualizado
- `README.md` — linha `API Design` adicionada na tabela Platform, entre o índice de Plataforma

## [1.14.2] - 2026-04-23

### Fixed

- `docs/shared/process/governance.md` — nova seção `## Normas de referência` entre Decision Records e Code Review: tabelas agrupadas por domínio (Linguagem normativa e datas: RFC 2119, ISO 8601; Protocolos HTTP e autenticação: RFC 7231/9110/6749/7519; Qualidade e segurança: ISO/IEC 25010/27001/27035, OWASP ASVS, OWASP Top 10; Versionamento e entrega: SemVer 2.0.0, Conventional Commits, Keep a Changelog) + parágrafo de fechamento articulando que desvio registrado em ADR tem valor equivalente à conformidade

## [1.14.1] - 2026-04-22

### Added

- `docs/shared/process/git-advanced.md` — novo arquivo transversal: rotina convencional com tabela de passos (pull → branch → commits → fetch/merge → PR → squash → deletar), squash no PR (GitHub Squash and merge + BAD/GOOD), DX no PR (tabela reviewer), troubleshooting semântico (O que não fazer, Inspecionando, Stash, Conflitos com a main, Recuperando commits via Reflog, Rebase como recuperação, Conflitos graves com fix branch, Corrigindo em produção, Revertendo deploy com git revert + tabela explicativa)
- `docs/shared/process/git.md` — linha squash na tabela de PRs + cross-link para git-advanced.md

## [1.14.0] - 2026-04-22

### Added

- `docs/shared/ai/` — nova seção transversal de IA com 9 arquivos: README (índice + nota sobre o que IA realmente é), models.md (Claude/GPT/Gemini/Llama/Mistral + Ollama + quantização GGUF), agents.md (Agent, Harness, Orchestration, Multi-agent, Memory), rag.md (RAG, Embeddings, Vector store, Chunking, variações), tools-mcp.md (Tool Use, Function Calling, MCP Protocol spec 2025-11-25), tokens.md (token, context window, custo por token com preços verificados, Prompt Caching), prompts.md (engenharia de prompts com 6 pares BAD/GOOD em details/summary), skills.md (Skills/Habilidades de agentes: routing, loading, composição), advanced.md (Fine-tuning, Hallucination com BAD/GOOD, Structured outputs, Extended thinking, Inference engines, AI Gateway com ferramentas atualizadas para 2026)
- `docs/shared/platform/integrations.md` — seção `## APIs de Modelos de IA` com BAD/GOOD para autenticação, streaming e retry com exponential backoff
- `README.md` — badge IA + seção `**IA (Inteligência Artificial)**` na tabela de Conceitos Compartilhados
- `docs/shared/architecture/patterns.md` — link para specdrivenguide.org substituindo referência ao `.ai/`

## [1.13.1] - 2026-04-22

### Fixed

- `docs/nosql/conventions/crud.md`: Explaining Returns — extraída `const modifiedCount`/`deletedCount` antes do `return` em 4 métodos GOOD (updateManager, deactivate, softDelete, purgeExpired); upsert `save` passa a retornar `{ wasInserted, modifiedCount }` em vez do resultado bruto do driver
- `docs/nosql/conventions/advanced/aggregation.md`: `$unwind` GOOD — `const rows` renomeado para `const teamsWithPlayers`; `$match` GOOD — removido comentário "what" `// filtra antes do join`
- `docs/nosql/conventions/naming.md`: `managerId: 'player:7'` corrigido para ObjectId hex realista
- `docs/nosql/scripts/mongodb/01-insert.js`: campo `managerId: null` removido do exemplo de uso (campo opcional não deve ser explicitado como null)
- `docs/nosql/scripts/redis/02-hashes.js`: `const raw` renomeado para `const hashFields`
- `docs/nosql/scripts/redis/04-sorted-sets.js`: removidos comentários "what" (`// maior score primeiro`, `// retorna: [...]`)
- `docs/nosql/scripts/redis/01-strings.js`: removido comentário "what" `// simulação de busca no banco primário`
- `docs/sql/conventions/formatting.md`: 2 GOOD examples — colunas `Id, Name, Email` qualificadas como `Users.Id, Users.Name, Users.Email`
- `docs/sql/conventions/crud.md`: UPDATE FROM GOOD — `Email` → `Users.Email`; UPDATE CASE GOOD — `StatusId` → `Orders.StatusId`; soft delete GOOD — `IsActive, InactivatedAt, Id` qualificados com `Users.`
- `docs/sql/conventions/advanced/advanced.md`: CTE GOOD — `TeamId, IsActive` qualificados como `Players.TeamId, Players.IsActive`
- `docs/sql/conventions/advanced/null-safety.md`: migration batch GOOD — `Priority` qualificado como `Orders.Priority`
- `docs/sql/conventions/advanced/procedures.md`: indentação dos comentários `-- Etapa X:` corrigida de 1 espaço para 2 espaços dentro do `BEGIN`
- `docs/sql/sgbd/postgres.md`: RETURNING UPDATE GOOD — `status` qualificado como `orders.status`

## [1.13.0] - 2026-04-22

### Added

- `docs/nosql/README.md`: índice da seção NoSQL — mapa de convenções, tabela de SGBD por caso de uso (80% → MongoDB + Redis; AWS → DynamoDB; escala → Cassandra; busca → Elasticsearch), conceitos fundamentais, cross-link para scripts
- `docs/nosql/quick-reference.md`: cheat-sheet tabular de dos/don'ts por SGBD (MongoDB, Redis, DynamoDB, Cassandra, Elasticsearch) + tabela de naming por contexto
- `docs/nosql/conventions/naming.md`: convenções de nomenclatura — collection/table (plural, snake_case/PascalCase por SGBD), fields (camelCase MongoDB, snake_case Cassandra/ES, PascalCase DynamoDB), Redis key namespace (`namespace:entity:id`), DynamoDB single-table design (`ENTITY#id`), index naming (`idx_`, `unq_`)
- `docs/nosql/conventions/crud.md`: padrões CRUD com BAD/GOOD — insertOne/insertMany, findOne/find com projeção, updateOne com `$set`, upsert com `$setOnInsert`, soft delete, purge; todos via repository pattern
- `docs/nosql/conventions/visual-density.md`: densidade visual para drivers JS — grupos semânticos, pipeline legível, estágios por propósito
- `docs/nosql/conventions/advanced/performance.md`: índices (quando criar/não criar), projeção obrigatória, N+1 com `$lookup`, TTL index + `expiresAt` no insert, checklist de investigação
- `docs/nosql/conventions/advanced/aggregation.md`: pipeline de agregação — ordem dos estágios, `$match` primeiro, `$group` com nomes de domínio, `$lookup` com pipeline interno, `$unwind` com `preserveNullAndEmptyArrays`
- `docs/nosql/sgbd/mongodb.md`: MongoDB 8.2 — conexão com pool singleton, insertOne/insertMany/bulkWrite, findOne/find/paginação, operadores de update, aggregation completo, createIndex (simples/composto/único/texto/TTL), diagnóstico com `explain()`
- `docs/nosql/sgbd/redis.md`: Redis 8.x — node-redis, Strings (SET/GET/INCR/MGET), cache-aside, Hashes (HSET/HGET/HGETALL/HMGET), Sorted Sets (ZADD/ZRANGE/ZREVRANK), Sets (SADD/SMEMBERS/SINTER/SDIFF), Lists, pub/sub com clientes separados, TTL, diagnóstico com redis-cli
- `docs/nosql/sgbd/dynamodb.md`: DynamoDB SDK v3 — `DynamoDBDocumentClient`, partition key design, single-table design (`ENTITY#id`), PutCommand/GetCommand/UpdateCommand/DeleteCommand/QueryCommand, GSI para access patterns, tabela de anti-padrões (Scan, hot spot, FilterExpression sem GSI)
- `docs/nosql/sgbd/cassandra.md`: Cassandra 5.x — keyspace, schema CQL com partition+clustering key, `prepare: true` obrigatório, consistency levels (LOCAL_QUORUM padrão), SELECT com LIMIT, UPDATE com IF EXISTS, TTL na inserção, batch para consistência entre tabelas, tabela de anti-padrões
- `docs/nosql/sgbd/elasticsearch.md`: Elasticsearch 8.x — mapping (text vs keyword), index/bulk, search (match/term/bool/range), aggregations com `size: 0`, update/deleteByQuery, tabela de anti-padrões (match em keyword, wildcard leading, aggregation em text)
- `docs/nosql/scripts/mongodb/` — 5 scripts JS: 01-insert (insertOne/insertMany/bulkWrite), 02-find (findOne/find/paginação/text search), 03-update ($set/$inc/upsert/updateMany), 04-delete (soft delete/purge), 05-aggregation (top scorers/$lookup/$group)
- `docs/nosql/scripts/redis/` — 4 scripts JS: 01-strings (cache-aside/invalidação/INCR/MGET), 02-hashes (HSET/HGET/HGETALL/HMGET/HINCRBY), 03-sets (SADD/SINTER/SDIFF/SCARD), 04-sorted-sets (leaderboard/standings/ZRANGE/ZRANK)

### Fixed

- `docs/shared/platform/database.md`: cross-link para `docs/nosql/` na seção "Consultas NoSQL"
- `README.md`: badge MongoDB atualizado (8.2 → `docs/nosql/`); badge Redis adicionado (8.x); NoSQL adicionado na tabela de Linguagens

## [1.12.0] - 2026-04-23

### Added

- `docs/sql/conventions/advanced/batch.md`: operações em lote — Batch INSERT multi-row, DELETE/UPDATE em lotes com TOP + WHILE + `@@ROWCOUNT`, staging table (load bruto → validar em etapas → inserir apenas válidos)
- `docs/sql/sgbd/sql-server.md`: seção `## Operações em Lote` — `BULK INSERT` com BATCHSIZE e TABLOCK; SQL Server Agent com `sp_add_job`, `sp_add_jobstep`, `sp_add_schedule`, `sp_add_jobserver`
- `docs/sql/sgbd/postgres.md`: seção `## Operações em Lote` — `COPY` (servidor) e `\copy` (cliente psql); `pg_cron` com `cron.schedule`, `cron.job`, `cron.unschedule`
- `docs/sql/sgbd/sql-server.md`: seção `## Diagnóstico` — SET STATISTICS IO/TIME, Query Store (`sys.dm_exec_query_stats` + `sys.dm_exec_sql_text`), conexões ativas (`sys.sysprocesses`)
- `docs/sql/sgbd/postgres.md`: seção `## Diagnóstico` — slow query log (`postgresql.conf`), EXPLAIN / EXPLAIN ANALYZE, `pg_stat_activity` (conexões e queries lentas/locks)
- `docs/shared/platform/etl-bi.md`: guia ETL e BI — OLTP vs OLAP, pipeline de dados em camadas, extração (full load / incremental / CDC), ETL vs ELT, modelagem dimensional (star/snowflake schema, fact/dimension tables, grain), SCD Tipo 1/2/3, BI e relatórios, pre-agregação, referência rápida

### Fixed

- `docs/shared/platform/database.md`: engine-specific removido (EXPLAIN syntax, SET STATISTICS, `pg_stat_activity`, `sys.dm_exec_query_stats`, `sys.sysprocesses`, `postgresql.conf`) — substituídos por cross-links para `sgbd/`; BAD/GOOD SQL em "Boas práticas de query" convertidos em cross-link para `sql/performance.md`; seção `## Operações em Lote` conceitual adicionada (chunk size, idempotência, padrões) com 3 conceitos novos (ETL, staging table, chunk)
- `docs/sql/conventions/advanced/performance.md`: seção `## CAST e conversão de tipo em colunas` adicionada — 4 BAD/GOOD: CAST explícito na coluna, conversão implícita por tipo incompatível (VARCHAR/NVARCHAR), CAST em condição de JOIN, data armazenada como VARCHAR
- `docs/sql/README.md`: link para `batch.md` adicionado na tabela Avançados
- `README.md`: `ETL e BI` adicionado na tabela Plataforma; descrição de `Database` atualizada com operações em lote

## [1.11.0] - 2026-04-22

### Added

- `docs/sql/sgbd/sql-server.md`: guia SQL Server 2025 — tipos de dados, UUID v7, stored procedures com TRY/CATCH, transações, OPPO (Optional Parameter Plan Optimization), RegEx nativo, JSON nativo, vector search (DiskANN)
- `docs/sql/sgbd/postgres.md`: guia PostgreSQL 18 — tipos, UUID v7 nativo (`uuidv7()`), `GENERATED ALWAYS AS IDENTITY`, `RETURNING` com `OLD/NEW`, CTEs em DML, JSONB + índice GIN, índice parcial, window functions, `LISTEN/NOTIFY`, AIO, virtual generated columns, temporal constraints
- `docs/sql/sgbd/sqlite.md`: guia SQLite 3.53 — type affinity, WAL mode, rowid, FTS5, JSON nativo (`json_array_insert`), `ALTER TABLE ADD/DROP CONSTRAINT` (3.53+), transações `IMMEDIATE`, PRAGMAs recomendados
- `docs/sql/README.md`: seção `## SGBD` com tabela linkando SQL Server, PostgreSQL e SQLite

### Fixed

- `docs/sql/conventions/visual-density.md`: Good examples de procedure T-SQL e PostgreSQL com colunas qualificadas (`FootballTeams.`); CTE Good com aliases explícitos (`Players.Id AS PlayerId`); AND ao final da linha em "Etapas em procedures" (Bad e Good)
- `docs/sql/conventions/advanced/advanced.md`: Good examples de procedure SQL Server e function PostgreSQL com colunas qualificadas; CTE "duas CTEs" com aliases explícitos
- `docs/sql/conventions/advanced/null-safety.md`: reescrito — PascalCase SQL Server como primary; `SELECT *` removido de todos os Good; aliases de letra (`o`, `c`, `u`) eliminados; `OR`/`AND` ao final da linha; exemplos PostgreSQL marcados explicitamente

## [1.10.0] - 2026-04-22

### Added

- `docs/csharp/frameworks/blazor.md`: guia Blazor .NET 10 — render modes (Static SSR, Interactive Server, WebAssembly, Auto), componentes com computed properties, EventCallback filho→pai, `[PersistentState]` sem chamada duplicada, EditForm com DataAnnotationsValidator, roteamento tipado com `@page`, JS Interop em `OnAfterRenderAsync`
- `docs/csharp/frameworks/razor-mvc.md`: guia ASP.NET Core MVC e Razor Pages .NET 10 — PageModel com `OnGet`/`OnPost`, `[BindProperty]`, Tag Helpers (`asp-for`, `asp-validation-for`), controller thin com boundary `Result<T>` → `IActionResult`, ViewModel sem exposição de entidade, layouts e partial views
- `docs/csharp/README.md`: seção `## Frameworks` com tabela linkando Blazor e Razor Pages/MVC

## [1.9.0] - 2026-04-22

### Added

- `docs/python/frameworks/reflex.md`: guia Reflex 0.8.28 — State, Vars tipadas, Event Handlers (público vs `_` privado), Computed Vars com `@rx.var`, Components sem I/O inline; nota de compatibilidade Python 3.14 (Pydantic v1 + operador `~`); estrutura de projeto
- `docs/python/frameworks/fastapi.md`: guia FastAPI 0.136.0 — schemas separados (Input/Response), Path Operations finas, Dependency Injection via `Depends()`, async sem bloqueio do event loop com httpx
- `docs/python/frameworks/htmx.md`: guia HTMX 2.0.10 integrado com FastAPI e Jinja2 — respostas parciais (fragmentos vs página completa), hx-target e hx-swap intencionais, out-of-band swaps, estados de loading com hx-indicator
- `docs/python/README.md`: seção `## Frameworks` com tabela linkando FastAPI, HTMX e Reflex

## [1.8.4] - 2026-04-22

### Fixed

- `docs/python/conventions/variables.md`: t-string SQL vertical sem `SELECT *`; seção `pathlib` migrada de setup — stdlib, não configuração de projeto
- `docs/python/conventions/visual-density.md`: exemplo declaração+guarda expandido com múltiplos pares para contraste legível entre Bad e Good
- `docs/python/conventions/control-flow.md`: match/case estrutural com domínio de negócio (`order_placed`, `payment_received`) — sem variáveis genéricas `x`/`y`
- `docs/python/setup/project-foundation.md`: ruff select comentado com nomes dos rule sets; `app.py` removido (apenas `main.py`); Configuração centralizada movida antes de Entry point; Bad example em Módulos por domínio; estrutura de arquivos com `pyproject.toml`, `.editorconfig`, `.env.example`, `scripts/`; pathlib removido
- `docs/python/quick-reference.md`: Bad/Good com `<details>` em type hints, strings e destructuring; bare return no Good de destructuring

## [1.8.3] - 2026-04-21

### Fixed

- `docs/shared/architecture/patterns.md`: 8 padrões GoF adicionados com seção completa (Singleton, Adapter, Facade, Proxy, Chain of Responsibility, Command, State, Template Method); 9 padrões especializados em tabela compacta (Abstract Factory, Prototype, Bridge, Composite, Flyweight, Iterator, Mediator, Memento, Visitor); Referência rápida movida para o topo (após Conceitos fundamentais), dividida em duas tabelas com anchors; Conceitos fundamentais expandido (Handler, Middleware); writing-soul aplicado (em dash, voz passiva, tradução write side)

## [1.8.2] - 2026-04-21

### Fixed

- `README.md`: badge HTML corrigido para inglês ("Semantic & Accessible")
- `docs/shared/standards/testing.md`: seção `## Complexidade ciclomática` adicionada — faixas 1–10/11–20/21–50/>50, relação com número mínimo de casos de teste, e ações de refatoração; entrada adicionada em `## Conceitos fundamentais`

## [1.8.1] - 2026-04-21

### Fixed

- `docs/typescript/frameworks/react-nextjs.md`: Fluxo de Operação reestruturado por cenário de uso (Next.js como frontend vs fullstack); webhook handler adicionado (HMAC, idempotência, enqueue); estrutura de pastas com slice vertical (`features/`); coluna Domínio nas tabelas; writing soul (em dashes removidos)
- `docs/typescript/frameworks/angular.md`: Fluxo de Operação com fluxo linear, tabela passo a passo e coluna Domínio (features/ vs core/); estrutura de pastas com slice vertical; writing soul (em dashes removidos)

## [1.8.0] - 2026-04-21

### Added

- `docs/typescript/frameworks/react-nextjs.md`: guia React 19.2 + Next.js 16 — RSC vs RCC, Props tipadas, hooks com pipeline Component→Service→apiClient, proxy.ts guards, formulários Zod+Server Action+useActionState, API Routes (GET/POST), Caching (`use cache`, `cacheLife`, `updateTag`); exemplos dogfoodam code style completo
- `docs/typescript/frameworks/angular.md`: guia Angular 21 Standalone — Signals, Smart/Dumb Components, Services com `inject()`, `CanActivateFn` guards, `ResolveFn` loaders, formulários reativos tipados com `FormBuilder`, HTTP Interceptors (auth + error handling); exemplos dogfoodam code style completo
- `docs/typescript/README.md`: seção `## Frameworks` com links para react-nextjs.md e angular.md

## [1.7.1] - 2026-04-21

### Fixed

- `docs/shared/platform/database.md`: exemplos NoSQL adicionados (Consultas NoSQL — projeção, filtro, N+1/$lookup com JS code style); exemplos SQL corrigidos para o formato vertical do guia (SELECT/FROM/WHERE/JOIN com recuo, AND ao final da linha, nomes de tabela qualificados); queries de diagnóstico (slow query, connection pool, locks) no mesmo padrão; `db.` → `database.`; `qs`/`qt` → `queryStats`/`queryText`; SUBSTRING verboso simplificado para `queryText.text`
- `docs/shared/platform/integrations.md`: novo arquivo — GraphQL, TOML, YAML (modernos) + XML/SOAP, SPED, CNAB, ZPL, RS-232 (legado); exemplos em JavaScript com code style completo; nomes internacionalizados (`companyRegistrationNumber`, `periodStart`, `taxId` → `companyRegistrationNumber`); RTS/CTS expandidos e traduzidos

## [1.7.0] - 2026-04-21

### Added

- `docs/shared/process/methodologies.md`: DDD, BDD, TDD, XGH, XP, desenvolvimento intuitivo e orgânico; estilos arquiteturais Monolito, Microsserviços e Monolito Modular com posição opinionada sobre o padrão recomendado em 2026
- `docs/shared/architecture/patterns.md`: CQRS (separado explicitamente de CQS), AI-Driven Development e SDD (Spec-Driven Development) com tabela de referência rápida atualizada
- `docs/shared/platform/performance.md`: seção Big O com tabela de notações e 4 armadilhas comuns (loop aninhado, N+1, filter+map, sort) em `<details>` com exemplos no code style do projeto
- `docs/shared/architecture/scaling.md`: escala vertical e horizontal, Load Balancing (algoritmos, health checks, SSL termination), API Gateway, estratégias de cache/CDN/read replicas e seção anti-overengineering com sequência de escala recomendada
- `docs/shared/platform/database.md`: SQL vs NoSQL (4 modelos), tuning de queries (índices, boas práticas em `<details>`), plano de execução (`EXPLAIN` PostgreSQL e SQL Server), troubleshooting de gargalos (slow query log, N+1, pool exhaustion, locks/deadlocks)
- `REFERENCES.md`: links centralizados na raiz, organizados em 10 grupos semânticos; `README.md` aponta em uma linha para o arquivo

## [1.6.2] - 2026-04-21

### Fixed

- `docs/shared/`: seção `## Conceitos fundamentais` adicionada em 18 arquivos (architecture×7, platform×5, standards×3, process×3); tabela `| Conceito | O que é |` logo após a introdução, com bold nos termos e tradução PT entre parênteses; `PR (Pull Request)` traduzido como "Pedido de Integração" em git.md; `CI/CD` expandido para 3 entradas distintas (CI, Entrega Contínua, Deploy Contínuo) na tabela de processos

## [1.6.1] - 2026-04-21

### Fixed

- Padrão unificado de introdução de termos e siglas: `**SIGLA** (Full English Name, tradução PT)` com bold no termo, aplicado em 19 arquivos `docs/` (shared + vbnet); regras atualizadas em `tasks.md` e `writing-soul.md`

## [1.6.0] - 2026-04-21

### Added

- `docs/shared/architecture/frontend-flow.md`: routing (guard de rota, loaders, layouts aninhados) e forms (schema como contrato, erros por campo/formulário, in-flight, optimistic updates) — agnóstico de framework, baseado em padrões consolidados de 2026
- `docs/shared/architecture/backend-flow.md`: background job (outbox pattern, idempotência, entrega de resultado), webhook (validação HMAC, idempotência por chave externa, roteamento de eventos) e event-driven (DLQ, at-least-once, envelope CloudEvents, outbox como ponte)

## [1.5.0] - 2026-04-21

### Added

- `docs/vbnet/setup/legacy-desktop.md`: setup enxuto para desktop Windows Forms — `App.config`, módulo `DataAccess` thin, form → banco → resultado, fail-fast de connection string ausente
- `docs/vbnet/scripts/`: 5 scripts de referência — `variables.vb`, `control-flow.vb`, `methods.vb`, `async.vb`, `error-handling.vb`
- `docs/vbnet/scripts/test/`: 2 test scripts — `testing.mstest.vb`, `testing.nunit.vb`
- `docs/typescript/scripts/`: 6 scripts de referência — `variables.ts`, `control-flow.ts`, `functions.ts`, `async.ts`, `error-handling.ts`, `types.ts`
- `docs/typescript/scripts/test/`: 2 test scripts — `testing.jest.ts`, `testing.vitest.ts` (com `// @ts-nocheck` para suprimir alarmes do Language Server)
- `docs/css/scripts/`: 3 scripts de referência — `naming.css`, `variables.css`, `layout.css`

### Changed

- `docs/shared/`: fluxos lineares adicionados e padronizados em 6 arquivos (security, governance, cloud, testing, null-safety, configuration) — flows `→` horizontais para processos curtos, `↓` vertical com anotações para pipelines detalhados
- `docs/shared/architecture/component-architecture.md`: reescrito com visão geral linear no topo, fluxo de decisão de estado, direção de import visual, traduções de termos técnicos na primeira ocorrência, link `.ai` interno removido e substituído por explicação inline
- `docs/shared/platform/feature-flags.md`: seção "Estrutura do condicional" com blocos de código separados por padrão, realce `js`, explicações acima de cada bloco; traduções de termos técnicos na primeira ocorrência; link `ci-cd.md` corrigido para `../process/ci-cd.md`
- `.ai/backlog/tasks.md`: Standing Directive formalizada para tradução de termos técnicos em inglês na primeira ocorrência; task adicionada para revisar 10 docs shared restantes
- `docs/shared/`: tradução de termos técnicos em inglês na primeira ocorrência aplicada em 9 arquivos (observability, ui-ux, editorconfig, operation-flow, principles, architecture, patterns, ci-cd, git) — ~50 termos cobertos incluindo `output`, `retry`, `fallback`, `stack trace`, `header`, `runtime`, `APM`, `viewport`, `tokens`, `spinner`, `skeleton`, `Toast`, `caller`, `pipeline`, `timeout`, `hooks`, `stakeholders`, entre outros
- `docs/shared/platform/performance.md`: diagramas linearizados (esquerda para a direita); seções Webhook, Polling e WebSocket adicionadas; termos traduzidos na primeira ocorrência (cache, endpoint, Offset/limit, CPU, miss, query, join, full scan, Lazy loading, Connection pooling, workers, handshake, viewport)
- `docs/shared/platform/messaging.md`: novo — broker, queue vs pub/sub, garantias de entrega (at-most-once, at-least-once, exactly-once), idempotência, DLQ, backpressure e ferramentas
- `README.md`: tabela Plataforma atualizada com Messaging; descrição de Performance expandida
- `.ai/backlog/tasks.md`: Standing Directive de fluxos lineares (esquerda para a direita) adicionada

## [1.4.2] - 2026-04-21

### Added

- `docs/shared/architecture/operation-flow.md`: pipeline conceitual backend e frontend — pure nas bordas, I/O no meio, Result<T> como contrato, CQS separando Save de Read
- `docs/shared/process/governance.md`: seções "Processo auditável" (pipeline Spec→Observação com tabela de auditabilidade), "Checklists como ferramenta de qualidade" (tabela por etapa) e convicção "Processo, não pessoa"

### Changed

- `docs/shared/`: reorganizado em 4 subpastas — `architecture/` (principles, architecture, component-architecture, patterns, operation-flow), `platform/` (security, configuration, feature-flags, performance, cloud), `process/` (governance, git, ci-cd), `standards/` (testing, observability, null-safety, visual-density, editorconfig, ui-ux). Todas as referências cruzadas atualizadas
- `README.md`: seções Linguagens e Conceitos Compartilhados em `<details>`, shared dividido em 4 tabelas temáticas (Processo, Arquitetura, Qualidade, Plataforma) com ordem semântica
- `docs/shared/process/ci-cd.md`: overlap com git.md removido (TBD); fluxos lineares adicionados em Pipeline, Ambientes, Pós-deploy, Deploy e Release, Pre-commit, Fix Forward e Rollback; seção Ambientes com SVG e tabela de responsabilidades; tabelas de troubleshoot em Fix Forward e Rollback
- `docs/shared/process/git.md`: seções Deploy e Release, Incidentes e Correções e Pipeline de Desenvolvimento removidas (delegadas a ci-cd.md com referência)
- `docs/shared/standards/null-safety.md`: exemplos reescritos em JS puro seguindo code style — sem TypeScript, sem C#, sem `SELECT *`, sem `item`/`sum` banidos, explaining return em todos os Good

## [1.4.1] - 2026-04-21

### Added

- `docs/csharp/setup/vertical-slice.md`: guia completo de Vertical Slice Architecture — IModule com auto-discovery via reflexão, Program.cs com AddDefaults/UseDefaults, pipeline de 6 steps invariantes (Sanitize → Validate → BusinessRules → Save → Read → FilterOutput), ValidationFilter, TypedResults aliases, todos os arquivos da fatia documentados com exemplos completos, testes AAA e anti-patterns

### Changed

- `docs/csharp/conventions/advanced/api-design.md`: 3 seções novas — [AsParameters] context records, TypedResults aliases (global using por feature), CQS void Save + IOrderReader separado; fixes de Explaining Returns em exemplos Good
- `docs/csharp/conventions/advanced/error-handling.md`: `implicit operator` adicionado a `Result<T>` com Bad/Good mostrando happy path sem cerimônia (`return request` em vez de `Result<T>.Success(request)`)
- `docs/csharp/README.md`: entrada Vertical Slice adicionada na tabela de Setup

## [1.4.0] - 2026-04-20

### Added

- `.ai/tooling/scripts/audit-docs.mjs` (gitignored, local tooling): linter que varre `docs/` e reporta violações dos princípios do guia em exemplos `✅ Good`. Ruleset v1: banned-abbreviations (req/res/ctx/…), no-logic-in-return, db-direct-access (JS/TS), minimal-api-untyped-results (C#), density-double-blank, section-banners. Exemplos `❌ Bad` são isentos. Relatório em `.ai/backlog/audit-report.md`. Scripts: `npm run audit:docs` e `npm run test:docs`
- `docs/csharp/conventions/advanced/api-design.md`: seção **TypedResults vs Results** — diferença de tipagem, quando usar qual, assinatura rica com `Results<Ok<T>, NotFound>`, e Bad/Good de Location header sem lógica no return

### Changed

- **Wave 1 — TypedResults migration**: 17 ocorrências de `Results.*` em Good examples migradas para `TypedResults.*` (api-design, error-handling, control-flow, quick-reference, setup/security em C#; shared/null-safety)
- **Wave 2 — Repository idiom**: 23 ocorrências de `db.*` em Good examples JS/TS substituídas por `userRepository.*`, `orderRepository.*`, `productRepository.*` conforme o domínio (error-handling, null-safety, validation, functions, visual-density, narrowing, async, shared/null-safety)
- **Wave 3 — Abreviações banidas**: 17 ocorrências de `req`/`res`/`ctx` em Good examples substituídas por `request`/`response`/`httpContext` (csharp/observability, javascript/visual-density + setup, typescript/observability + visual-density + validation)
- `docs/csharp/conventions/advanced/api-design.md`: Bad examples anotados com comentário inicial explicitando o conjunto de anti-patterns concentrados (DbContext direto, lógica inline, sem TypedResults, interpolação no return)

**Resultado**: 74 → 0 violações em 712 blocos Good / 136 arquivos. Audit clean.

## [1.3.0] - 2026-04-20

### Added

- `docs/shared/component-architecture.md`: composição sobre herança, container vs presentational, estado (lifting/prop drilling/context/store), memoization, fronteiras de módulo (feature-based vs layer-based), regras de import — agnóstico de framework
- `docs/shared/configuration.md`: config vs secret, precedência em camadas (código → arquivo → env → CLI → secrets manager), layering base+override, tipagem, fail-fast no startup, mudanças em runtime
- `docs/shared/feature-flags.md`: toggle por propósito (release/experiment/ops/permission), rollout gradual, dark launch (shadow/silent metrics/write-to-shadow), kill switch, avaliação build-time/startup/runtime, estrutura no código, dívida, testes
- `docs/csharp/conventions/types.md`: interface vs abstract, sealed default, record, Nullable Reference Types, pattern matching, generics, evitar dynamic
- `docs/vbnet/conventions/types.md`: Interface vs MustInherit, NotInheritable default, Structure vs Class, Nullable(Of T), TryCast, generics, evitar Object
- `docs/vbnet/conventions/advanced/api-design.md`: Web API 2, controller thin, handler pattern, envelope, async sem deadlock
- `docs/vbnet/conventions/advanced/dependency-injection.md`: Unity IoC, constructor injection, lifetimes, assembly scanning
- Linha de escopo em blockquote no topo de 65 arquivos: 18 em `docs/shared/` (`Escopo: transversal`) e 47 em `docs/<lang>/conventions/advanced/` (`Escopo: <Lang>` com cross-link para shared/ quando há correspondência)

### Changed

- `docs/csharp/setup/security.md`, `docs/javascript/setup/security.md`, `docs/vbnet/setup/security.md`: slim para apenas especificidades do ecossistema (dotnet user-secrets, dotenv, Web.config transforms, Options pattern, policies, `<Authorize>`, httpCookies); princípios gerais delegados a `shared/security.md` via link
- `docs/javascript/quick-reference.md`, `docs/typescript/quick-reference.md`, `docs/html/quick-reference.md`, `docs/css/quick-reference.md`, `docs/csharp/quick-reference.md`, `docs/vbnet/quick-reference.md`, `docs/sql/quick-reference.md`: convertidos em cheat-sheet tabular denso (~60 linhas), blocos `<details>` removidos, snippets essenciais preservados quando adicionam valor não capturado em tabela
- `README.md`: tabela Shared ganhou Component Architecture, Configuration e Feature Flags; alinhamento de colunas regularizado
- 11 skills em `.ai/` convertidos em stubs redirectores (api-design, ci-cd, cloud, data-access, observability, security, sql-style, testing, ui-ux, idioms/csharp/patterns, idioms/javascript/patterns); `code-style.md` ganhou nota de hierarquia SSOT — canônico agora é `docs/`

## [1.2.0] - 2026-04-20

### Added

- `docs/shared/governance.md`: pensamento de staff engineer, SDLC, onboarding, complexidade em camadas, naming como governança, ADRs, code review como governança
- `docs/shared/architecture.md`: Vertical Slice, MVC, Legacy, XP e XGH — cada padrão com estrutura de pastas, tabela de navegação e "Como escolher"
- `docs/shared/patterns.md`: Result, Factory, Repository, Strategy, Observer, Builder, Decorator — pseudocódigo, quando usar e tabela de referência rápida
- `docs/shared/performance.md`: paginação offset/cursor, cache TTL e estratégias, filas, lazy loading, N+1, índices e connection pool
- `docs/shared/testing.md`: AAA, no logic no assert, nomenclatura de testes, isolamento, unitário vs integração — links por linguagem
- `docs/shared/ci-cd.md`: pipeline por estágios, deploy vs release, feature flags, Trunk-Based Development, pre-commit, fix forward vs rollback
- `docs/shared/cloud.md`: serviços gerenciados vs self-hosted, least privilege/IAM, containers (multi-stage, sem root, health check), limites de recursos, ambientes
- `docs/shared/ui-ux.md`: escala de espaçamento 4px, hierarquia tipográfica, variáveis semânticas para temas claro/escuro, acessibilidade WCAG 2.1 AA, estados de interface

### Fixed

- `docs/shared/security.md`: opener e regra de segredos reescritos — binary contrast removido (writing soul)
- `docs/shared/null-safety.md`: binary contrasts em prosa e em dashes em labels e comentários removidos (writing soul)
- `README.md`: seção "O que eu penso sobre código" adicionada; tabela Shared expandida com todos os novos links

## [1.1.0] - 2026-04-20

### Added

- `docs/typescript/conventions/advanced/`: performance, observability, testing, validation, dates — tópicos avançados com ângulo TypeScript-específico (branded types, `z.infer`, `satisfies`, mocks tipados, logger interface)
- `docs/typescript/conventions/`: control-flow e visual-density — narrowing como guard, discriminated unions, exhaustiveness check, densidade visual com anotações de tipo
- `docs/vbnet/conventions/advanced/performance.md`: `StringBuilder`, boxing, `HashSet`, `For` vs `For Each` em hot paths
- `docs/vbnet/conventions/advanced/null-safety.md`: `Is Nothing`, `Nullable(Of T)`, `If()` null-coalescing, guard em construtor
- `docs/css/conventions/performance.md`: reflow, `transform`/`opacity`, `will-change`, `contain`, especificidade

### Fixed

- `docs/javascript/conventions/advanced/dates.md`: Temporal API atualizada de ES2025 Stage 4 para ES2026; nota de suporte de browser com Chrome 144 e Firefox 139
- `docs/vbnet/README.md`: versão VB.NET corrigida de 14 para 16 (par correto com .NET Framework 4.8)

## [1.0.1] - 2026-04-20

### Changed

- `README.md`: badge de versão dinâmica via `shields.io/github/package-json/v` sincronizado com `package.json`
- `docs/typescript/`: atualização para TypeScript 6 — badge 6.x, tsconfig com `target: ES2025`, `lib: ["ES2025"]`, campo `types` explícito, depreciação de `baseUrl` e padrões `ES6`/`commonjs` documentada

## [1.0.0] - 2026-04-20

### Added

- `docs/shared/security.md`: guia conceitual de segurança agnóstico de linguagem (segredos, configuração em camadas, frontend, validação, autenticação vs autorização, cookies)
- `README.md`: seção Changelog e entrada de Security na tabela Shared
- Setup de bumpp para gerenciamento de versão e changelog
