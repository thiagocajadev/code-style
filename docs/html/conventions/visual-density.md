# Visual density: HTML

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) aplicados a **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto): agrupar o que pertence junto via **indentation** (indentação) e separar o que é distinto via **blank line** (linha em branco). HTML é marcação, não fluxo de controle, então as regras de retorno explicativo e declaração + guarda não se aplicam. O foco aqui é agrupamento semântico de elementos, respiro após blocos multi-linha e ausência de alinhamento de coluna.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **blank line** (linha em branco) | Separador entre seções top-level; uma só, nunca duas seguidas |
| **indentation** (indentação) | 2 espaços por nível; representa a hierarquia DOM no arquivo |
| **sibling block** (bloco irmão) | Elementos no mesmo nível; uma linha em branco entre eles separa fases da página |
| **landmark phase** (fase do landmark) | `<header>`, `<main>`, `<footer>` e seções top-level; cada fase ganha respiro |
| **multi-line tag** (tag multi-linha) | Elemento com muitos atributos quebrado em várias linhas; pede blank depois |
| **tight siblings** (irmãos colados) | `<li>` ou `<tr>` curtos consecutivos; podem ficar juntos sem respiro |
| **orphan element** (elemento órfão) | Único elemento isolado entre blanks; resolve juntando aos vizinhos ou quebrando 4 em 2+2 |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar atributos verticalmente; antipadrão |

## Referência rápida

| Regra | Descrição |
| --- | --- |
| **Fases top-level separadas** | `<header>`, `<main>`, `<footer>` e seções irmãs ganham linha em branco entre si |
| **Filhos relacionados ficam juntos** | Dentro de um bloco coeso (ex: um card), elementos filhos não levam blank |
| **Multi-linha pede respiro depois** | Tag com muitos atributos seguida de outro elemento exige linha em branco depois |
| **Listas curtas ficam tight** | `<li>` ou `<tr>` de uma linha podem ficar consecutivos sem respiro |
| **Listas expandidas pedem respiro** | Quando um `<li>` ou `<tr>` quebra em várias linhas, blank entre cada item |
| **Sem alinhamento de coluna** | Um único espaço entre atributos; nunca alinhar verticalmente |
| **4+ elementos homogêneos quebram 2+2** | A partir de quatro irmãos repetitivos, divida em pares para evitar muralha |
| **Nunca duplo respiro** | Exatamente uma linha em branco entre grupos; duas é ruído |

## A regra central

**Agrupar por fase semântica, separar fases com uma linha em branco.** Filhos diretos de um bloco coeso (um card, um campo de formulário) ficam colados; irmãos que representam fases distintas da página (header, nav, main, footer) ganham respiro. Nunca duas linhas em branco seguidas.

## Fases top-level: respiro entre landmarks

`<header>`, `<main>`, `<footer>` e seções irmãs dentro de `<main>` são fases distintas da página. Uma linha em branco entre elas torna o arquivo escaneável e revela a estrutura sem precisar ler o conteúdo. Já filhos diretos de um mesmo bloco coeso (o link da marca dentro do header, o link de navegação dentro do nav) não levam blank: eles formam a fase.

<details>
<summary>❌ Ruim: landmarks colados, sem respiro entre fases</summary>

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
<summary>✅ Bom: uma linha em branco entre landmarks e seções irmãs</summary>

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

Dentro de cada landmark, os filhos diretos (`<h1>` + `<p>` da seção hero) ficam colados: fazem parte da mesma fase. Entre seções irmãs, blank.

</details>

## Multi-linha: respiro depois do bloco

Quando uma tag quebra em várias linhas por ter muitos atributos (`id`, `name`, `aria-*`, validação), o bloco já ocupa peso visual próprio. Cole uma linha em branco **depois** dele antes do próximo elemento separado. Sem respiro, o leitor não vê onde a tag termina e a próxima fase começa.

