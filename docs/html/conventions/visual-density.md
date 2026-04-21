# Visual density: HTML

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) aplicados a HTML: agrupar
o que pertence junto, separar o que é distinto.

## Entre blocos irmãos

Elementos de bloco semanticamente distintos são separados por uma linha em branco. Isso torna o
arquivo escaneável e revela a estrutura de cima pra baixo sem precisar ler o conteúdo.

<details>
<summary>❌ Bad — blocos colados, sem respiro entre seções</summary>
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
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">Welcome</h1>
    <p>Build something great.</p>
  </section>
  <section aria-labelledby="features-heading">
    <h2 id="features-heading">Features</h2>
  </section>
</main>
<footer>© 2026</footer>
```

</details>

<br>

<details>
<summary>✅ Good — uma linha em branco entre blocos distintos</summary>
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
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">Welcome</h1>
    <p>Build something great.</p>
  </section>

  <section aria-labelledby="features-heading">
    <h2 id="features-heading">Features</h2>
  </section>
</main>

<footer>© 2026</footer>
```

</details>

## Formulários

Cada campo de formulário (label + input + mensagem de erro) é uma unidade. Uma linha em branco
separa campos distintos. O formulário torna-se legível de cima pra baixo.

<details>
<summary>❌ Bad — campos colados, unidades indistintas</summary>
<br>

```html
<form>
  <label for="name">Name</label>
  <input id="name" type="text" name="name" required />
  <label for="email">Email</label>
  <input id="email" type="email" name="email" required />
  <label for="message">Message</label>
  <textarea id="message" name="message"></textarea>
  <button type="submit">Send</button>
</form>
```

</details>

<br>

<details>
<summary>✅ Good — campos separados, unidades visíveis</summary>
<br>

```html
<form>
  <label for="name">Name</label>
  <input id="name" type="text" name="name" required />

  <label for="email">Email</label>
  <input id="email" type="email" name="email" required />

  <label for="message">Message</label>
  <textarea id="message" name="message"></textarea>

  <button type="submit">Send</button>
</form>
```

</details>

## Comentários HTML

Comentários delimitam seções longas, úteis em templates com muitas partes. O comentário de
fechamento identifica o bloco, não o elemento.

<details>
<summary>❌ Bad — comentário sobre o que o código faz, não onde termina</summary>
<br>

```html
<!-- This is the navigation menu with links -->
<nav>...</nav>
<!-- End nav tag -->
```

</details>

<br>

<details>
<summary>✅ Good — comentário de fechamento identifica a seção</summary>
<br>

```html
<!-- Navigation -->
<nav>
  ...
</nav>
<!-- /Navigation -->
```

</details>

Use comentários com parcimônia. HTML semântico com IDs descritivos já é autoexplicativo.
