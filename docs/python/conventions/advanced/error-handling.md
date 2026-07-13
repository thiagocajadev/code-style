# Tratamento de erro em Python

> Escopo: Python. Idiomas específicos deste ecossistema.

Um erro bem estruturado diz de que tipo ele é. O cliente inadimplente é um **problema de negócio**, e a resposta certa é uma mensagem que o usuário entende. O banco fora do ar é uma **falha técnica**, e a resposta certa é um alerta para quem está de plantão. Quando os dois viram o mesmo `Exception` genérico, quem trata lá na frente não tem como distinguir.

O `try/except` serve para capturar o erro e decidir o que fazer com ele. Um `except` que registra a falha e devolve `None` deixa o programa seguir com um valor vazio, e o problema reaparece páginas adiante, longe da causa.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Exception** (exceção) | Classe base dos erros. Criar uma subclasse dela é como se define um erro do seu domínio |
| **EAFP** (Easier to Ask Forgiveness than Permission · Mais fácil pedir perdão que permissão) | O estilo idiomático em Python: tente a operação e capture a falha se ela vier |
| **LBYL** (Look Before You Leap · Olhe antes de saltar) | O estilo defensivo, com um `if` conferindo antes da operação |
| **context manager** (gerenciador de contexto) | O objeto usado com `with`: ele abre o recurso e garante o fechamento mesmo se der erro no meio |
| **traceback** (rastreamento de pilha) | A sequência de chamadas que levou até a exceção |
| **exception chaining** (encadeamento de exceções) | `raise ... from err`: guarda o erro original dentro do novo, e o traceback mostra os dois |
| **bare except** (except sem tipo) | O `except:` que captura qualquer coisa, inclusive o `Ctrl+C` do usuário e o erro de digitação no seu código |

<a id="multiple-return-types"></a>

## Uma função que devolve três tipos diferentes

Quando a função devolve `None` num caso, `False` em outro e um dicionário no terceiro, quem chama precisa distinguir os três. O `if result:` do exemplo abaixo trata `None` e `False` do mesmo jeito, e as duas falhas viram uma só, sem que ninguém perceba.

Escolha um contrato: ou a função sempre devolve o resultado, ou ela levanta uma exceção que diz qual foi o problema.

<details>
<summary>❌ Ruim: None, False e um dicionário saindo da mesma função</summary>

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

<a id="exception-as-string"></a>

## Exceção como string

`raise "User not found"` nem funciona em Python moderno, e a intenção por trás dele é o problema real: um erro sem tipo. Quem captura lá na frente não tem como perguntar se aquilo foi um recurso ausente ou uma falha de conexão, porque não há classe para testar. Levante uma exceção tipada, e quem trata escolhe o `except` certo.

<details>
<summary>❌ Ruim: um texto solto, sem classe para o except reconhecer</summary>

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

## Uma hierarquia de erros para a aplicação inteira

Uma classe base própria concentra o que todo erro da aplicação carrega: a mensagem, a ação que o usuário pode tomar e o código HTTP que aquele erro vira na resposta. As subclasses só declaram o que muda.

O ganho aparece no limite do sistema. O handler HTTP captura `AppError`, chama `to_dict()` e responde, sem um `if` para cada tipo de erro. E o erro que não descende de `AppError` é justamente o inesperado, que merece um 500 e um alerta.

<details>
<summary>❌ Ruim: texto solto no raise, e um except que devolve None</summary>

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

<a id="swallowed-error"></a>

## O try/except que captura o erro e não avisa ninguém

O `except Exception` que imprime uma linha e devolve `None` faz o programa continuar como se nada tivesse acontecido. A falha some do lugar onde aconteceu, e reaparece adiante como um `None` inesperado, num trecho que não tem relação com a causa. Quem for depurar começa a investigação no lugar errado.

Duas saídas honestas. Se esta camada não sabe o que fazer com o erro, deixe ele subir. Se ela sabe, capture o tipo específico, acrescente contexto e levante um erro da sua hierarquia com `raise ... from cause`, que preserva o traceback original.

<details>
<summary>❌ Ruim: captura tudo, imprime uma linha e devolve None</summary>

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
<summary>✅ Bom: propaga com contexto, e o limite do sistema trata</summary>

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

O Python 3.14 (PEP 758) permite listar vários tipos num `except` sem os parênteses, desde que não haja cláusula `as`. Os parênteses continuam necessários quando você precisa do `as` para inspecionar o erro, e continuam recomendados quando o grupo passa de dois tipos, porque a linha fica longa.

<details>
<summary>❌ Ruim: dois except separados fazendo a mesma coisa</summary>

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
<summary>✅ Bom: os dois tipos no mesmo except, sem parênteses (Python 3.14+)</summary>

```python
try:
    connect()
except TimeoutError, ConnectionRefusedError:
    retry()
```

</details>

<details>
<summary>✅ Bom: parênteses quando o as é necessário para inspecionar o erro</summary>

```python
try:
    connect()
except (TimeoutError, ConnectionRefusedError) as error:
    log_connection_failure(error)
    retry()
```

</details>

## Exceção para um caso que não é excepcional

Uma chave ausente num dicionário acontece o tempo todo, e a linguagem já oferece `.get()` para isso. Montar um `try/except KeyError` em volta acrescenta três linhas e usa o mecanismo de erro para uma decisão de rotina.

O `except` merece o caso que sai do previsto: a rede caiu, o arquivo sumiu, o banco recusou a escrita.

<details>
<summary>❌ Ruim: try/except em volta de um acesso que pode falhar por rotina</summary>

```python
def get_user(user_id: int):
    try:
        return user_map[user_id]  # KeyError não é uma exceção de negócio
    except KeyError:
        return None
```

</details>

<details>
<summary>✅ Bom: .get() resolve a chave ausente numa linha</summary>

```python
def get_user(user_id: int):
    user = user_map.get(user_id)
    return user
```

</details>

### Quando usar try/except

| Use | Evite |
| --- | --- |
| Entrada e saída externas: banco, rede, arquivo | Em volta de chamadas que já propagam o erro sozinhas |
| No limite do sistema, como o handler HTTP | Para registrar a falha e seguir como se nada tivesse acontecido |
| Para traduzir um erro técnico em erro de negócio | Quando a camada de cima já vai tratar aquele erro |
