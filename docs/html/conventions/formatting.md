# Formatação do HTML

Um arquivo de **HTML** (HyperText Markup Language · Linguagem de Marcação de Hipertexto) tende a ficar longo, e quem abre esse arquivo quase sempre está procurando uma coisa só. As três convenções desta página existem para encurtar essa procura: a **indentation** (indentação) mostra qual elemento está dentro de qual, a ordem fixa dos **attribute** (atributos) diz onde olhar antes de olhar, e a aspa dupla em todo valor tira a decisão do caminho.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **doctype** (declaração de tipo de documento) | `<!DOCTYPE html>`, na primeira linha. Faz o navegador interpretar a página pelo padrão atual |
| **tag** (marcação) | O par `<el>` e `</el>` que delimita um trecho de conteúdo |
| **attribute** (atributo) | Um `nome="valor"` dentro da tag de abertura, que configura o elemento |
| **void element** (elemento vazio) | Tag que não aceita conteúdo e por isso não tem fechamento: `<img>`, `<br>`, `<meta>` |
| **self-closing** (autofechamento) | A forma `<el />`. Opcional em HTML5 e obrigatória em XHTML e JSX |
| **indentation** (indentação) | Dois espaços por nível de profundidade, o que deixa a hierarquia visível |
| **block vs inline** (bloco e em linha) | O elemento de bloco ocupa a própria linha, como `<section>`. O elemento em linha corre junto do texto, como `<a>` |

## Dois espaços por nível de profundidade

Cada nível de aninhamento entra dois espaços em relação ao pai, e é essa indentação que deixa a hierarquia legível sem contar tags. Elemento de bloco começa em linha nova. Elemento em linha (`<a>`, `<strong>`, `<span>`) fica junto do texto que ele envolve, porque quebrar a linha ali insere espaço em branco no conteúdo renderizado.

<details>
<summary>❌ Ruim: cada linha entra num nível diferente, e a hierarquia some</summary>

```html
<ul>
<li><a href="/home">Home</a></li>
    <li>
  <a href="/about">About</a>
    </li>
</ul>
```

</details>

<details>
<summary>✅ Bom: dois espaços por nível, e a hierarquia aparece</summary>

```html
<ul>
  <li><a href="/home">Home</a></li>
  <li><a href="/about">About</a></li>
</ul>
```

</details>

## Os atributos entram sempre na mesma ordem

Combine uma ordem e mantenha ela em toda a base. Quem procura o `name` de um input já sabe que ele vem depois do `class` e antes do `type`, e acha o atributo pela posição, sem ler a linha inteira.

A ordem do projeto vai da identificação até a acessibilidade:

```
id → class → name → type → src | href → value → placeholder → for
→ disabled | required | readonly → loading → data-* → aria-* → role
```

<details>
<summary>❌ Ruim: cada elemento embaralha os atributos de um jeito</summary>

```html
<input required placeholder="Enter email" type="email" name="email" id="user-email" class="input" />
<img alt="Profile photo" src="/img/avatar.jpg" class="avatar" loading="lazy" id="user-avatar" />
```

</details>

<details>
<summary>✅ Bom: a mesma ordem nos dois, e o olho acha o atributo pela posição</summary>

```html
<input id="user-email" class="input" name="email" type="email" placeholder="Enter email" required />
<img id="user-avatar" class="avatar" src="/img/avatar.jpg" loading="lazy" alt="Profile photo" />
```

</details>

## Muitos atributos pedem uma linha para cada um

Quando o elemento acumula atributos, quebre um por linha. A linha única obriga a rolagem horizontal, e o diff do Git passa a marcar a linha inteira como alterada quando só um atributo mudou.

O fechamento `>` ou `/>` pode ficar colado no último atributo ou sozinho na linha seguinte. Escolha uma das duas formas e repita em todo o projeto.

<details>
<summary>❌ Ruim: oito atributos numa linha só, que não cabe na tela</summary>

```html
<input id="search-input" class="input input--search" name="q" type="search" placeholder="Search products..." autocomplete="off" aria-label="Search products" required />
```

</details>

<details>
<summary>✅ Bom: um atributo por linha, e o fechamento sozinho embaixo</summary>

```html
<input
  id="search-input"
  class="input input--search"
  name="q"
  type="search"
  placeholder="Search products..."
  autocomplete="off"
  aria-label="Search products"
  required
/>
```

</details>

## Aspas duplas sempre, e booleano sem valor

Todo valor de atributo vai entre aspas duplas. A aspa simples funciona, e misturar as duas no mesmo arquivo faz o leitor parar para conferir qual está em uso.

O atributo booleano (`required`, `disabled`, `checked`, `readonly`) dispensa valor: estar escrito já significa `true`. Escrever `required="required"` repete a informação, e escrever `required="false"` engana, porque o navegador continua tratando o campo como obrigatório. Para desligar o atributo, remova ele da tag.

<details>
<summary>❌ Ruim: aspas simples, e o booleano repetido dentro do próprio valor</summary>

```html
<input type='text' required='required' disabled='disabled' />
<script src='/js/app.js' defer='defer'></script>
```

</details>

<details>
<summary>✅ Bom: aspas duplas, e o booleano vale por estar escrito</summary>

```html
<input type="text" required disabled />
<script src="/js/app.js" defer></script>
```

</details>
