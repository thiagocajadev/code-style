# Arquitetura

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Arquitetura é a decisão de como organizar o código para que o sistema possa crescer, ser mantido e ser entendido. A arquitetura certa depende do contexto, do time e do estágio do produto.

| Padrão | Organiza por | Melhor para |
|---|---|---|
| [Vertical Slice](#vertical-slice) | Feature | Times paralelos, sistemas com muitas funcionalidades independentes |
| [MVC](#mvc-model-view-controller) | Camada técnica | Aplicações web com renderização server-side |
| [Legacy](#legacy) | Acúmulo histórico | Manutenção incremental, sistemas que funcionam |
| [XP](#xp-extreme-programming) | Qualidade e iteração | Times pequenos com cultura técnica forte |
| [XGH](#xgh-extreme-go-horse) | Velocidade acima de tudo | Scripts descartáveis, protótipos de vida curta |

## Como escolher

As perguntas úteis:

| Pergunta | Implicação |
|---|---|
| Quantas features independentes o sistema vai ter? | Muitas → Vertical Slice |
| O time trabalha em paralelo em diferentes domínios? | Sim → Vertical Slice isola o trabalho |
| É uma aplicação web com renderização tradicional? | MVC é suficiente e bem suportado |
| O código já existe e funciona? | Legacy: preserve o comportamento, evolua com cuidado |
| Qualidade técnica é prioridade sustentável? | XP: exige compromisso real do time |
| É um protótipo descartável? | XGH: conscientemente, com prazo de validade |

---

## Vertical Slice

Organiza o código por **feature**: tudo que pertence a uma funcionalidade fica junto.

```
features/
  orders/
    create-order.handler
    create-order.validator
    create-order.query
    create-order.test
  users/
    register-user.handler
    register-user.validator
    register-user.test
  shared/
    auth/
    logging/
```

Cada slice é independente: adicionar uma feature é adicionar uma pasta. Mudar uma feature toca apenas os arquivos daquela pasta. Mudanças ficam contidas na pasta da feature.

O custo é o compartilhamento: código verdadeiramente comum (autenticação, logging, infraestrutura) precisa de uma camada `shared/` bem definida. Sem isso, duplicação aparece entre os slices.

**Melhor para**: sistemas com muitas features independentes, times que trabalham em paralelo em diferentes domínios, projetos que crescem por adição de funcionalidades.

---

## MVC (Model-View-Controller)

MVC é o padrão mais difundido para aplicações web com interface. Divide o sistema em três camadas com responsabilidades distintas:

| Camada | Responsabilidade |
|---|---|
| **Model** | Dados, regras de negócio, acesso ao banco |
| **View** | Apresentação e renderização para o usuário |
| **Controller** | Recebe a requisição, aciona o Model, entrega à View |

```
controllers/
  OrderController
  UserController
models/
  Order
  User
views/
  orders/
    index
    detail
  users/
    index
```

O benefício central é a separação entre lógica de negócio e lógica de apresentação. Um Model pode ser testado sem renderizar nada. Uma View pode ser trocada sem tocar nas regras de negócio.

O risco clássico é o **Fat Controller**: quando o controller acumula lógica que deveria estar no Model. Controllers devem ser finos: o papel deles é coordenar o fluxo, não implementar lógica.

**Melhor para**: aplicações web tradicionais com renderização server-side, APIs REST (Representational State Transfer, Transferência de Estado Representacional) com múltiplas entidades.

---

## Legacy

Projetos legados raramente foram projetados com escalabilidade em mente. Cresceram por camadas de correções, adaptações e adições emergenciais. A estrutura que você vai encontrar é o resultado de decisões acumuladas ao longo do tempo, sem um design intencional.

```
src/
  Page1.aspx
  Page2.aspx
  Helpers.cs
  Database.cs
  Utils.cs
Global.asax
Web.config
```

Trabalhar em código legado tem regras diferentes:

**Entender antes de mudar.** A lógica estranha provavelmente tem um motivo: bug específico de produção, integração com sistema externo, limitação de ambiente. Apagar código que parece sem sentido sem investigar é uma das formas mais eficientes de introduzir regressão.

**Mudanças cirúrgicas.** O blast radius (raio de impacto) de uma alteração em código legado é difícil de mapear. Refatorar enquanto conserta um bug mistura riscos. O ideal é: conserta o bug, valida, refatora separado.

**Testes antes de tocar.** Antes de alterar uma função sem testes, escreva um teste que capture o comportamento atual, mesmo que o comportamento pareça errado. Isso dá uma rede antes de qualquer mudança.

**Estrutura enxuta é intencional.** Sistemas legados com pouca abstração são pragmáticos para o contexto em que foram construídos. A tentação de "fazer direito do zero" costuma subestimar o conhecimento implícito incorporado no código que funciona.

**Melhor para**: manutenção incremental, migração gradual, sistemas que funcionam e não precisam ser reescritos.

---

## XP (Extreme Programming)

XP é uma metodologia de desenvolvimento que leva boas práticas de engenharia ao extremo: se code review (revisão de código) é bom, faça em tempo real (pair programming). Se testes são bons, escreva o teste antes do código com TDD (Test-Driven Development, Desenvolvimento Guiado por Testes).

```
src/
  domain/
    Order
    User
  services/
    OrderService
    UserService
tests/
  unit/
    OrderTests
    UserServiceTests
  integration/
    OrderFlowTests
```

Práticas centrais:

| Prática | O que é |
|---|---|
| **TDD** | Teste antes do código. Red → Green → Refactor. |
| **Pair programming** | Dois desenvolvedores, uma máquina. Um escreve, o outro revisa em tempo real. |
| **Integração contínua** | Código integrado e testado várias vezes ao dia. |
| **Refactoring contínuo** | Design melhorado de forma incremental, sem big bang. |
| **Simplicidade** | A solução mais simples que funciona. Sem antecipar requisitos futuros. |

XP funciona melhor em times pequenos com alta comunicação, requisitos que mudam frequentemente e cultura que valoriza qualidade técnica. O custo é disciplina: as práticas exigem compromisso sustentado.

**Melhor para**: produtos em desenvolvimento ativo, times que colaboram presencialmente ou remotamente com alta sincronia, projetos onde o custo de bugs em produção é alto.

---

## XGH (eXtreme Go Horse)

> ⚠️ Esta seção documenta um padrão real com consciência dos riscos.

XGH é a arquitetura que emerge de projetos onde a velocidade supera qualquer outra consideração. Surgiu espontaneamente, sem planejamento. O processo é simples: tem um problema, resolve agora, sem questionar como.

```
src/
  Page1.aspx
  funcoes.js
  helper_v2_FINAL.js
  helper_v2_FINAL_copia.js
database/
  script.sql
  script_novo.sql
  script_USAR_ESSE.sql
  script_nao_mexer.sql
TODO.txt
```

Os axiomas são conhecidos:

- _"Pensou, tá errado."_
- _"Se funciona, não mexa."_
- _"Commit antes de testar é commit corajoso."_
- _"Arquitetura é pra quem tem prazo."_

XGH tem um espaço legítimo, estreito, mas real. Protótipos descartáveis, scripts de uso único, hackathons, MVPs (Minimum Viable Product, Produto Mínimo Viável) que podem ser reescritos: contextos onde o custo de engenharia supera o valor do que está sendo construído.

Usar XGH em projetos de vida curta tem sentido. O problema aparece quando XGH se torna o padrão de um sistema que precisa durar, quando cada nova feature é construída sobre a última gambiarra e o time passa mais tempo desfazendo do que construindo.

A métrica do XGH é simples: funciona agora? Sim. Ainda vai funcionar em seis meses? Essa pergunta não existe no framework.

**Melhor para**: scripts descartáveis, provas de conceito, projetos de vida curta onde o custo de fazer certo supera o valor entregue.