A exceção é quando a tag multi-linha pertence a uma unidade coesa (ex: `<label>` + `<input>` multi-linha de um mesmo campo de formulário): o blank vai **depois do par**, não entre eles.

<details>
<summary>❌ Ruim: campos multi-linha colados, fases indistintas</summary>

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
<summary>✅ Bom: blank depois de cada par label+input multi-linha</summary>

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

Cada par label+input é uma unidade: sem blank entre eles. O respiro separa campos distintos e isola o botão final.

</details>

## Listas e tabelas: tight quando curto, respiro quando expandido

`<li>` ou `<tr>` de uma única linha são "irmãos colados": ficam consecutivos sem respiro, e o olho percorre a lista naturalmente. Quando um item quebra em múltiplas linhas (com atributos, filhos aninhados ou conteúdo complexo), o item ganha peso visual de bloco e pede blank entre cada um.

<details>
<summary>❌ Ruim: itens curtos com blanks inúteis</summary>

```html
<ul>
  <li><a href="/home">Home</a></li>

  <li><a href="/about">About</a></li>

  <li><a href="/contact">Contact</a></li>
</ul>
```

</details>

<details>
<summary>✅ Bom: itens de uma linha ficam tight</summary>

```html
<ul>
  <li><a href="/home">Home</a></li>
  <li><a href="/about">About</a></li>
  <li><a href="/contact">Contact</a></li>
</ul>
```

</details>

<details>
<summary>✅ Bom: itens expandidos pedem respiro entre eles</summary>

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

Cada `<li>` virou bloco multi-linha: peso visual próprio. Blank entre eles separa as unidades.

</details>

## Órfão de 1 linha: 4+ elementos quebram em 2+2

Três elementos homogêneos consecutivos formam um grupo coeso e podem ficar juntos. A partir de quatro, sempre quebrar em 2+2 para evitar muralha. Nunca isole um único elemento entre blanks: a linha solta parece um passo separado, mas é só mais um item.

<details>
<summary>❌ Ruim: quatro meta tags como muralha sem respiro</summary>

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Acme Store — running shoes and apparel." />
  <meta name="theme-color" content="#0f172a" />
</head>
```

</details>

<details>
<summary>✅ Bom: quatro meta tags quebradas em 2+2</summary>

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <meta name="description" content="Acme Store — running shoes and apparel." />
  <meta name="theme-color" content="#0f172a" />
</head>
```

Primeiro par: encoding e viewport (configuração do documento). Segundo par: descrição e tema (apresentação). Fases visíveis.

</details>

## Sem alinhamento de coluna

Não alinhe verticalmente atributos com múltiplos espaços. Um único espaço entre atributos, sempre. Alinhamento artificial quebra com qualquer renomeação, gera diff ruidoso e treina o olho a procurar colunas que somem na primeira refatoração.

<details>
<summary>❌ Ruim: espaços extras para alinhar atributos verticalmente</summary>

```html
<input id="first-name"  type="text"     name="first_name"  required />
<input id="last-name"   type="text"     name="last_name"   required />
<input id="email"       type="email"    name="email"       required />
```

</details>

<details>
<summary>✅ Bom: um único espaço entre atributos</summary>

```html
<input id="first-name" type="text" name="first_name" required />
<input id="last-name" type="text" name="last_name" required />
<input id="email" type="email" name="email" required />
```

</details>

## Comentários HTML

Comentários delimitam seções longas, úteis em templates com muitas partes. O comentário de fechamento identifica o bloco, não o elemento.

<details>
<summary>❌ Ruim: comentário sobre o que o código faz, não onde termina</summary>

```html
<!-- This is the navigation menu with links -->
<nav>...</nav>
<!-- End nav tag -->
```

</details>

<details>
<summary>✅ Bom: comentário de fechamento identifica a seção</summary>

```html
<!-- Navigation -->
<nav>
  ...
</nav>
<!-- /Navigation -->
```

</details>

Use comentários com parcimônia. HTML semântico com IDs descritivos já é autoexplicativo.
</content>
</invoke>