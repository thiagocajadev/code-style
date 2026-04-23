# Skills (Habilidades de Agentes)

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Uma **skill** é uma habilidade empacotada que um agente pode invocar. Diferente de uma ferramenta (que executa uma função), uma skill encapsula um comportamento completo: instrução de como raciocinar, quais ferramentas usar e qual formato de saída produzir. Skills são os "módulos" de um agente.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Skill** (habilidade) | Unidade de comportamento reutilizável que combina instrução, ferramentas e formato de saída |
| **Skill routing** (roteamento de habilidades) | Mecanismo que determina qual skill invocar com base na intenção do usuário |
| **Skill loading** (carregamento de habilidades) | Injeção dinâmica de uma skill no contexto do agente no momento da execução |
| **Semantic router** (roteador semântico) | Componente que classifica a intenção da entrada e seleciona a skill correspondente |
| **Tool** (ferramenta) | Função com schema: executa uma ação discreta e retorna um resultado estruturado |
| **Prompt template** (modelo de prompt) | Texto parametrizado que serve de base para uma instrução — componente de uma skill |
| **Agent persona** (persona do agente) | Papel e restrições de comportamento definidos no system prompt da skill |
| **Token gate** (portão de tokens) | Estratégia que carrega skills apenas quando ativadas, evitando contexto desnecessário |

## Skill vs Tool

Skills e tools são complementares, não equivalentes.

| Aspecto | Tool | Skill |
|---|---|---|
| Granularidade | Atômica — faz uma coisa | Composta — orquestra várias ações |
| Definição | Schema JSON (nome, params, tipos) | Arquivo de instrução (markdown, YAML, código) |
| Executa | Código determinístico | LLM + tools + lógica de raciocínio |
| Reutilização | Por API call | Por harness em múltiplos contextos |
| Exemplo | `search_web(query)` | Skill de pesquisa: reescreve query → busca → resume → formata |

Uma skill pode usar várias tools. Uma tool não usa skills.

## Anatomia de uma skill

Uma skill bem definida tem quatro componentes:

```
[Gatilho]     Condição que ativa a skill (prefixo, intenção, contexto)
[Persona]     Papel e restrições do agente para essa tarefa
[Instrução]   O que fazer, em que ordem, com quais ferramentas
[Formato]     Estrutura esperada de saída (texto, JSON, tabela, código)
```

**Exemplo em markdown (formato usado em harnessses como Claude Code):**

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

## Skill routing (Roteamento)

O harness precisa saber qual skill invocar para cada entrada. Há três abordagens:

```
Prefixo explícito:  "review: [código]" → skill de revisão
Semântico:          LLM classifica a intenção → seleciona skill pelo score de similaridade
Híbrido:            Prefixo tem prioridade; fallback para semântico se não houver prefixo
```

O **prefixo explícito** é determinístico e barato — zero tokens de classificação. O **roteamento semântico** é mais flexível, mas adiciona uma chamada ao modelo (ou a um classificador menor). Para sistemas com poucos domínios, prefixo explícito é a escolha certa.

## Skill loading (Carregamento)

Carregar todas as skills no contexto desde o início desperdiça tokens e polui o raciocínio do modelo. A estratégia correta é o **token gate**: cada skill é carregada apenas quando seu gatilho é ativado.

```
Entrada do usuário → Roteador identifica domínio → Carrega skill N → Executa → Descarta skill N
```

Benefícios do carregamento sob demanda:
- Redução de 60-80% no consumo de tokens do system prompt
- Menor risco de conflito entre instruções de skills diferentes
- Contexto do modelo focado no domínio da tarefa atual

## Composição de skills

Skills podem se compor: uma skill de alto nível invoca sub-skills especializadas.

```
Skill: Análise de PR
  ├─ Sub-skill: Revisão de código (lógica, segurança)
  ├─ Sub-skill: Revisão de testes (cobertura, AAA)
  └─ Sub-skill: Revisão de docs (changelog, README)
```

Em harnessses multi-agente, cada skill pode ser executada por um agente especializado em paralelo. O orquestrador agrega os resultados e produz o output final.

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

**Uma skill por domínio.** Skills que cobrem múltiplos domínios produzem raciocínio genérico. Uma skill de "análise geral" é menos útil que uma skill de "revisão de segurança".

**Instrução operacional, não descritiva.** A instrução diz o que fazer, não o que a skill é. "Identifique os 3 principais riscos de segurança" performa melhor que "Você é um especialista em segurança".

**Formato de saída explícito.** Sem formato definido, o output varia entre chamadas. Especificar estrutura (tabela, lista numerada, JSON) garante parsabilidade.

**Versionar skills como código.** Skills em produção devem ter controle de versão, testes de output e processo de deploy — os mesmos critérios de qualquer artefato de software.
