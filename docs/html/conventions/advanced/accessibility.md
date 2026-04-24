# Accessibility

> Escopo: HTML. Idiomas específicos deste ecossistema.

Acessibilidade é estrutura, não camada extra. Elemento semântico correto, texto alternativo e foco
gerenciável cobrem a maior parte dos casos sem **ARIA** (Accessible Rich Internet Applications, Aplicações Ricas e Acessíveis para Internet) adicional.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) | Estrutura semântica da página; elementos corretos já carregam acessibilidade nativa |
| **ARIA** (Accessible Rich Internet Applications, Aplicações Ricas e Acessíveis para Internet) | Atributos que complementam semântica quando HTML nativo não cobre o caso |
| **UI** (User Interface, Interface do Usuário) | Superfície visual e interativa com que o usuário interage |
| **URL** (Uniform Resource Locator, Localizador Uniforme de Recurso) | Endereço do recurso; âncoras e links dependem dela para navegação acessível |

## Imagens

Toda `<img>` tem `alt`. Imagens de conteúdo: texto descritivo. Imagens decorativas: `alt=""` vazio
Leitores de tela pulam imagens decorativas. Sem `alt`, o leitor lê o nome do arquivo.

<details>
<summary>❌ Bad — sem alt, alt genérico, alt repete o contexto</summary>
<br>

```html
<img src="/img/avatar.jpg" />
<img src="/img/chart.png" alt="image" />
<img src="/img/logo.svg" alt="logo" />

<!-- decorative sem alt vazio -->
<img src="/img/divider.png" alt="decorative divider" />
```

</details>

<br>

<details>
<summary>✅ Good — alt descritivo, decorativo com alt vazio</summary>
<br>

```html
<img src="/img/avatar.jpg" alt="Profile photo of Ana Souza" />
<img src="/img/chart.png" alt="Monthly sales chart showing 20% growth in Q1" />
<img src="/img/logo.svg" alt="Acme Corp" />

<!-- decorativo: alt vazio, role presentation -->
<img src="/img/divider.png" alt="" role="presentation" />
```

</details>

## Botão vs link

`<button>` executa uma ação na página. `<a>` navega para outro destino (URL). Trocar os dois
quebra o comportamento esperado com teclado e leitores de tela.

<details>
<summary>❌ Bad — div/span clicável, link que age como botão</summary>
<br>

```html
<div class="btn" onclick="openModal()">Open</div>
<span onclick="deleteItem()">Delete</span>

<a href="#" onclick="submitForm()">Submit</a>
```

</details>

<br>

<details>
<summary>✅ Good — button para ação, a para navegação</summary>
<br>

```html
<button type="button" onclick="openModal()">Open</button>
<button type="button" onclick="deleteItem()">Delete</button>

<button type="submit">Submit</button>
<a href="/dashboard">Go to dashboard</a>
```

</details>

## Foco e tabindex

O fluxo de foco segue a ordem do DOM. `tabindex="0"` adiciona um elemento não-focável ao fluxo.
`tabindex="-1"` remove do fluxo mas permite foco programático. `tabindex` positivo quebra a ordem
natural, portanto deve ser evitado.

<details>
<summary>❌ Bad — tabindex positivo bagunça a ordem, div interativo sem foco</summary>
<br>

```html
<input tabindex="3" name="email" />
<input tabindex="1" name="name" />
<div class="custom-toggle" onclick="toggle()">Toggle</div>
```

</details>

<br>

<details>
<summary>✅ Good — ordem natural do DOM, elemento customizado com tabindex="0" e role</summary>
<br>

```html
<input name="name" />
<input name="email" />
<div
  class="custom-toggle"
  role="switch"
  tabindex="0"
  aria-checked="false"
  onkeydown="handleKey(event)"
  onclick="toggle()"
>Toggle</div>
```

</details>

## ARIA

ARIA não substitui HTML semântico; complementa quando não há elemento nativo. Se existe
um elemento nativo, use-o. ARIA errado é pior que ARIA ausente.

<details>
<summary>❌ Bad — ARIA desnecessário em elemento semântico</summary>
<br>

```html
<button role="button" aria-pressed="false">Submit</button>
<nav role="navigation">...</nav>
<h1 role="heading" aria-level="1">Title</h1>
```

</details>

<br>

<details>
<summary>✅ Good — ARIA só onde não existe elemento nativo</summary>
<br>

```html
<button type="button">Submit</button>
<nav>...</nav>
<h1>Title</h1>

<!-- ARIA justificado: componente customizado sem equivalente nativo -->
<div role="tablist">
  <button id="tab-1" role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button id="tab-2" role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>

<div id="panel-1" role="tabpanel" aria-labelledby="tab-1">...</div>
<div id="panel-2" role="tabpanel" aria-labelledby="tab-2" hidden>...</div>
```

</details>

## aria-label e aria-labelledby

`aria-labelledby` referencia um elemento visível existente. `aria-label` adiciona texto invisível
quando não há elemento visual. Prefira `aria-labelledby`; o texto fica sincronizado com a UI.

<details>
<summary>❌ Bad — aria-label duplica texto já visível</summary>
<br>

```html
<section aria-label="Featured Products">
  <h2>Featured Products</h2>
  ...
</section>

<button aria-label="Close" class="modal__close">✕</button>
```

</details>

<br>

<details>
<summary>✅ Good — aria-labelledby aponta pro heading; aria-label só quando não há texto visível</summary>
<br>

```html
<section aria-labelledby="featured-heading">
  <h2 id="featured-heading">Featured Products</h2>
  ...
</section>

<button class="modal__close" aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>
```

</details>
