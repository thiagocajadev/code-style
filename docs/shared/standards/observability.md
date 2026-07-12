# Observabilidade

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Observabilidade é a capacidade de entender o estado interno do sistema a partir das suas **outputs** (saídas). A principal dessas saídas é o **log** (registro de um evento que o sistema emitiu enquanto rodava: uma requisição atendida, um erro, uma query lenta). Quatro práticas sustentam a observabilidade em qualquer linguagem ou plataforma: emitir o log de forma estruturada, usar níveis consistentes, proteger dados sensíveis e rastrear cada requisição de ponta a ponta.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Logging** (registro estruturado) | Emissão de eventos do sistema como objetos com campos nomeados, pesquisáveis por ferramentas de observabilidade |
| **APM** (Application Performance Monitoring · Monitoramento de Performance de Aplicações) | Rastreamento distribuído de requisições, latência e erros em toda a stack |
| **Correlation ID** (identificador de correlação) | Identificador único gerado na borda e propagado por todos os logs de uma requisição para rastreamento ponta a ponta |
| **Stack trace** (rastreamento de pilha) | Sequência de chamadas de função que levou a um erro |
| **Runtime** (tempo de execução) | Período em que o processo está rodando; logs de nível `debug` são suprimidos em produção |

## Logging estruturado

Uma ferramenta de observabilidade não consegue pesquisar dentro de um log escrito como texto corrido. Emitir o log como objeto com campos nomeados permite busca por campo, correlação entre eventos e alerta automatizado.

| Anti-pattern | Problema | Ação |
| --- | --- | --- |
| `"Order 123 created by user 456"` | Não pesquisável por campo | Logar objeto com campos `orderId` e `userId` separados |
| `"Error: " + error.message` | Perde stack trace e contexto | Passar o objeto de erro diretamente ao logger |
| Serializar objeto completo | Vaza dados sensíveis sem controle | Projetar explicitamente os campos permitidos |

## Níveis de log

Cada nível tem um contrato definido. Usar o nível errado enche a saída de ruído e esconde os sinais que importam.

| Nível | Quando usar | Exemplo |
| --- | --- | --- |
| **debug** | Diagnóstico local, nunca em produção | Parâmetros de query, valores intermediários |
| **info** | Evento esperado do fluxo normal | Order created, user authenticated |
| **warn** | Inesperado, mas o sistema continua | Query lenta, retry (nova tentativa), config ausente com fallback (solução alternativa) |
| **error** | Falha que requer atenção, com stack trace (rastreamento de pilha) | Exception, I/O failure, assertion violada |

## O que nunca logar

Logs são persistidos, indexados e lidos por vários sistemas. Um dado sensível que entra no log vaza de forma permanente, mesmo que o log seja apagado depois.

| Nunca logar | Logar no lugar |
| --- | --- |
| Email, CPF, telefone, endereço | ID do usuário |
| Senha, token, API key, JWT | Nada: nem prefixo |
| Número de cartão, CVV | Payment ID + last4 |
| Stack trace com dados de usuário | Stack trace sanitizado |

<a id="correlation-id"></a>

## ID de correlação

Uma requisição atravessa vários serviços e gera dezenas de entradas de log. Um identificador comum a todas elas é o que torna possível rastrear a transação de ponta a ponta.

O correlation ID chega pelo header (cabeçalho) `X-Correlation-Id` e, quando ausente, é gerado na borda. Toda entrada de log da requisição carrega esse ID, e a resposta devolve o header ao cliente.

```
Request → middleware extrai ou gera correlationId → propaga para todos os log entries → response retorna X-Correlation-Id
```

## Ferramentas

| Ferramenta | Uso primário |
| --- | --- |
| Pino / Serilog | Logging estruturado no runtime (tempo de execução) |
| Datadog | Logs, métricas, **APM** (Application Performance Monitoring · Monitoramento de Performance de Aplicações) distribuído |
| Grafana + Loki | Dashboards (painéis), logs centralizados |
| CloudWatch | Logs e métricas AWS-native |
| New Relic | APM, distributed tracing (rastreamento distribuído), dashboards |
| Sentry | Error tracking (rastreamento de erros), performance monitoring (monitoramento de performance) |
