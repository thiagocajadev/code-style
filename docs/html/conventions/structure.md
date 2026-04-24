# Structure

**HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) semântico usa o elemento correto para cada propósito. O elemento carrega significado, dispensa
classes explicativas e melhora acessibilidade sem custo extra.

## Elementos semânticos

`<div>` e `<span>` são elementos sem significado. Quando existe um elemento semântico para o caso de
uso, ele substitui o genérico.

<details>
<summary>❌ Bad — div soup, estrutura sem significado</summary>
<br>

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

<br>

<details>
<summary>✅ Good — elementos semânticos, estrutura legível</summary>
<br>

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

## Hierarquia de headings

Os headings descrevem a hierarquia do documento, não o tamanho visual do texto. Pular níveis quebra
a estrutura e prejudica leitores de tela. Use CSS para ajustar tamanho; nunca escolha heading pelo
tamanho padrão.

<details>
<summary>❌ Bad — nível pulado, h3 sem h2 pai</summary>
<br>

```html
<h1>Blog</h1>
<h3>Latest Posts</h3>
<h2>About</h2>
```

</details>

<br>

<details>
<summary>✅ Good — hierarquia contínua, sem saltos</summary>
<br>

```html
<h1>Blog</h1>
<h2>Latest Posts</h2>
<h3>Post Title</h3>
<h2>About</h2>
```

</details>

Um `<h1>` por página. Seções dentro de `<article>` ou `<section>` reiniciam a hierarquia local;
cada `<section>` pode ter seu próprio `<h2>`.

## lang e charset

`lang` no `<html>` habilita pronúncia correta em leitores de tela e hifenização automática. `charset`
garante codificação. Ambos são obrigatórios e devem aparecer antes de qualquer outro metadado.

<details>
<summary>❌ Bad — sem lang, charset fora de posição</summary>
<br>

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

<br>

<details>
<summary>✅ Good — lang e charset corretos, na ordem certa</summary>
<br>

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

## section vs div

`<section>` agrupa conteúdo tematicamente relacionado e deve ter um heading filho. `<div>` é para
agrupamento sem significado semântico (layout, JS hooks). Não substitua `<div>` por `<section>` só
para parecer mais semântico.

<details>
<summary>❌ Bad — section sem heading, usado como div</summary>
<br>

```html
<section class="wrapper">
  <section class="card-grid">
    <div class="card">...</div>
    <div class="card">...</div>
  </section>
</section>
```

</details>

<br>

<details>
<summary>✅ Good — section com heading, div para layout</summary>
<br>

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
