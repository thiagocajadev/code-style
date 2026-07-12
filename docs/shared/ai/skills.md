# Skills: empacotar um comportamento que o agente sabe executar

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Uma **skill** (habilidade) é um comportamento completo, empacotado para o agente invocar quando precisar. Ela guarda três coisas juntas: como raciocinar sobre a tarefa, quais ferramentas usar e em que formato entregar a resposta. Uma **tool** (ferramenta) executa uma função e devolve o resultado; a skill orquestra o trabalho em volta dela. As skills funcionam como os módulos de um agente.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Skill** (habilidade) | Unidade de comportamento reutilizável que combina instrução, ferramentas e formato de saída |
| **Skill routing** (roteamento de habilidades) | Mecanismo que determina qual skill invocar com base na intenção do usuário |
| **Skill loading** (carregamento de habilidades) | Injeção dinâmica de uma skill no contexto do agente no momento da execução |
| **Semantic router** (roteador semântico) | Componente que classifica a intenção da entrada e seleciona a skill correspondente |
| **Tool** (ferramenta) | Função com schema: executa uma ação discreta e retorna um resultado estruturado |
| **Prompt template** (modelo de prompt) | Texto parametrizado que serve de base para uma instrução; componente de uma skill |
| **Agent persona** (persona do agente) | Papel e restrições de comportamento definidos no system prompt da skill |
| **Token gate** (portão de tokens) | Estratégia que carrega skills apenas quando ativadas, evitando contexto desnecessário |

## O que separa uma skill de uma tool

As duas trabalham juntas em níveis diferentes. A tool é a peça atômica; a skill é o comportamento que usa as peças.

| Aspecto | Tool | Skill |
|---|---|---|
| Granularidade | Atômica; faz uma coisa | Composta; orquestra várias ações |
| Definição | Schema JSON (nome, params, tipos) | Arquivo de instrução (markdown, YAML, código) |
| Executa | Código determinístico | LLM + tools + lógica de raciocínio |
| Reutilização | Por chamada de API | Por harness em múltiplos contextos |
| Exemplo | `search_web(query)` | Skill de pesquisa: reescreve query → busca → resume → formata |

A relação tem um sentido só: uma skill usa várias tools, e uma tool nunca invoca uma skill.

## As quatro partes de uma skill

Uma skill bem definida declara quatro coisas:

```
[Gatilho]     Condição que ativa a skill (prefixo, intenção, contexto)
[Persona]     Papel e restrições do agente para essa tarefa
[Instrução]   O que fazer, em que ordem, com quais ferramentas
[Formato]     Estrutura esperada de saída (texto, JSON, tabela, código)
```

**Exemplo em markdown (formato usado em harnesses como Claude Code):**

```markdown
# Skill: Revisão de Código

## Quando usar
Ativada quando o usuário pede revisão, code review ou análise de qualidade.

## Persona
Você é um engenheiro sênior. Revise com foco em corretude, legibilidade e segurança.
Não reescreva o código sem pedido explícito.

## Instrução
1. Leia o código completo antes de comentar.
2. Aponte problemas por categoria: lógica, nomenclatura, segurança, performance.
3. Para cada problema, explique o porquê e proponha a correção.

## Formato
Lista por categoria. Máximo 3 pontos por categoria.
```

Repare que a seção "Quando usar" é o gatilho: é ela que o roteador lê para decidir se esta skill entra.

## Roteamento: escolher qual skill atende a entrada

O **harness** (o programa que hospeda o agente e executa suas chamadas) precisa decidir qual skill invocar a cada entrada. Há três caminhos:

```
Prefixo explícito:  "review: [código]" → skill de revisão
Semântico:          LLM classifica a intenção → seleciona skill pelo score de similaridade
Híbrido:            Prefixo tem prioridade; fallback para semântico se não houver prefixo
```

O **prefixo explícito** dá sempre o mesmo resultado e custa zero token de classificação, porque a decisão é uma comparação de texto. O **roteamento semântico** aceita o pedido em linguagem natural e gasta uma chamada extra ao modelo (ou a um classificador menor) para descobrir a intenção. Com poucos domínios, o prefixo resolve.

## Carregamento: trazer a skill só quando ela é acionada

Carregue cada skill no momento em que o gatilho dela dispara. Colocar todas no contexto desde o início gasta tokens em instrução que a tarefa atual não vai usar, e ainda mistura no raciocínio do modelo regras de domínios que não têm nada a ver com o pedido. Essa estratégia se chama **token gate** (portão de tokens).

```
Entrada do usuário → Roteador identifica domínio → Carrega skill N → Executa → Descarta skill N
```

Benefícios do carregamento sob demanda:
- Redução de 60-80% no consumo de tokens do system prompt
- Menor risco de conflito entre instruções de skills diferentes
- Contexto do modelo focado no domínio da tarefa atual

## Composição: uma skill que aciona outras

Skills se compõem. Uma skill de alto nível chama sub-skills especializadas e junta o que elas devolvem.

```
Skill: Análise de PR
  ├─ Sub-skill: Revisão de código (lógica, segurança)
  ├─ Sub-skill: Revisão de testes (cobertura, AAA)
  └─ Sub-skill: Revisão de docs (changelog, README)
```

Em harness multi-agente, cada sub-skill roda em um agente próprio, e os três podem rodar ao mesmo tempo. O **orquestrador** (o agente que coordena os demais) espera as três respostas e monta a saída final.

## Exemplos de skills por domínio

| Domínio | Skill | O que faz |
|---|---|---|
| Engenharia | Code review | Analisa código por qualidade, segurança e nomenclatura |
| Engenharia | Debug | Identifica causa raiz de erros e propõe correção |
| Dados | ETL validator | Valida schema, tipos e integridade de um pipeline de dados |
| Produto | User story | Transforma briefing em user stories no formato BDD |
| Docs | Changelog | Gera entrada de CHANGELOG a partir de commits ou diff |
| Segurança | Threat model | Identifica superfícies de ataque e vetores de ameaça |

## Boas práticas

**Uma skill por domínio.** Skill que cobre vários domínios de uma vez produz raciocínio genérico. Uma skill de "revisão de segurança" rende mais que uma de "análise geral", porque as instruções dela podem ser específicas.

**Escreva a instrução como ordem de trabalho.** "Identifique os 3 principais riscos de segurança" diz ao modelo o que produzir. "Você é um especialista em segurança" descreve um papel e deixa a tarefa em aberto.

**Declare o formato de saída.** Sem formato definido, o output muda de uma chamada para outra. Especificar a estrutura, como tabela, lista numerada ou **JSON** (JavaScript Object Notation · Notação de Objetos JavaScript), mantém a saída processável por código.

**Versione a skill como código.** Skill em produção merece controle de versão, teste de saída e processo de deploy, pelos mesmos motivos que qualquer outro artefato de software.
