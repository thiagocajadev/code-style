# Densidade visual em HTML

Um arquivo de HTML cresce com facilidade, e a estrutura da página some no meio das tags. As regras de [densidade visual](../../shared/standards/visual-density.md) resolvem isso com dois recursos que o HTML já tem: a indentação mostra o que está dentro do quê, e a linha em branco separa uma parte da página da seguinte.

HTML não tem retorno de função nem condicional, então as regras de densidade que tratam disso ficam de fora aqui. O que sobra é o que importa em marcação: agrupar os elementos que formam uma mesma parte da tela, dar respiro depois de uma tag que ocupou várias linhas e nunca alinhar atributos em coluna.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **visual density** (densidade visual) | Quanta informação cabe em um bloco. O alvo é pouca por bloco e muita por arquivo |
| **blank line** (linha em branco) | Separa duas partes da página. Uma só entre grupos, nunca duas seguidas |
| **indentation** (indentação) | Dois espaços por nível de profundidade, que desenham a hierarquia no arquivo |
| **landmark** (região da página) | `<header>`, `<nav>`, `<main>`, `<aside>` e `<footer>`. Cada um é uma parte distinta e ganha respiro |
| **multi-line tag** (tag de várias linhas) | Elemento com atributos demais para caber em uma linha. Pede uma linha em branco depois |
| **column alignment** (alinhamento em colunas) | Espaços extras para deixar os atributos alinhados na vertical. Antipadrão |

## Referência rápida

| Regra | Descrição |
| --- | --- |
| Regiões da página levam respiro | `<header>`, `<main>`, `<footer>` e seções irmãs ficam separados por uma linha em branco |
| Filhos da mesma parte ficam juntos | Dentro de um bloco coeso, como um card, os filhos ficam colados |
| Tag de várias linhas pede respiro depois | Se um elemento ocupou várias linhas, deixe uma linha em branco antes do próximo |
| Item de uma linha fica colado no seguinte | Vários `<li>` ou `<tr>` curtos ficam consecutivos, sem respiro |
| Item que cresce ganha respiro | Quando o `<li>` ou o `<tr>` quebra em várias linhas, deixe uma linha em branco entre eles |
| Um espaço entre atributos | Nunca alinhe os atributos na vertical |
| Quatro elementos iguais viram dois mais dois | A partir do quarto irmão repetido, divida em pares |
| Uma linha em branco basta | Duas seguidas são ruído |

## A regra central

Agrupe os elementos que formam a mesma parte da tela e separe partes diferentes com uma linha em branco.

Os filhos diretos de um bloco coeso ficam colados: o `<label>` e o `<input>` de um campo, o título e o parágrafo de um card. Os irmãos que representam partes distintas da página ganham respiro entre si: o cabeçalho, o conteúdo principal, o rodapé. Uma linha em branco resolve a separação, e duas seguidas não acrescentam nada.

## Deixe uma linha em branco entre as regiões da página

`<header>`, `<main>`, `<footer>` e as seções irmãs dentro de `<main>` são partes distintas. Com uma linha em branco entre elas, você abre o arquivo e enxerga a estrutura da página sem ler o conteúdo.

Dentro de cada região, os filhos diretos ficam colados, porque eles formam a região. O link da marca e o `<nav>` estão os dois dentro do `<header>`, e é o cabeçalho inteiro que se separa do que vem depois.

<details>
<summary>❌ Ruim: as regiões da página coladas, sem nenhum respiro entre elas</summary>

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

<details>
<summary>✅ Bom: uma linha em branco entre as regiões e entre as seções irmãs</summary>

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

O `<h1>` e o `<p>` da primeira seção ficam colados, porque juntos eles são a seção. O respiro aparece entre uma seção e a outra.

</details>

## Depois de uma tag de várias linhas, deixe um respiro

Uma tag com muitos atributos ocupa cinco ou seis linhas e passa a pesar como um bloco. Sem uma linha em branco depois dela, o elemento seguinte parece continuação do mesmo campo, e o leitor precisa contar tags para achar onde um termina e o outro começa.

Quando a tag de várias linhas faz parte de um par, como o `<label>` e o `<input>` de um mesmo campo, o respiro vai depois do par, e não entre os dois.

<details>
<summary>❌ Ruim: dois campos e um botão colados, sem separação visível</summary>

```html
<form>
  <label for="email">Email</label>
  <input
    id="email"
    type="email"
    name="email"
    autocomplete="email"
    required
  />
  <label for="password">Password</label>
  <input
    id="password"
    type="password"
    name="password"
    autocomplete="new-password"
    required
  />
  <button type="submit">Sign in</button>
</form>
```

</details>

<details>
<summary>✅ Bom: uma linha em branco separa cada campo do próximo</summary>

```html
<form>
  <label for="email">Email</label>
  <input
    id="email"
    type="email"
    name="email"
    autocomplete="email"
    required
  />

  <label for="password">Password</label>
  <input
    id="password"
    type="password"
    name="password"
    autocomplete="new-password"
    required
  />

  <button type="submit">Sign in</button>
</form>
```

