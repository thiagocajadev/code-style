# Observability

> Escopo: Python. Idiomas específicos deste ecossistema.

Log é a primeira linha de diagnóstico. Um log útil diz quem, o quê e por quê — sem expor dados
sensíveis e sem poluir com ruído.

## print() em produção

`print()` não tem nível, não tem contexto e não é capturável por sistemas de log. Use o módulo
`logging` padrão ou uma biblioteca estruturada como `structlog`.

<details>
<summary>❌ Bad — print() sem nível, sem contexto</summary>
<br>

```python
def process_order(order_id: int):
    print("processing order", order_id)
    print("done")
```

</details>

<br>

<details>
<summary>✅ Good — logging com nível e contexto</summary>
<br>

```python
import logging

logger = logging.getLogger(__name__)

def process_order(order_id: int):
    logger.info("processing order", extra={"order_id": order_id})
    invoice = execute_processing(order_id)

    logger.info("order processed", extra={"order_id": order_id, "invoice_id": invoice.invoice_id})

    return invoice
```

</details>

## Níveis de log

Cada nível tem um significado fixo. Usar o nível errado polui o output e dificulta alertas.

| Nível | Quando usar |
| --- | --- |
| `DEBUG` | Detalhes de execução para diagnóstico local; nunca em produção |
| `INFO` | Eventos de negócio relevantes: pedido criado, pagamento aprovado |
| `WARNING` | Situação inesperada mas recuperável: retry, fallback ativado |
| `ERROR` | Falha que interrompeu uma operação: exceção capturada na fronteira |
| `CRITICAL` | Falha que compromete o sistema inteiro: indisponibilidade de banco |

<details>
<summary>❌ Bad — nível errado para o contexto</summary>
<br>

```python
logger.info("Database connection failed")    # deveria ser ERROR
logger.error("User logged in")               # deveria ser INFO
logger.debug("Payment processed successfully")  # deveria ser INFO
```

</details>

<br>

<details>
<summary>✅ Good — nível correto para cada evento</summary>
<br>

```python
logger.info("user logged in", extra={"user_id": user.user_id})
logger.info("payment processed", extra={"order_id": order.order_id})

logger.error("database connection failed", extra={"host": db_host}, exc_info=True)
```

</details>

## PII em logs

Dados pessoais (nome, e-mail, CPF, número de cartão) não entram em logs. Logar apenas
identificadores opacos — IDs que não revelam a pessoa.

<details>
<summary>❌ Bad — dados pessoais expostos no log</summary>
<br>

```python
logger.info(f"processing payment for {user.name} ({user.email}), card {card.number}")
```

</details>

<br>

<details>
<summary>✅ Good — apenas identificadores opacos</summary>
<br>

```python
logger.info(
    "processing payment",
    extra={"user_id": user.user_id, "order_id": order.order_id},
)
```

</details>

## Logging estruturado com correlation_id

Em sistemas distribuídos, rastrear uma requisição entre serviços exige um identificador comum.
Propague o `correlation_id` por todas as chamadas de **I/O** (Input/Output, Entrada/Saída).

<details>
<summary>❌ Bad — logs sem contexto de rastreamento</summary>
<br>

```python
async def handle_order(order_id: int):
    logger.info("handling order")
    order = await get_order(order_id)
    invoice = await issue_invoice(order)

    logger.info("order handled")

    return invoice
```

</details>

<br>

<details>
<summary>✅ Good — correlation_id propagado em todos os logs da operação</summary>
<br>

```python
import uuid

async def handle_order(order_id: int, correlation_id: str | None = None):
    correlation_id = correlation_id or str(uuid.uuid4())
    context = {"order_id": order_id, "correlation_id": correlation_id}

    logger.info("handling order", extra=context)
    order = await get_order(order_id)

    invoice = await issue_invoice(order)
    logger.info("order handled", extra={**context, "invoice_id": invoice.invoice_id})

    return invoice
```

</details>

## Logging de exceções

Ao capturar uma exceção, use `exc_info=True` ou `logger.exception()` para incluir o traceback.
Sem ele, o log não diz onde o erro ocorreu.

<details>
<summary>❌ Bad — exceção capturada sem traceback</summary>
<br>

```python
async def process_payment(payment_id: int):
    try:
        result = await payment_gateway.charge(payment_id)

        return result
    except Exception as error:
        logger.error(f"payment failed: {error}")  # sem traceback
        raise
```

</details>

<br>

<details>
<summary>✅ Good — exc_info preserva o traceback completo</summary>
<br>

```python
async def process_payment(payment_id: int):
    try:
        result = await payment_gateway.charge(payment_id)

        return result
    except Exception:
        logger.error("payment failed", extra={"payment_id": payment_id}, exc_info=True)
        raise
```

</details>
