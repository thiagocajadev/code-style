# Error Handling

> Escopo: Python. Idiomas específicos deste ecossistema.

Erros bem estruturados separam o que é **problema de negócio** do que é **falha técnica**.
`try/except` existe para capturar, nunca para esconder.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Exception** (exceção) | classe base de erros; subclasse para criar tipos de domínio |
| **EAFP** (Easier to Ask Forgiveness than Permission, Mais fácil pedir perdão que permissão) | estilo idiomático Python: tente a operação e capture a falha |
| **LBYL** (Look Before You Leap, Olhe antes de saltar) | estilo defensivo com `if` antes da operação; menos pythônico |
| **context manager** (gerenciador de contexto) | objeto usado com `with` que garante setup e teardown mesmo em erro |
| **traceback** (rastreamento de pilha) | sequência de chamadas que levou à exceção |
| **exception chaining** (encadeamento de exceções) | `raise ... from err` preserva a causa raiz |
| **bare except** (except genérico) | `except:` sem tipo; mascara erros e nunca deve ser usado |

## Múltiplos tipos de retorno

<details>
<summary>❌ Ruim: None, False e objeto na mesma função</summary>

```python
def process_order(order):
    if not order:
        return None
    if not order.items:
        return None

    if order.customer.defaulted:
        return False

    return {"success": True, "order": order}

result = process_order(order)
if result:  # False passa, None também
    ...
```

</details>

<details>
<summary>✅ Bom: contrato consistente, sempre o mesmo formato</summary>

```python
def process_order(order):
    if not order:
        raise ValidationError("Order is required.")
    if not order.items:
        raise ValidationError("Order has no items.")

    if order.customer.defaulted:
        raise BusinessError("Customer has unsettled debts.")

    processed_order = {"success": True, "order": order}
    return processed_order
```

</details>

## Exceção como string

<details>
<summary>❌ Ruim: string solta, impossível tratar com isinstance</summary>

```python
async def find_user(user_id: int):
    user = await database.query(user_id)

    if not user:
        raise "User not found"  # sem tipo, sem contexto

    return user
```

</details>

<details>
<summary>✅ Bom: exceções tipadas, identificáveis e tratáveis</summary>

```python
async def find_user(user_id: int):
    user = await user_repository.find_by_id(user_id)

    if not user:
        raise NotFoundError(f"User {user_id} not found.")

    return user
```

</details>

## BaseError: abstração centralizada

<details>
<summary>❌ Ruim: raise com string solta, sem tipo, sem contrato</summary>

```python
async def find_user(user_id: int):
    user = await database.query(user_id)
    if not user:
        raise "User not found"

    return user

async def process_order(order_id: int):
    try:
        order = await get_order(order_id)
        return order
    except Exception:
        print("something went wrong")  # engole o erro
        return None
```

</details>

<details>
<summary>✅ Bom: hierarquia centralizada para todos os erros da aplicação</summary>

```python
# errors.py
class AppError(Exception):
    def __init__(
        self,
        message: str,
        action: str = "Contact support.",
        status_code: int = 500,
    ) -> None:
        super().__init__(message)
        self.action = action
        self.status_code = status_code

    def to_dict(self) -> dict:
        error_envelope = {
            "error": {
                "name": self.__class__.__name__,
                "message": str(self),
                "action": self.action,
                "status_code": self.status_code,
            }
        }

        return error_envelope

class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found.", action: str = "Check if the resource exists.") -> None:
        super().__init__(message, action, status_code=404)

class ValidationError(AppError):
    def __init__(self, message: str = "Invalid input.", action: str = "Review the input data.") -> None:
        super().__init__(message, action, status_code=400)

class BusinessError(AppError):
    def __init__(self, message: str, action: str = "Review the business rules.") -> None:
        super().__init__(message, action, status_code=422)

class InternalServerError(AppError):
    def __init__(self, cause: Exception | None = None) -> None:
        super().__init__("An unexpected error occurred.", status_code=500)
        self.__cause__ = cause
```

</details>

## try/except que engole o erro

<details>
<summary>❌ Ruim: captura, loga e retorna None</summary>

```python
async def find_product_by_id(product_id: int):
    try:
        product = await database.query(product_id)

        if not product:
            raise "Product not found"

        return product
    except Exception:
        print("Something went wrong")  # engole o erro
        return None
```

</details>

<details>
<summary>✅ Bom: propaga com contexto, trata na fronteira</summary>

```python
async def find_product_by_id(product_id: int):
    try:
        product = await product_repository.find_by_id(product_id)

        if not product:
            raise NotFoundError(
                f"Product {product_id} not found.",
                action="Check if the product ID is correct.",
            )

        return product
    except NotFoundError:
        raise
    except Exception as cause:
        raise InternalServerError(cause=cause) from cause
```

</details>

## except agrupado (Python 3.14)

Python 3.14 (PEP 758) permite agrupar exceções sem parênteses quando não há cláusula `as`.
Use parênteses quando precisar de `as` ou quando o grupo tiver mais de dois tipos.

<details>
<summary>❌ Ruim: except separado para tipos que recebem o mesmo tratamento</summary>

```python
try:
    connect()
except TimeoutError:
    retry()
except ConnectionRefusedError:
    retry()
```

</details>

<details>
<summary>✅ Bom: excpet agrupado sem parênteses (Python 3.14+)</summary>

```python
try:
    connect()
except TimeoutError, ConnectionRefusedError:
    retry()
```

</details>

<details>
<summary>✅ Bom: parênteses quando há cláusula as ou 3+ tipos</summary>

```python
try:
    connect()
except (TimeoutError, ConnectionRefusedError) as error:
    log_connection_failure(error)
    retry()
```

</details>

## Exceção como controle de fluxo

<details>
<summary>❌ Ruim: try/except controlando lógica de negócio normal</summary>

```python
def get_user(user_id: int):
    try:
        return user_map[user_id]  # KeyError não é uma exceção de negócio
    except KeyError:
        return None
```

</details>

<details>
<summary>✅ Bom: verificação explícita, sem exceção para fluxo normal</summary>

```python
def get_user(user_id: int):
    user = user_map.get(user_id)
    return user
```

</details>

### Quando usar try/except

| Use | Não use |
| --- | --- |
| I/O externo (DB, rede, arquivo) | Para encadear chamadas que já propagam erros |
| Fronteira do sistema (handler HTTP) | Para logar e ignorar: mascara problemas |
| Para mapear erro técnico → erro de negócio | Quando o erro já será tratado em camada superior |
