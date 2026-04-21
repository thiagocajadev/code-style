# Performance

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Performance é uma decisão de design. As escolhas de paginação, cache, processamento assíncrono e lazy loading determinam se o sistema escala ou trava sob carga real.

## Paginação

Retornar todos os registros de uma tabela numa única resposta é a forma mais rápida de tornar um endpoint inutilizável em produção. A quantidade de dados cresce, o tempo de resposta cresce junto, e o cliente precisa processar mais do que vai usar.

Dois modelos cobrem a maioria dos casos:

| Modelo | Como funciona | Melhor para |
|---|---|---|
| **Offset/limit** | `LIMIT 20 OFFSET 40` (pula N registros) | Listagens com navegação por página |
| **Cursor** | Referência ao último item retornado | Feeds infinitos, dados que mudam frequentemente |

Offset tem um problema em dados mutáveis: se um registro é inserido ou removido entre páginas, a numeração muda e itens aparecem duplicados ou somem. Cursor evita isso usando o ID ou timestamp do último item como âncora.

A resposta de uma lista paginada inclui os dados e metadados de navegação: total de registros, próxima página ou próximo cursor. O cliente nunca precisa fazer uma segunda chamada só para saber se há mais dados.

## Cache

Cache serve uma resposta armazenada em vez de recomputar. O benefício é direto: menos banco, menos CPU, menos latência. O risco também: dados desatualizados chegando ao cliente como se fossem frescos.

A decisão central é o **TTL** (Time To Live, Tempo de Vida): por quanto tempo a resposta armazenada é considerada válida. TTL curto = cache quente mas dado fresco. TTL longo = menos pressão no banco, dado potencialmente obsoleto.

| Estratégia | Quando usar |
|---|---|
| **Cache-aside** | App verifica cache → miss → busca no banco → armazena | Leituras frequentes, escrita infrequente |
| **Write-through** | Escrita vai ao banco e ao cache ao mesmo tempo | Consistência alta, latência de escrita aceitável |
| **Invalidação por evento** | Cache limpo quando dado muda | Dado crítico que não pode ser obsoleto |

Dados que mudam frequentemente com custo de desatualização alto (saldo, estoque, status de pedido) não devem ser cacheados sem invalidação ativa. Dados estáticos ou de baixa criticidade (listas de países, configurações de layout) são candidatos naturais a TTL longo.

## Fila e Processamento Assíncrono

Operações lentas dentro de uma requisição HTTP aumentam a latência percebida pelo usuário e travam o worker enquanto esperam. Envio de e-mail, geração de relatório, resize de imagem, integração com serviço externo: nenhuma dessas operações precisa bloquear a resposta.

O padrão é: aceitar o trabalho, responder imediatamente, processar em background.

```
Request → [API aceita + persiste job] → Response 202 Accepted
                      ↓
              [Worker processa job]
                      ↓
           [Notifica resultado: webhook, polling, WS]
```

Benefícios diretos: tempo de resposta previsível, isolamento de falhas (job falha sem derrubar o request), retry automático em falhas transitórias.

**Quando usar fila:**
- Operação leva mais de ~500ms
- Depende de serviço externo com SLA variável
- Pode falhar e precisa de retry
- Volume pode criar picos que o banco não absorve em tempo real

## Lazy Loading

Carregar dados antes de precisar deles desperdiça recursos e aumenta o tempo de inicialização. Lazy loading adia o carregamento para o momento do uso.

| Contexto | Aplicação |
|---|---|
| **Banco de dados** | Relacionamentos carregados apenas quando acessados, não no join inicial |
| **Frontend** | Componentes e imagens carregados conforme entram no viewport |
| **Módulos** | Código importado só quando o fluxo de execução chega até ele |

O risco clássico é o **N+1**: carregar uma lista de 100 itens e fazer uma query para cada item ao acessar um relacionamento. O resultado são 101 queries em vez de 2. A solução é carregar relacionamentos em lote quando o acesso é previsível.

## Índices e Queries

O banco de dados é o gargalo mais comum em sistemas que não foram desenhados com leitura em mente. Índices corretos mudam queries de segundos para milissegundos.

| Prática | Impacto |
|---|---|
| Indexar colunas de filtro e join | Query usa índice em vez de varrer a tabela inteira |
| Selecionar apenas as colunas necessárias | Reduz I/O (Entrada/Saída) e transferência de dados |
| Evitar funções em colunas indexadas no WHERE | Função desabilita o uso do índice |
| Analisar plano de execução | Identifica full scans e joins caros antes de ir a produção |

## Conexões e Pool

Abrir uma conexão com o banco tem custo fixo: handshake, autenticação, alocação de recursos. Abrir uma conexão por requisição é insustentável sob carga.

**Connection pooling** mantém um conjunto de conexões abertas e reutilizáveis. A requisição pega uma conexão do pool, usa e devolve. O banco vê um número controlado de conexões, não um pico proporcional ao tráfego.

Tamanho do pool: nem pequeno (requisições esperam) nem grande (banco satura). O número ideal depende do número de workers e do tempo médio de uso de cada conexão.
