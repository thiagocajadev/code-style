# Performance

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Performance é uma decisão de design. As escolhas de paginação, cache (armazenamento temporário de respostas), processamento assíncrono e lazy loading determinam se o sistema escala ou trava sob carga real.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Cache** (armazenamento temporário) | Resposta armazenada para evitar recomputação ou nova consulta ao banco |
| **TTL** (Time To Live, tempo de vida) | Tempo durante o qual uma entrada em cache é considerada válida |
| **Offset/limit** (paginação por deslocamento e quantidade) | Modelo de paginação que pula N registros e retorna os próximos M |
| **Cursor** | Referência ao último item retornado, usada para paginação estável em dados que mudam |
| **Lazy loading** (carregamento sob demanda) | Carregar dados ou código apenas no momento em que são necessários |
| **N+1** | Anti-padrão que executa uma query por item de uma lista em vez de uma única query em lote |
| **Connection pooling** (agrupamento de conexões) | Reutilização de conexões abertas com o banco para reduzir o custo de handshake por requisição |
| **I/O** (Input/Output, entrada/saída) | Operações que leem ou escrevem em sistemas externos: banco, rede, disco |

## Paginação

Retornar todos os registros de uma tabela numa única resposta é a forma mais rápida de tornar um endpoint (ponto de acesso da API) inutilizável em produção. A quantidade de dados cresce, o tempo de resposta cresce junto, e o cliente precisa processar mais do que vai usar.

Dois modelos cobrem a maioria dos casos:

| Modelo | Como funciona | Melhor para |
|---|---|---|
| **Offset/limit** | `LIMIT 20 OFFSET 40` (pula N registros) | Listagens com navegação por página |
| **Cursor** | Referência ao último item retornado | Feeds infinitos, dados que mudam frequentemente |

Offset/limit (paginação por deslocamento e quantidade) tem um problema em dados mutáveis: se um registro é inserido ou removido entre páginas, a numeração muda e itens aparecem duplicados ou somem. Cursor evita isso usando o ID ou timestamp (registro de data e hora) do último item como âncora.

A resposta de uma lista paginada inclui os dados e metadados de navegação: total de registros, próxima página ou próximo cursor. O cliente nunca precisa fazer uma segunda chamada só para saber se há mais dados.

## Cache

Cache serve uma resposta armazenada em vez de recomputar. O benefício é direto: menos banco, menos **CPU** (Central Processing Unit, unidade de processamento), menos latência. O risco também: dados desatualizados chegando ao cliente como se fossem frescos.

A decisão central é o **TTL** (Time To Live, tempo de vida): por quanto tempo a resposta armazenada é considerada válida. TTL curto = cache quente mas dado fresco. TTL longo = menos pressão no banco, dado potencialmente obsoleto.

| Estratégia | Quando usar |
|---|---|
| **Cache-aside** | App verifica cache → miss (ausência no cache) → busca no banco → armazena | Leituras frequentes, escrita infrequente |
| **Write-through** | Escrita vai ao banco e ao cache ao mesmo tempo | Consistência alta, latência de escrita aceitável |
| **Invalidação por evento** | Cache limpo quando dado muda | Dado crítico que não pode ser obsoleto |

Dados que mudam frequentemente com custo de desatualização alto (saldo, estoque, status de pedido) não devem ser cacheados sem invalidação ativa. Dados estáticos ou de baixa criticidade (listas de países, configurações de layout) são candidatos naturais a TTL longo.

## Fila e Processamento Assíncrono

Operações lentas dentro de uma requisição HTTP aumentam a latência percebida pelo usuário e travam o worker enquanto esperam. Envio de e-mail, geração de relatório, resize de imagem, integração com serviço externo: nenhuma dessas operações precisa bloquear a resposta.

O padrão é: aceitar o trabalho, responder imediatamente, processar em background.

```
Request → persiste job → 202 Accepted → Worker processa → notifica resultado
```

Benefícios diretos: tempo de resposta previsível, isolamento de falhas (job falha sem derrubar o request), retry automático em falhas transitórias.

**Quando usar fila:**
- Operação leva mais de ~500ms
- Depende de serviço externo com SLA variável
- Pode falhar e precisa de retry
- Volume pode criar picos que o banco não absorve em tempo real

## Webhook

Webhook (notificação HTTP enviada pelo servidor ao cliente quando o job conclui) elimina o polling: o servidor chama o cliente, sem o cliente precisar perguntar.

