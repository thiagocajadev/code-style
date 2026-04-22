# HTMX

> Escopo: Python · HTML. Guia baseado em **HTMX 2.0.10** integrado com **FastAPI** e **Jinja2**.

HTMX é uma biblioteca JavaScript que adiciona comportamento hypermedia (hipermídia) ao HTML
padrão. Em vez de uma **SPA** (Single Page Application, Aplicação de Página Única), o browser
troca fragmentos de HTML retornados pelo servidor. Toda a lógica de renderização permanece no
backend Python.

Este guia mostra como estruturar os endpoints FastAPI e os templates Jinja2 para funcionar
com HTMX, seguindo os princípios de [functions.md](../conventions/functions.md).

## Conceitos fundamentais

| Conceito                          | O que é                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| **hx-get / hx-post**              | Atributos que disparam uma requisição HTTP ao servidor no evento configurado                |
| **hx-target**                     | Seletor CSS do elemento onde o fragmento retornado será inserido                            |
| **hx-swap**                       | Estratégia de inserção: `innerHTML`, `outerHTML`, `beforeend`, `afterend`, `delete`         |
| **hx-trigger**                    | Evento que dispara a requisição: `click` (padrão), `change`, `load`, `revealed`             |
| **hx-indicator**                  | ID do elemento exibido enquanto a requisição está em andamento                              |
| **hx-swap-oob**                   | Out-of-band swap (troca fora de banda): atualiza elementos adicionais na mesma resposta     |
| **Fragmento** (partial response)  | HTML parcial retornado pelo servidor; sem `<html>`, `<head>` ou `<body>`                    |

## Como funciona

HTMX intercepta eventos no browser e substitui a navegação padrão por requisições
**AJAX** (Asynchronous JavaScript and XML, JavaScript e XML Assíncronos). O servidor responde
com HTML puro; o HTMX insere o fragmento no **DOM** (Document Object Model, Modelo de Objeto do
Documento) sem recarregar a página.

**Fluxo:** `User Action → hx-* → HTTP Request → Python Handler → HTML Fragment → DOM Swap`

| Etapa                | O que acontece                                               |
| -------------------- | ------------------------------------------------------------ |
| **hx-get/hx-post**   | HTMX envia a requisição com os atributos configurados        |
| **Handler Python**   | FastAPI processa e renderiza um template Jinja2 parcial      |
| **HTML Fragment**    | Resposta sem `<html>`: apenas o trecho a ser inserido        |
| **hx-target + hx-swap** | HTMX localiza o elemento alvo e insere o fragmento        |

## Respostas parciais

O handler Python retorna um fragmento HTML, não a página completa. Templates parciais ficam em
arquivos separados (convenção: prefixo `_`).

<details>
<summary>❌ Bad — handler retorna página completa; HTMX recebe <html> inteiro</summary>
<br>

```python
@router.get("/orders")
async def list_orders(request: Request):
    orders = await order_service.fetch_all()
    full_page = templates.TemplateResponse(
        "orders/index.html", {"request": request, "orders": orders}
    )

    return full_page
```

```html
<!-- orders/index.html — página completa enviada ao HTMX -->
<!DOCTYPE html>
<html>
  <body>
    <ul>
      {% for order in orders %}
        <li>Order #{{ order.order_id }}</li>
      {% endfor %}
    </ul>
  </body>
</html>
```

</details>

<br>

<details>
<summary>✅ Good — handler retorna fragmento; template parcial em arquivo separado</summary>
<br>

```html
<!-- trigger na página principal -->
<button
  hx-get="/orders/partial"
  hx-target="#order-list"
  hx-swap="innerHTML"
>
  Carregar pedidos
</button>

<div id="order-list"></div>
```

```python
@router.get("/orders/partial")
async def list_orders_partial(request: Request):
    orders = await order_service.fetch_all()
    partial = templates.TemplateResponse(
        "orders/_list.html", {"request": request, "orders": orders}
    )

    return partial
```

