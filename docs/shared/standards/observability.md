# Observability

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Observabilidade é a capacidade de entender o estado interno do sistema a partir de seus outputs (saídas).
Logging estruturado, níveis consistentes, proteção de dados sensíveis e rastreamento de requisição
são as quatro alavancas fundamentais, independente de linguagem ou plataforma.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Logging** (registro estruturado) | Emissão de eventos do sistema como objetos com campos nomeados, pesquisáveis por ferramentas de observabilidade |
| **APM** (Application Performance Monitoring, monitoramento de performance de aplicações) | Rastreamento distribuído de requisições, latência e erros em toda a stack |
| **Correlation ID** (identificador de correlação) | Identificador único gerado na borda e propagado por todos os logs de uma requisição para rastreamento ponta a ponta |
| **Stack trace** (rastreamento de pilha) | Sequência de chamadas de função que levou a um erro |
| **Runtime** (tempo de execução) | Período em que o processo está rodando; logs de nível `debug` são suprimidos em produção |

## Logging estruturado

Logs como strings são invisíveis para ferramentas de observabilidade. Logs como objetos com
campos nomeados permitem busca por campo, correlação e alertas automatizados.

| Anti-pattern | Problema | Ação |
| --- | --- | --- |
| `"Order 123 created by user 456"` | Não pesquisável por campo | Logar objeto com campos `orderId` e `userId` separados |
| `"Error: " + error.message` | Perde stack trace e contexto | Passar o objeto de erro diretamente ao logger |
| Serializar objeto completo | Vaza dados sensíveis sem controle | Projetar explicitamente os campos permitidos |

## Níveis de log

Cada nível tem um contrato claro. Usar o nível errado polui o output e esconde sinais reais.

| Nível | Quando usar | Exemplo |
| --- | --- | --- |
| **debug** | Diagnóstico local, nunca em produção | Parâmetros de query, valores intermediários |
| **info** | Evento esperado do fluxo normal | Order created, user authenticated |
| **warn** | Inesperado, mas o sistema continua | Query lenta, retry (nova tentativa), config ausente com fallback (solução alternativa) |
| **error** | Falha que requer atenção, com stack trace (rastreamento de pilha) | Exception, I/O failure, assertion violada |

## O que nunca logar

Logs são persistidos, indexados e acessíveis por múltiplos sistemas. Um dado sensível em log é um
vazamento permanente, mesmo que o log seja deletado depois.

| Nunca logar | Logar no lugar |
| --- | --- |
| Email, CPF, telefone, endereço | ID do usuário |
| Senha, token, API key, JWT | Nada: nem prefixo |
| Número de cartão, CVV | Payment ID + last4 |
| Stack trace com dados de usuário | Stack trace sanitizado |

## Correlation ID

Uma requisição atravessa múltiplos serviços e gera dezenas de log entries. Sem um identificador
comum, rastrear uma transação de ponta a ponta é inviável.

O correlation ID entra pelo header (cabeçalho) `X-Correlation-Id`; se ausente, é gerado na borda. Todo log
entry da requisição carrega esse ID. A resposta retorna o header ao cliente.

```
Request → [middleware: extrai ou gera correlationId]
                        ↓
         [propaga para todos os log entries da request]
                        ↓
         [retorna X-Correlation-Id no response]
```

## Ferramentas

| Ferramenta | Uso primário |
| --- | --- |
| Pino / Serilog | Logging estruturado no runtime (tempo de execução) |
| Datadog | Logs, métricas, **APM** (Application Performance Monitoring, monitoramento de performance de aplicações) distribuído |
| Grafana + Loki | Dashboards (painéis), logs centralizados |
| CloudWatch | Logs e métricas AWS-native |
| New Relic | APM, distributed tracing (rastreamento distribuído), dashboards |
| Sentry | Error tracking (rastreamento de erros), performance monitoring (monitoramento de performance) |