```
Worker conclui job → POST <endpoint-do-cliente> → Cliente responde 200 OK
```

| Prática | Motivo |
|---|---|
| ID do job no payload | Idempotência: reentregas não duplicam efeito |
| Assinar com **HMAC** (Hash-based Message Authentication Code, código de autenticação de mensagem por hash) | Valida que a chamada veio do servidor esperado |
| Retry com backoff (espera crescente entre tentativas) exponencial | Absorve falhas transitórias sem sobrecarregar o cliente |
| Registrar todas as tentativas | Auditoria e diagnóstico de entrega |

**Quando usar**: cliente expõe endpoint público, job pode levar minutos ou horas.

## Polling

Polling (consulta periódica ao servidor) é o cliente verificando o status do job em intervalos regulares até a resposta estar pronta.

```
GET /jobs/{id}/status → 202 In Progress → GET /jobs/{id}/status → 200 Done + resultado
```

Sem dependência de endpoint no cliente. O custo é carga desnecessária: a maioria das consultas retorna "em processamento".

**Long polling** (polling que segura a conexão aberta até ter resposta ou o timeout expirar) reduz esse custo. O servidor só responde quando há dado novo. O cliente reconecta imediatamente após receber.

| Modelo | Intervalo | Impacto |
|---|---|---|
| Short polling | Fixo (ex: 2s) | Simples, cria carga mesmo sem mudança de estado |
| Long polling | Servidor decide | Menos requests, maior complexidade no servidor |

**Quando usar**: cliente sem endpoint público, processamento de duração previsível e curta.

## WebSocket

WebSocket (canal bidirecional persistente entre cliente e servidor) mantém uma conexão aberta. O servidor envia o resultado quando o job conclui, sem o cliente perguntar.

```
Cliente conecta → handshake → [conexão ativa] → Servidor envia resultado → Cliente processa
```

Menor latência entre as três opções: o resultado chega assim que disponível, sem intervalo de polling e sem overhead (custo extra) de nova conexão HTTP.

O custo é operacional: cada cliente conectado mantém uma conexão aberta no servidor. Gateway, load balancer (balanceador de carga) e infra precisam suportar conexões persistentes, o que afeta o escalonamento horizontal.

**Quando usar**: UI em tempo real, dashboards (painéis ao vivo) e feeds ao vivo, onde a latência mínima justifica a complexidade operacional.

## Lazy Loading

Carregar dados antes de precisar deles desperdiça recursos e aumenta o tempo de inicialização. Lazy loading (carregamento sob demanda) adia o carregamento para o momento do uso.

| Contexto | Aplicação |
|---|---|
| **Banco de dados** | Relacionamentos carregados apenas quando acessados, não no join inicial |
| **Frontend** | Componentes e imagens carregados conforme entram no viewport (área visível da tela) |
| **Módulos** | Código importado só quando o fluxo de execução chega até ele |

O risco clássico é o **N+1**: carregar uma lista de 100 itens e fazer uma query (consulta ao banco) para cada item ao acessar um relacionamento. O resultado são 101 queries em vez de 2. A solução é carregar relacionamentos em lote quando o acesso é previsível.

## Índices e Queries

O banco de dados é o gargalo mais comum em sistemas que não foram desenhados com leitura em mente. Índices corretos mudam queries de segundos para milissegundos.

| Prática | Impacto |
|---|---|
| Indexar colunas de filtro e join (junção de tabelas) | Query usa índice em vez de varrer a tabela inteira |
| Selecionar apenas as colunas necessárias | Reduz **I/O** (Input/Output, Entrada/Saída) e transferência de dados |
| Evitar funções em colunas indexadas no WHERE | Função desabilita o uso do índice |
| Analisar plano de execução | Identifica full scans (varredura completa da tabela) e joins caros antes de ir a produção |

## Conexões e Pool

Abrir uma conexão com o banco tem custo fixo: handshake (negociação de protocolo), autenticação, alocação de recursos. Abrir uma conexão por requisição é insustentável sob carga.

**Connection pooling** (agrupamento de conexões reutilizáveis) mantém um conjunto de conexões abertas e reutilizáveis. A requisição pega uma conexão do pool, usa e devolve. O banco vê um número controlado de conexões, não um pico proporcional ao tráfego.

Tamanho do pool: nem pequeno (requisições esperam) nem grande (banco satura). O número ideal depende do número de workers (processos que atendem requisições) e do tempo médio de uso de cada conexão.