```html
<!-- orders/_list.html — fragmento: sem <html>, <head> ou <body> -->
<ul>
  {% for order in orders %}
    <li>Order #{{ order.order_id }}</li>
  {% endfor %}
</ul>
```

</details>

## hx-target e hx-swap

`hx-target` define onde o fragmento é inserido. Sem ele, HTMX insere dentro do próprio elemento
que disparou a requisição. `hx-swap` define como: `innerHTML` substitui o conteúdo interno;
`beforeend` adiciona ao final da lista sem apagar o que já existe.

<details>
<summary>❌ Bad — sem hx-target, HTMX insere o fragmento dentro do botão; hx-swap ausente</summary>
<br>

```html
<button hx-get="/orders/partial">Carregar</button>

<div id="order-list">
  <!-- conteúdo existente apagado sem intenção -->
</div>
```

</details>

<br>

<details>
<summary>✅ Good — hx-target explícito, hx-swap intencional por caso de uso</summary>
<br>

```html
<!-- substituir conteúdo existente -->
<button
  hx-get="/orders/partial"
  hx-target="#order-list"
  hx-swap="innerHTML"
>
  Recarregar pedidos
</button>

<!-- adicionar ao final de uma lista sem apagar os itens existentes -->
<button
  hx-get="/orders/next-page"
  hx-target="#order-list"
  hx-swap="beforeend"
>
  Carregar mais
</button>

<ul id="order-list"></ul>
```

</details>

## Out-of-band Swaps

Um único fragmento de resposta pode atualizar múltiplos elementos. O elemento principal é
inserido no `hx-target`; os elementos com `hx-swap-oob="true"` são inseridos nos seus próprios
IDs, sem requisições adicionais.

<details>
<summary>❌ Bad — duas requisições separadas para atualizar lista e contador</summary>
<br>

```html
<form hx-post="/orders" hx-target="#order-list" hx-swap="beforeend">
  <button type="submit">Criar pedido</button>
</form>

<button hx-get="/orders/count" hx-target="#order-count">
  Atualizar contador
</button>
<span id="order-count">{{ total_orders }}</span>
```

</details>

<br>

<details>
<summary>✅ Good — uma resposta atualiza lista e contador via out-of-band</summary>
<br>

```html
<form hx-post="/orders" hx-target="#order-list" hx-swap="beforeend">
  <button type="submit">Criar pedido</button>
</form>

<ul id="order-list"></ul>
<span id="order-count">{{ total_orders }}</span>
```

```python
@router.post("/orders")
async def create_order(request: Request, order_input: OrderInput = Form()):
    created_order = await order_service.create(order_input)
    total_orders = await order_service.count()

    partial = templates.TemplateResponse(
        "orders/_created.html",
        {"request": request, "order": created_order, "total_orders": total_orders},
    )

    return partial
```

```html
<!-- orders/_created.html — item principal + contador out-of-band -->
<li>Order #{{ order.order_id }} — R$ {{ order.total }}</li>

<span id="order-count" hx-swap-oob="true">{{ total_orders }}</span>
```

</details>

## Estados de loading

`hx-indicator` aponta para um elemento exibido durante a requisição. O HTMX adiciona a classe
`htmx-request` ao elemento enquanto aguarda a resposta.

<details>
<summary>❌ Bad — sem feedback visual; usuário não sabe se a requisição está em andamento</summary>
<br>

```html
<button hx-get="/orders/partial" hx-target="#order-list">
  Carregar pedidos
</button>

<div id="order-list"></div>
```

</details>

<br>

<details>
<summary>✅ Good — indicador visível durante a requisição via hx-indicator</summary>
<br>

```html
<button
  hx-get="/orders/partial"
  hx-target="#order-list"
  hx-indicator="#loading-indicator"
>
  Carregar pedidos
</button>

<span id="loading-indicator" class="htmx-indicator">Carregando...</span>

<div id="order-list"></div>
```

```css
.htmx-indicator {
  display: none;
}

.htmx-request .htmx-indicator,
.htmx-request.htmx-indicator {
  display: inline;
}
```

</details>
