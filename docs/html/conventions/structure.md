# Estrutura do documento HTML

HTML tem um elemento próprio para cada papel de uma página: `<nav>` para o menu, `<main>` para o conteúdo principal, `<article>` para um texto que se sustenta sozinho. Usar o elemento certo é o que se chama de **semantic HTML** (HTML semântico), e o ganho é concreto. O leitor de tela anuncia "navegação" ao chegar no `<nav>`, e oferece um atalho para pular direto ao `<main>`. Um `<div class="nav">` não recebe nada disso, porque `<div>` não diz ao navegador o que aquele bloco é.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **semantic HTML** (HTML semântico) | Escolher o elemento que descreve o papel, como `<nav>` ou `<article>`, no lugar de um `<div>` genérico |
| **landmark** (marco de página) | Elemento que vira uma região que o leitor de tela navega: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` |
| **sectioning element** (elemento de seção) | `<article>`, `<section>`, `<nav>` e `<aside>`, que abrem um novo escopo dentro da estrutura da página |
| **heading hierarchy** (hierarquia de títulos) | Os títulos de `<h1>` a `<h6>` usados em ordem, sem pular nível |
| **document outline** (estrutura do documento) | A árvore de seções e títulos que o leitor de tela percorre para dar ao usuário um índice da página |
| **div soup** (sopa de divs) | Antipadrão em que a página inteira é feita de `<div>` e `<span>`, sem nenhum elemento que carregue significado |
| **figure** (figura) | O par `<figure>` e `<figcaption>`, que amarra uma imagem à legenda dela |

<a id="semantic-elements"></a>

## Prefira o elemento que já carrega o significado

`<div>` e `<span>` são caixas neutras: agrupam conteúdo sem dizer o que ele é. Sempre que existir um elemento que descreve o papel do bloco, use ele no lugar do genérico. A marcação encurta, as classes explicativas somem, e a acessibilidade vem junto, sem trabalho extra.

<details>
<summary>❌ Ruim: a página inteira feita de div, e nada diz o que cada bloco é</summary>

```html
<div class="header">
  <div class="logo">Brand</div>
  <div class="nav">
    <div class="nav-item"><a href="/about">About</a></div>
    <div class="nav-item"><a href="/contact">Contact</a></div>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="article-title">Post Title</div>
    <div class="article-body">...</div>
  </div>
  <div class="sidebar">...</div>
</div>
<div class="footer">© 2026</div>
```

</details>

<details>
<summary>✅ Bom: cada elemento anuncia o próprio papel</summary>

```html
<header>
  <a href="/" class="brand">Brand</a>

  <nav>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
</header>

<main>
  <article>
    <h1>Post Title</h1>
    <p>...</p>
  </article>

  <aside>...</aside>
</main>

<footer>© 2026</footer>
```

</details>

<a id="heading-hierarchy"></a>

## O nível do título vem da estrutura, e o tamanho vem do CSS

Escolha entre `<h2>` e `<h3>` pela posição do título na estrutura do conteúdo. Escolher pelo tamanho que a fonte tem por padrão é o erro comum, e ele custa caro: o leitor de tela monta um índice da página a partir dos títulos, e um `<h3>` que aparece sem nenhum `<h2>` acima cria um item de índice pendurado em um pai que não existe.

Para deixar o título menor, mude o tamanho no CSS e mantenha o nível certo na marcação.

<details>
<summary>❌ Ruim: o h3 aparece antes de existir qualquer h2</summary>

```html
<h1>Blog</h1>
<h3>Latest Posts</h3>
<h2>About</h2>
```

</details>

<details>
<summary>✅ Bom: cada nível aparece antes do nível que ele contém</summary>

```html
<h1>Blog</h1>
<h2>Latest Posts</h2>
<h3>Post Title</h3>
<h2>About</h2>
```

</details>

Cada página tem um `<h1>` só, que nomeia o assunto dela. Dentro de um `<article>` ou de uma `<section>`, a contagem recomeça, e cada seção pode abrir com o próprio `<h2>`.

<a id="lang-and-charset"></a>

## `lang` e `charset` vêm antes de qualquer outro metadado

O `lang` no `<html>` diz ao leitor de tela em que idioma pronunciar o texto. Sem ele, um texto em português sai lido com fonética de inglês, e fica incompreensível. O `charset` diz ao navegador como decodificar os bytes do arquivo; sem ele, os acentos aparecem trocados.

O `charset` precisa vir logo no começo do `<head>`, antes do `<title>`. O navegador começa a interpretar o arquivo assim que recebe os primeiros bytes, e se a codificação aparece depois do título, ele já leu o título com a codificação errada.

<details>
<summary>❌ Ruim: sem lang, e o charset chega depois do título</summary>

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Site</title>
    <meta charset="UTF-8" />
  </head>
</html>
```

</details>

<details>
<summary>✅ Bom: lang declarado, e o charset na primeira linha do head</summary>

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Site</title>
  </head>
</html>
```

</details>

## Quando usar `<section>` e quando usar `<div>`

Use `<section>` quando o bloco agrupa um tema do conteúdo e você consegue dar um título a ele. O título é o teste: uma `<section>` sem heading não entra na estrutura do documento, e o leitor de tela anuncia uma região anônima, o que atrapalha mais do que ajuda.

Use `<div>` quando o agrupamento existe para o layout ou para o JavaScript se prender nele. Trocar `<div>` por `<section>` sem ter um título para a região deixa a marcação parecida com HTML semântico e piora a experiência de quem navega por leitor de tela.

<details>
<summary>❌ Ruim: duas section sem título, cumprindo papel de div de layout</summary>

```html
<section class="wrapper">
  <section class="card-grid">
    <div class="card">...</div>
    <div class="card">...</div>
  </section>
</section>
```

</details>

<details>
<summary>✅ Bom: a section tem título, e a div cuida da grade</summary>

```html
<section aria-labelledby="featured-heading">
  <h2 id="featured-heading">Featured Products</h2>

  <div class="card-grid">
    <div class="card">...</div>
    <div class="card">...</div>
  </div>
</section>
```

</details>
