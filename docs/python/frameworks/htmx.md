# HTMX

> Escopo: Python · HTML. Guia baseado em **HTMX 2.0.10** integrado com **FastAPI** e **Jinja2**.

O HTMX é uma biblioteca JavaScript que deixa o **HTML** (HyperText Markup Language · Linguagem de Marcação de Hipertexto) pedir dados ao servidor sozinho, por meio de atributos no próprio elemento. O servidor devolve um pedaço de HTML pronto, e o HTMX o encaixa na página.

A consequência é que a montagem da tela continua inteira no Python. Numa **SPA** (Single Page Application · Aplicação de Página Única), o servidor devolveria JSON, e o JavaScript do navegador montaria o HTML a partir dele, o que significa manter a mesma lógica de exibição escrita duas vezes, em duas linguagens.

Este guia mostra como estruturar as rotas do FastAPI e os templates Jinja2 para funcionar com HTMX, seguindo os princípios de [funções](../conventions/functions.md).

## Conceitos fundamentais

| Conceito                          | O que é                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| **hx-get / hx-post** (o atributo que dispara a requisição) | Colocado no elemento, faz o HTMX chamar o servidor quando o evento acontece |
| **hx-target** (o atributo que diz onde encaixar)  | O seletor CSS do elemento que vai receber o pedaço de HTML devolvido |
| **hx-swap** (o atributo que diz como encaixar)    | A forma de inserir: substituir o conteúdo, substituir o elemento inteiro, acrescentar no fim |
| **hx-trigger** (o atributo que diz quando disparar) | O evento que dispara a chamada: `click` (o padrão), `change`, `load`, `revealed` |
| **hx-indicator** (o atributo do aviso de carregando) | O elemento que aparece enquanto a requisição está em andamento |
| **hx-swap-oob** (a troca fora do alvo)            | Permite que a mesma resposta atualize outros elementos da página, além do alvo principal |
| **fragmento** (pedaço de HTML)    | A resposta parcial do servidor: só o trecho a encaixar, sem `<html>`, `<head>` nem `<body>` |

## Como funciona

O HTMX intercepta o evento no navegador e faz uma requisição **AJAX** (Asynchronous JavaScript and XML · JavaScript e XML Assíncronos) no lugar da navegação normal. O servidor responde com HTML, e o HTMX o insere no **DOM** (Document Object Model · Modelo de Objeto do Documento), sem recarregar a página.

**Fluxo:** `User Action → hx-* → HTTP Request → Python Handler → HTML Fragment → DOM Swap`

| Etapa                | O que acontece                                               |
| -------------------- | ------------------------------------------------------------ |
| **hx-get/hx-post**   | O HTMX envia a requisição que o atributo configurou          |
| **Handler Python**   | O FastAPI processa e renderiza um template parcial do Jinja2 |
| **Fragmento**        | A resposta traz só o trecho a encaixar, sem a página em volta |
| **hx-target + hx-swap** | O HTMX acha o elemento alvo e encaixa o pedaço ali        |

## Respostas parciais

O handler devolve só o pedaço da tela que mudou. Guarde os templates parciais em arquivos separados, com o nome começando por `_`, que é a convenção do Jinja2 para o template que nunca é servido sozinho.

Devolver a página inteira faz o HTMX encaixar um `<html>` completo dentro de uma `<div>`, e a página passa a ter duas cabeças e dois corpos aninhados.

<details>
<summary>❌ Ruim: devolve a página inteira, e ela vai parar dentro de uma div</summary>

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
<!-- orders/index.html: página completa enviada ao HTMX -->
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

<details>
<summary>✅ Bom: devolve só a lista, e o template parcial mora num arquivo próprio</summary>

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
<!-- orders/_list.html: fragmento sem <html>, <head> ou <body> -->
<ul>
  {% for order in orders %}
    <li>Order #{{ order.order_id }}</li>
  {% endfor %}
</ul>
```

</details>

## hx-target e hx-swap

O `hx-target` diz onde o pedaço entra. Sem ele, o HTMX encaixa dentro do próprio elemento que disparou a chamada, e a lista de pedidos aparece dentro do botão que a pediu.

O `hx-swap` diz de que jeito. `innerHTML` troca o conteúdo do alvo, e serve para recarregar uma lista inteira. `beforeend` acrescenta no fim do que já está lá, e serve para a paginação que carrega mais itens sem apagar os anteriores.

<details>
<summary>❌ Ruim: sem alvo, a lista é encaixada dentro do próprio botão</summary>

```html
<button hx-get="/orders/partial">Carregar</button>

<div id="order-list">
  <!-- conteúdo existente apagado sem intenção -->
</div>
```

</details>

<details>
<summary>✅ Bom: o alvo é declarado, e a forma de encaixar combina com o caso</summary>

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

## Atualizar mais de um elemento na mesma resposta

Criar um pedido muda duas coisas na tela: a lista ganha uma linha, e o contador do topo sobe. Uma resposta só resolve as duas.

O trecho principal vai para o `hx-target`, como sempre. Qualquer outro elemento marcado com `hx-swap-oob="true"` vai para o lugar onde estiver o elemento de mesmo ID na página. A alternativa seria uma segunda requisição só para buscar o contador, e nesse meio tempo a tela mostra uma lista com quatro itens e um contador dizendo três.

<details>
<summary>❌ Ruim: duas requisições, e a tela fica inconsistente entre elas</summary>

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

<details>
<summary>✅ Bom: uma resposta só atualiza a lista e o contador juntos</summary>

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
<!-- orders/_created.html: item principal + contador out-of-band -->
<li>Order #{{ order.order_id }} · R$ {{ order.total }}</li>

<span id="order-count" hx-swap-oob="true">{{ total_orders }}</span>
```

</details>

## Avisar que a requisição está em andamento

Sem aviso nenhum, o usuário clica, nada muda na tela por dois segundos, e ele clica de novo. Agora são dois pedidos criados.

O `hx-indicator` aponta para o elemento que aparece durante a espera. O HTMX põe a classe `htmx-request` nele enquanto a resposta não chega, e a tira quando chega.

<details>
<summary>❌ Ruim: a tela não muda durante a espera, e o usuário clica de novo</summary>

```html
<button hx-get="/orders/partial" hx-target="#order-list">
  Carregar pedidos
</button>

<div id="order-list"></div>
```

</details>

<details>
<summary>✅ Bom: um aviso aparece enquanto a resposta não chega</summary>

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