Cada `<label>` fica colado no `<input>` que ele nomeia, porque os dois são um campo só. O respiro separa um campo do outro e isola o botão do fim.

</details>

## Item de uma linha fica junto, item que cresce ganha respiro

Um `<li>` ou um `<tr>` que cabe em uma linha fica colado no seguinte, e o olho percorre a lista de cima a baixo sem interrupção. Separar itens curtos com linha em branco só estica a lista.

Quando um item passa a ocupar várias linhas, com filhos aninhados e atributos, ele vira um bloco, e aí pede uma linha em branco entre um item e o próximo.

<details>
<summary>❌ Ruim: três links curtos afastados por linhas em branco que não separam nada</summary>

```html
<ul>
  <li><a href="/home">Home</a></li>

  <li><a href="/about">About</a></li>

  <li><a href="/contact">Contact</a></li>
</ul>
```

</details>

<details>
<summary>✅ Bom: os itens de uma linha ficam consecutivos</summary>

```html
<ul>
  <li><a href="/home">Home</a></li>
  <li><a href="/about">About</a></li>
  <li><a href="/contact">Contact</a></li>
</ul>
```

</details>

<details>
<summary>✅ Bom: cada card ocupa várias linhas, então ganha respiro</summary>

```html
<ul class="product-grid">
  <li class="product-card">
    <a href="/products/trail-runner-x">
      <img src="/img/trail-runner-x.jpg" alt="Trail Runner X" width="400" height="400" />
      <h2>Trail Runner X</h2>
    </a>
    <p class="price">$129.99</p>
  </li>

  <li class="product-card">
    <a href="/products/road-runner">
      <img src="/img/road-runner.jpg" alt="Road Runner" width="400" height="400" />
      <h2>Road Runner</h2>
    </a>
    <p class="price">$99.99</p>
  </li>
</ul>
```

Cada `<li>` virou um bloco de cinco linhas. A linha em branco entre eles mostra onde um card acaba.

</details>

## Quatro elementos iguais se dividem em dois mais dois

Três elementos parecidos, um embaixo do outro, ainda se leem como um grupo. A partir do quarto, o bloco vira um paredão de linhas quase idênticas, e o olho perde a conta. Divida em dois pares, e escolha a divisão pelo que cada par significa.

Uma linha sozinha entre duas linhas em branco também atrapalha: ela parece uma etapa própria quando é só mais um item da lista.

<details>
<summary>❌ Ruim: quatro meta tags empilhadas, sem divisão nenhuma</summary>

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Acme Store: running shoes and apparel." />
  <meta name="theme-color" content="#0f172a" />
</head>
```

</details>

<details>
<summary>✅ Bom: as quatro meta tags divididas em dois pares</summary>

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <meta name="description" content="Acme Store: running shoes and apparel." />
  <meta name="theme-color" content="#0f172a" />
</head>
```

O primeiro par configura o documento: codificação e viewport. O segundo par cuida de como a página se apresenta: descrição e cor do tema.

</details>

## Não alinhe o código em colunas

Use um espaço entre atributos. Alinhar os atributos na vertical com espaços extras parece organizado e sai caro: renomear um único atributo desalinha o bloco inteiro, o diff do Git marca todas as linhas como alteradas, e alguém precisa reindentar tudo de novo a cada mudança.

<details>
<summary>❌ Ruim: espaços extras alinham os atributos na vertical</summary>

```html
<input id="first-name"  type="text"     name="first_name"  required />
<input id="last-name"   type="text"     name="last_name"   required />
<input id="email"       type="email"    name="email"       required />
```

</details>

<details>
<summary>✅ Bom: um espaço entre atributos</summary>

```html
<input id="first-name" type="text" name="first_name" required />
<input id="last-name" type="text" name="last_name" required />
<input id="email" type="email" name="email" required />
```

</details>

## O comentário marca onde a seção começa e termina

Em template longo, o comentário serve para delimitar uma seção grande, e o comentário de fechamento repete o nome dela. Num arquivo de trezentas linhas, isso responde à pergunta que o leitor faz ao ver um `</div>` solto: qual bloco acabou de fechar?

Escrever no comentário o que o elemento faz não ajuda ninguém: o `<nav>` já se apresenta como navegação.

<details>
<summary>❌ Ruim: o comentário repete o que a tag já diz</summary>

```html
<!-- This is the navigation menu with links -->
<nav>...</nav>
<!-- End nav tag -->
```

</details>

<details>
<summary>✅ Bom: o comentário nomeia a seção e marca o fechamento dela</summary>

```html
<!-- Navigation -->
<nav>
  ...
</nav>
<!-- /Navigation -->
```

</details>

Use comentário com parcimônia. Marcação semântica com id descritivo já se explica sozinha.
