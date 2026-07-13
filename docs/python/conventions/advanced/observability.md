# Observabilidade em Python

> Escopo: Python. Idiomas específicos deste ecossistema.

Quando algo quebra em produção, o log é o que você tem. Ele precisa dizer qual operação estava rodando, sobre qual registro, e o que deu errado, sem carregar o nome e o email de ninguém junto.

Esta página trata do que registrar, em que nível, e como amarrar os registros de uma mesma requisição para conseguir segui-la entre serviços.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **logging** (módulo de log da biblioteca padrão) | Vem com o Python. Tem níveis, e permite escolher para onde o log vai |
| **structlog** (biblioteca de log estruturado) | Escreve o log em pares de chave e valor, ou em JSON, prontos para a ferramenta que indexa |
| **log level** (nível do log) | A gravidade do evento: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| **structured log** (log estruturado) | O log escrito em campos, e não numa frase. Permite filtrar por `order_id` na ferramenta de busca |
| **PII** (Personally Identifiable Information · Informações de Identificação Pessoal) | O dado que identifica uma pessoa: nome, email, CPF, cartão. Fica de fora do log |
| **correlation id** (identificador de correlação) | O código único da requisição, repetido em todo log que ela gera. É o que permite juntar os registros dela |
| **OpenTelemetry** (padrão aberto de telemetria) | O padrão que os serviços usam para trocar rastros, métricas e logs entre si |

## print() em produção

O `print()` escreve no terminal e para por aí. Ele não tem nível, então não dá para filtrar; não tem campos, então não dá para buscar por pedido; e a ferramenta que recolhe os logs do servidor não o distingue de qualquer outra saída.

Use o módulo `logging`, que vem com a linguagem, ou uma biblioteca de log estruturado como o `structlog`.

<details>
<summary>❌ Ruim: print() sem nível e sem campos para buscar depois</summary>

```python
def process_order(order_id: int):
    print("processing order", order_id)
    print("done")
```

</details>

<details>
<summary>✅ Bom: o log tem nível, e o id do pedido vai separado da mensagem</summary>

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

O nível é o que permite montar alerta e filtrar ruído. Se a queda do banco entra como `INFO`, ela se perde no meio de milhares de linhas de rotina, e o alerta que dispara em `ERROR` nunca toca.

| Nível | Quando usar |
| --- | --- |
| `DEBUG` | Detalhe de execução, para diagnóstico na sua máquina. Fica desligado em produção |
| `INFO` | O evento de negócio que aconteceu: pedido criado, pagamento aprovado |
| `WARNING` | Algo saiu do esperado, e o sistema contornou: uma nova tentativa, um caminho alternativo |
| `ERROR` | A operação parou por causa de uma falha: a exceção que o limite do sistema capturou |
| `CRITICAL` | A falha atinge o sistema inteiro: o banco de dados ficou indisponível |

<details>
<summary>❌ Ruim: a queda do banco entra como INFO, e o login como ERROR</summary>

```python
logger.info("Database connection failed")    # deveria ser ERROR
logger.error("User logged in")               # deveria ser INFO
logger.debug("Payment processed successfully")  # deveria ser INFO
```

</details>

<details>
<summary>✅ Bom: cada evento no nível que corresponde à gravidade dele</summary>

```python
logger.info("user logged in", extra={"user_id": user.user_id})
logger.info("payment processed", extra={"order_id": order.order_id})

logger.error("database connection failed", extra={"host": db_host}, exc_info=True)
```

</details>

## Dado pessoal não entra no log

Nome, email, CPF e número de cartão ficam de fora. O log é copiado para a ferramenta de busca, fica guardado por meses e é lido por gente que não teria acesso àquele dado no sistema. Registre o identificador, que aponta para a pessoa sem revelá-la.

<details>
<summary>❌ Ruim: nome, email e cartão escritos na linha do log</summary>

```python
logger.info(f"processing payment for {user.name} ({user.email}), card {card.number}")
```

</details>

<details>
<summary>✅ Bom: só os identificadores, que não revelam quem é a pessoa</summary>

```python
logger.info(
    "processing payment",
    extra={"user_id": user.user_id, "order_id": order.order_id},
)
```

</details>

## O correlation_id, que amarra os logs de uma requisição

Uma requisição atravessa vários serviços e gera dezenas de linhas de log, misturadas com as de todas as outras requisições que rodavam ao mesmo tempo. Sem um código comum entre elas, não há como reconstruir o que aconteceu numa só.

O `correlation_id` é esse código. Ele nasce na entrada, viaja em toda chamada que sai para fora, e vai em todo log. Na ferramenta de busca, filtrar por ele devolve a história completa daquela requisição.

<details>
<summary>❌ Ruim: os logs não dizem de qual requisição vieram</summary>

```python
async def handle_order(order_id: int):
    logger.info("handling order")
    order = await get_order(order_id)
    invoice = await issue_invoice(order)

    logger.info("order handled")

    return invoice
```

</details>

<details>
<summary>✅ Bom: o mesmo correlation_id aparece em todos os logs da operação</summary>

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

## Registrar a exceção com o rastro de onde ela nasceu

Passe `exc_info=True` no `logger.error`, ou use `logger.exception()`. Os dois anexam o **traceback** (a sequência de chamadas até o ponto do erro).

Sem ele, o log guarda só o texto da exceção. Um "connection refused" solto não diz qual das quatro chamadas de rede daquela função falhou, e a investigação começa do zero.

<details>
<summary>❌ Ruim: só o texto do erro, sem dizer onde ele aconteceu</summary>

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

<details>
<summary>✅ Bom: exc_info anexa a sequência de chamadas até o erro</summary>

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
