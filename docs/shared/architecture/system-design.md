# System Design

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

System Design é o raciocínio feito **antes** de qualquer linha de código. Define o que o sistema precisa fazer, em que condições precisa funcionar e quais trade-offs (trocas) são aceitáveis. Implementação sem esse raciocínio vira retrabalho quando o primeiro gargalo aparece.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Functional requirement** (requisito funcional) | O que o sistema precisa fazer: operações, regras de negócio, fluxos de usuário |
| **Non-functional requirement** (requisito não-funcional) | Sob quais condições precisa funcionar: latência, disponibilidade, segurança, custo |
| **Trade-off** (troca) | Decisão em que ganhar em um atributo custa perder em outro |
| **Latency** (latência) | Tempo entre requisição e resposta |
| **Throughput** (vazão) | Quantidade de requisições processadas por unidade de tempo |
| **Availability** (disponibilidade) | Percentual de tempo em que o sistema responde corretamente |
| **Consistency** (consistência) | Garantia de que leituras refletem a última escrita |
| **Bounded context** (contexto delimitado) | Fronteira onde um modelo de domínio é válido e consistente |
| **Capacity planning** (planejamento de capacidade) | Estimativa de recursos necessários para atender a demanda prevista |

## O papel do System Design

System Design não descreve **como** o código é escrito. Descreve o sistema visto de fora:

- Quais entidades existem e como se relacionam
- Quais fluxos atravessam o sistema
- Onde estão as fronteiras entre partes independentes
- Em que condições o sistema precisa continuar funcionando

Quando essas perguntas ficam respondidas antes da implementação, o código tem critério de avaliação. Sem elas, cada decisão técnica vira opinião.

## Requisitos funcionais vs não-funcionais

Todo sistema tem dois tipos de requisito que precisam ser explícitos.

| Tipo | Pergunta central | Exemplos |
|---|---|---|
| **Funcional** | O que o sistema faz? | Cadastrar pedido, calcular frete, enviar notificação |
| **Não-funcional** | Como o sistema se comporta? | Responder em menos de 200ms, manter 99.9% de disponibilidade, suportar 10k requisições por minuto |

Requisitos funcionais vêm quase sempre do produto. Requisitos não-funcionais precisam ser perguntados:

- Qual a latência aceitável para cada operação?
- Qual o volume esperado em pico?
- O sistema pode ficar fora do ar por quanto tempo?
- Dados perdidos geram que impacto?
- Qual orçamento de infraestrutura está disponível?

Sem essas respostas, o design assume valores arbitrários e descobre tarde que não são os corretos.

## Processo de decomposição

Decompor um sistema tem uma ordem que funciona:

```
Entidades → Fluxos → Fronteiras → Contratos → Componentes
```

**Entidades**: os substantivos do domínio (Pedido, Usuário, Produto, Pagamento). Aparecem na linguagem do negócio antes de aparecer em qualquer tabela.

**Fluxos**: os verbos que atravessam entidades (criar pedido, confirmar pagamento, enviar notificação). Cada fluxo tem início, meio e fim rastreáveis.

**Fronteiras**: onde um fluxo deixa uma área e entra em outra. Fronteiras viram interfaces no código e pontos de observabilidade em produção.

**Contratos**: o que cada fronteira recebe e retorna. Contrato explícito reduz acoplamento entre componentes.

**Componentes**: a tradução dos blocos anteriores em partes implantáveis. Só nessa etapa aparecem decisões de linguagem, banco e infraestrutura.

Pular etapas cria sistemas onde a implementação não reflete o domínio. Seguir a ordem mantém a linguagem do negócio visível na arquitetura.

## Trade-offs essenciais

Sistema real tem restrições. Não existe solução que otimiza tudo ao mesmo tempo. Os trade-offs mais comuns:

| Eixo | Lado A | Lado B | Como escolher |
|---|---|---|---|
| **Consistência vs Disponibilidade** | Leitura sempre atual | Leitura sempre disponível | Dinheiro e estoque tendem a Consistência; feed e contador tendem a Disponibilidade |
| **Latência vs Throughput** | Resposta rápida por requisição | Volume alto por segundo | Interativo tende a Latência; processamento em lote tende a Throughput |
| **Simplicidade vs Escala** | Monolito vertical | Distribuição horizontal | Começar simples; distribuir só quando medido |
| **Custo vs Performance** | Infra barata, tuning posterior | Infra provisionada para pico | Validar o problema antes de pagar por capacidade ociosa |
| **Consistência forte vs Performance** | Leitura vê última escrita | Leitura desnormalizada mais rápida | Write model para consistência, read model para performance (ver `CQRS` em `patterns.md`) |

O trabalho de design é escolher conscientemente, não evitar a escolha. Evitar a escolha leva ao default da ferramenta, que pode não ser o default do problema.

## Quando System Design começa e termina

**Começa**: assim que o problema é conhecido. Antes de escolher framework, banco ou linguagem.

**Termina**: quando existem respostas para as quatro perguntas:

1. Quais entidades e fluxos compõem o sistema?
2. Quais requisitos não-funcionais ele precisa atender?
3. Quais trade-offs foram aceitos conscientemente?
4. Quais fronteiras e contratos organizam os componentes?

Respondidas essas perguntas, o próximo passo é `patterns.md` (padrões táticos), `architecture.md` (organização de código) e `scaling.md` (técnicas de escala). Aprofundamento em `SLA`, `CAP`, modelos de consistência e capacity planning fica em `system-design-advanced.md`.

## Cross-links

| Quando o design exige | Documento |
|---|---|
| Organizar código por feature ou camada | [`architecture.md`](./architecture.md) |
| Escolher padrão tático (Result, Repository, CQRS) | [`patterns.md`](./patterns.md) |
| Decidir monolito, modular ou microsserviços | [`../process/methodologies.md`](../process/methodologies.md) |
| Escalar horizontalmente, aplicar cache ou CDN | [`scaling.md`](./scaling.md) |
| Comunicação assíncrona entre componentes | [`../platform/messaging.md`](../platform/messaging.md) |
| Performance de query e operações de dados | [`../platform/database.md`](../platform/database.md) |
| Requisitos de segurança e proteção de dados | [`../platform/security.md`](../platform/security.md) |
| SLA, CAP, capacity planning, sharding | [`system-design-advanced.md`](./system-design-advanced.md) |
