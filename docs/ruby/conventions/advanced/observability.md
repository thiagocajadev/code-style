# Observability

> Escopo: Ruby 4.0. Padrões transversais de observabilidade em [shared/standards/observability.md](../../../../shared/standards/observability.md).

Logs estruturados (JSON) permitem busca e correlação por ferramentas de observabilidade.
Ruby oferece `Logger` na stdlib (biblioteca padrão); `semantic_logger` adiciona saída JSON,
correlação por tag e integração com Rails.

## Conceitos fundamentais

| Conceito              | O que é                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| **Logger**            | Classe stdlib para logging com níveis (DEBUG, INFO, WARN, ERROR, FATAL)       |
| **semantic_logger**   | Gem que substitui Logger; emite JSON estruturado com campos padronizados       |
| **correlation_id**    | Identificador único de requisição propagado entre serviços para rastreamento  |
| **tag**               | Contexto fixo adicionado ao logger (user_id, request_id) para todos os logs   |

## Log estruturado com semantic_logger

<details>
<summary>❌ Bad — log de texto livre sem estrutura</summary>
<br>

```ruby
# frozen_string_literal: true

def submit_order(order)
  puts "Processing order #{order.id} for user #{order.user_id}"
  process(order)
  puts "Done"
rescue StandardError => error
  puts "Error: #{error.message}"
  raise
end
```

</details>

<br>

<details>
<summary>✅ Good — log estruturado com campos semânticos</summary>
<br>

```ruby
# frozen_string_literal: true

class OrderService
  include SemanticLogger::Loggable

  def submit(order)
    logger.info("order.submit.started", order_id: order.id, user_id: order.user_id)

    result = process(order)

    logger.info("order.submit.completed", order_id: order.id, total: order.total)

    result
  rescue OrderErrors::PaymentFailed => error
    logger.error("order.submit.payment_failed", order_id: order.id, reason: error.message)
    raise
  end
end
```

</details>

## Níveis de log

| Nível    | Quando usar                                                              |
| -------- | ------------------------------------------------------------------------ |
| `debug`  | Detalhes internos; desabilitado em produção                              |
| `info`   | Eventos de negócio importantes (order criada, pagamento confirmado)      |
| `warn`   | Situação anormal mas recuperável (retry, fallback ativado)               |
| `error`  | Falha operacional — requer atenção (exceção capturada, job falhou)       |
| `fatal`  | Falha irrecuperável — processo deve ser encerrado                        |

## Contexto com tagged logging

Adicione contexto de request ao logger para que todos os logs da requisição compartilhem
os mesmos campos.

```ruby
# frozen_string_literal: true

# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  around_action :log_with_request_context

  private

  def log_with_request_context
    SemanticLogger.tagged(
      request_id: request.request_id,
      user_id: current_user&.id
    ) do
      yield
    end
  end
end
```

## Logger padrão (sem gems)

Para scripts ou projetos sem Rails, use `Logger` da stdlib com formatter JSON:

```ruby
# frozen_string_literal: true

require "logger"
require "json"

logger = Logger.new($stdout)
logger.formatter = proc do |severity, datetime, _progname, message|
  JSON.generate(
    level: severity,
    time: datetime.utc.iso8601,
    message: message
  ) + "\n"
end

logger.info("application started")
```

## Não logar PII

**PII** (Personally Identifiable Information, Informação Pessoal Identificável) como
email, CPF e senha nunca entram em logs.

<details>
<summary>❌ Bad — dados pessoais no log</summary>
<br>

```ruby
# frozen_string_literal: true

logger.info("user login", email: user.email, password: params[:password])
```

</details>

<br>

<details>
<summary>✅ Good — apenas identificadores opacos</summary>
<br>

```ruby
# frozen_string_literal: true

logger.info("user.login.success", user_id: user.id)
```

</details>
