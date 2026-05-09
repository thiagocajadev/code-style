# Async

> Escopo: Ruby 4.0. Padrões agnósticos de I/O assíncrono em [shared/platform/backend-flow.md](../../../../shared/platform/backend-flow.md).

Ruby não tem `async/await` nativo como JavaScript ou Python. Concorrência é modelada com
**Threads** (fios de execução), **Fibers** (fibras — corrotinas cooperativas) e
**Ractors** (atores paralelos com memória isolada, Ruby 3.x+). I/O longo fora do
request cycle vai para **background jobs** (Solid Queue ou Sidekiq).

## Conceitos fundamentais

| Conceito              | O que é                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| **Thread**            | Fio de execução gerenciado pelo SO; GIL limita paralelismo de CPU no MRI    |
| **GIL**               | Global Interpreter Lock — MRI executa 1 thread Ruby por vez (I/O é liberado) |
| **Fiber**             | Corrotina cooperativa leve; `Fiber.yield` suspende, `.resume` retoma        |
| **Fiber Scheduler**   | Interface (Ruby 3.0+) que permite I/O não-bloqueante via gems como `async`  |
| **Ractor**            | Ator paralelo (Ruby 3.x+) com memória própria; paralelismo real de CPU      |
| **Background job**    | Tarefa executada fora do ciclo de request/response (Solid Queue, Sidekiq)   |

## Background jobs

I/O longo (emails, webhooks, relatórios, chamadas externas) sai do request cycle e vai para
um job. Rails 8 usa **Solid Queue** como padrão; **Sidekiq** é preferido para alto volume.

<details>
<summary>❌ Bad — I/O pesado dentro do request</summary>
<br>

```ruby
# frozen_string_literal: true

class OrdersController < ApplicationController
  def create
    order = OrderService.new.submit(order_params)
    PdfGenerator.generate_invoice(order)
    Mailer.send_confirmation(order).deliver_now
    ExternalWarehouse.notify(order)

    render json: order, status: :created
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — I/O longo delegado para jobs</summary>
<br>

```ruby
# frozen_string_literal: true

class OrdersController < ApplicationController
  def create
    order = OrderService.new.submit(order_params)

    InvoiceGenerationJob.perform_later(order.id)
    OrderConfirmationMailer.confirmation(order.id).deliver_later
    WarehouseNotificationJob.perform_later(order.id)

    render json: order, status: :created
  end
end
```

</details>

## Active Job — estrutura de job

Jobs herdam de `ApplicationJob` (que herda de `ActiveJob::Base`). Parâmetros são
serializados — passe apenas IDs, não objetos ActiveRecord.

<details>
<summary>❌ Bad — objeto ActiveRecord como argumento</summary>
<br>

```ruby
# frozen_string_literal: true

class InvoiceGenerationJob < ApplicationJob
  queue_as :default

  def perform(order)
    PdfGenerator.generate(order)
  end
end
```

</details>

<br>

<details>
<summary>✅ Good — ID como argumento, objeto carregado dentro do job</summary>
<br>

```ruby
# frozen_string_literal: true

class InvoiceGenerationJob < ApplicationJob
  queue_as :invoices

  retry_on NetworkError, wait: :polynomially_longer, attempts: 3
  discard_on ActiveRecord::RecordNotFound

  def perform(order_id)
    order = Order.find(order_id)

    PdfGenerator.generate(order)
    order.update!(invoice_generated_at: Time.now.utc)
  end
end
```

</details>

## Fibers — I/O cooperativo

Fibers permitem suspender e retomar execução manualmente. Com a gem `async`, use para
I/O concorrente sem threads.

```ruby
# frozen_string_literal: true

require "async"

def fetch_reports(report_ids)
  Async do |task|
    tasks = report_ids.map do |id|
      task.async { HttpClient.get("/reports/#{id}") }
    end

    reports = tasks.map(&:wait)

    reports
  end
end
```

## Ractors — paralelismo de CPU

Ractors (Ruby 3.x+) executam em paralelo real. Compartilham apenas objetos imutáveis
(frozen). Use para workloads CPU-intensive.

```ruby
# frozen_string_literal: true

def parallel_compute(chunks)
  ractors = chunks.map do |chunk|
    Ractor.new(chunk) { |data| process_chunk(data) }
  end

  results = ractors.map(&:take)

  results
end
```

Ractors ainda são experimentais em workloads com gems que acessam estado global — verifique
compatibilidade antes de usar em produção.
