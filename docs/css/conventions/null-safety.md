# Valor ausente em CSS

CSS não tem **null** (a marca de que um valor não existe), e mesmo assim o problema do valor ausente aparece aqui. Um `var(--color-primary)` que aponta para um **token** (valor do design guardado num nome) nunca declarado devolve um valor que o navegador não sabe interpretar, e ele descarta a declaração inteira. O botão fica sem cor de fundo, e nada aparece no console.

Essa falha silenciosa é o assunto da página. As defesas são duas: o **fallback** (valor de reserva) dentro do `var()`, e o `@property`, que registra a variável com tipo e valor inicial.

> Conceito geral: [Valor ausente](../../shared/standards/null-safety.md)

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **custom property** (propriedade customizada) | A variável do CSS, declarada como `--nome: valor` e lida com `var(--nome)` |
| **fallback** (valor de reserva) | O segundo argumento de `var(--nome, reserva)`, usado quando a variável não existe |
| **invalid value** (valor inválido) | Um valor que o navegador não consegue interpretar. Ele descarta a declaração e segue em frente |
| **initial value** (valor inicial) | O valor que a propriedade tem quando ninguém a define |
| **@property** (registro da variável) | Declara o tipo da variável, se ela é herdada e qual o valor inicial dela |
| **unset** (limpa o valor) | Volta ao valor herdado, se a propriedade herda. Se não herda, volta ao valor inicial |
| **revert** (reverte) | Volta ao valor que o próprio navegador daria ao elemento |

## O `var()` aceita um valor de reserva

O segundo argumento do `var()` entra quando a variável não existe: `var(--color-primary, #3b82f6)`. Funciona como o `??` do JavaScript.

Sem ele, o componente fica à mercê de um token que talvez ninguém tenha declarado. E o modo como isso falha é o pior possível: a declaração é descartada em silêncio, o botão renderiza sem fundo, e o navegador não reclama de nada.

<details>
<summary>❌ Ruim: três tokens sem reserva, e o botão renderiza sem fundo, borda ou espaçamento</summary>

```css
.button {
  background: var(--color-primary);     /* inválido se não definido: sem cor */
  border-radius: var(--radius-md);      /* inválido: sem borda */
  padding: var(--spacing-sm) var(--spacing-md); /* inválido: sem padding */
}
```

</details>

<details>
<summary>✅ Bom: cada token tem uma reserva, e o botão sempre renderiza</summary>

```css
.button {
  background: var(--color-primary, #3b82f6);
  border-radius: var(--radius-md, 6px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
}
```

</details>

## O `@property` declara o tipo e o valor inicial da variável

Sem registro, o navegador trata `--color-primary` como um texto qualquer. Ele não sabe que aquilo é uma cor, e é por isso que um `transition` sobre a variável não anima: para interpolar entre dois valores, o navegador precisa saber o que eles são. A cor troca de uma vez, sem transição nenhuma.

O `@property` resolve os dois problemas com uma declaração. O `syntax` diz o tipo, e a transição passa a funcionar. O `initial-value` dá à variável um valor de partida, e com ele a variável nunca chega inválida a lugar nenhum, mesmo que ninguém a declare.

<details>
<summary>❌ Ruim: a variável não tem tipo, e a transição de cor não acontece</summary>

```css
/* sem @property: o browser trata --color-primary como string opaca */
/* transições em custom properties sem registro são ignoradas */
.button {
  --color-primary: #3b82f6;
  background: var(--color-primary);
  transition: background 200ms; /* não anima: o browser não sabe o tipo */
}

.button:hover {
  --color-primary: #1d4ed8; /* muda instantaneamente, sem transição */
}
```

</details>

<details>
<summary>✅ Bom: o tipo declarado libera a transição, e o valor inicial cobre a ausência</summary>

```css
@property --color-primary {
  syntax: "<color>";
  inherits: true;
  initial-value: #3b82f6; /* valor quando não definido: nunca inválido */
}

@property --transition-duration {
  syntax: "<time>";
  inherits: false;
  initial-value: 200ms;
}

@property --border-radius {
  syntax: "<length>";
  inherits: false;
  initial-value: 4px;
}

/* @property também habilita transições em custom properties */
.button {
  background: var(--color-primary); /* usa initial-value se não definido */
  transition: background var(--transition-duration);
}
```

</details>

> O `@property` funciona nos navegadores atuais (Chrome 85+, Firefox 128+, Safari 16.4+). Onde
> for preciso atender navegador antigo, o `var()` com valor de reserva cobre sozinho.

## Uma reserva pode apontar para outra

O valor de reserva aceita outro `var()` dentro dele, e assim se monta uma cadeia. O navegador tenta o primeiro token; se ele não existir, tenta o segundo; e assim por diante, até o valor escrito à mão no fim da linha.

Isso dá ao componente uma ordem de preferência. Ele usa o token próprio dele, se alguém tiver declarado um. Na falta, cai no token do tema. Na falta dos dois, cai na cor da marca. E o último valor da cadeia garante que sempre existe algo para pintar.

<details>
<summary>❌ Ruim: o tema declara a cor da marca, e o botão aponta para um token que nunca existiu</summary>

```css
:root {
  --color-brand: #3b82f6;
}

/* --color-primary nunca foi definido: o button fica sem cor de fundo */
.button {
  background: var(--color-primary);  /* valor inválido: sem fallback */
}

/* tema alternativo esquece de definir --color-primary */
[data-theme="dark"] {
  --color-brand: #60a5fa;  /* --color-primary ainda não existe */
}
```

</details>

<details>
<summary>✅ Bom: a cadeia tenta o token do componente, o do tema, o da marca, e por fim o valor escrito</summary>

```css
:root {
  --color-brand: #3b82f6;
}

.button {
  /* tenta o token do componente, então o token do tema, depois o valor hardcoded */
  background: var(--button-bg, var(--color-primary, var(--color-brand, #3b82f6)));
}

/* tema alternativo precisa apenas definir --color-primary */
[data-theme="dark"] {
  --color-primary: #60a5fa;
}
```

</details>

## Para remover um estilo, diga isso, em vez de escrever um valor neutro

Escrever `box-shadow: none` e `border-radius: 0` funciona, e não é o que você quis dizer. A intenção era remover o que a classe pai aplicou, e o que ficou escrito foi um valor específico, escolhido à mão para parecer com a ausência dele.

Existem palavras para dizer "remova" com todas as letras, e cada uma remove até um ponto diferente:

| Palavra | O que ela faz |
| --- | --- |
| `initial` | Volta ao valor que a especificação do CSS define, ignorando o que o elemento herdaria |
| `unset` | Volta ao valor herdado, quando a propriedade herda. Quando não herda, volta ao inicial |
| `revert` | Volta ao valor que o próprio navegador daria ao elemento, sem nenhum CSS seu |
| `revert-layer` | Volta ao valor que a camada anterior da cascata tinha definido |

O `all: unset` merece destaque: ele zera todas as propriedades de uma vez, o que resolve o reset de um `<button>` em uma linha, no lugar das cinco declarações que fazem isso à mão.

<details>
<summary>❌ Ruim: valores escolhidos à mão para imitar a ausência de estilo</summary>

```css
/* valores mágicos para "remover" estilo, frágeis e sem intenção clara */
.card--plain {
  box-shadow: none;        /* magic value: "sem sombra" */
  border-radius: 0;        /* magic value: "sem raio" */
  background: transparent; /* magic value: "sem fundo" */
}

/* reset de botão com valores arbitrários */
.unstyled-button {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  font-size: inherit;      /* herança explícita, mas frágil */
}
```

</details>

<details>
<summary>✅ Bom: as palavras dizem "remova", e o reset do botão cabe em uma linha</summary>

```css
/* remover estilo aplicado por classe pai */
.card--plain {
  box-shadow: unset; /* sem sombra, não "none" como magic value */
  border-radius: unset; /* remove o border-radius herdado */
}

/* resetar todos os estilos de um elemento */
.unstyled-button {
  all: unset; /* reseta tudo para o valor herdado ou initial */
  cursor: pointer; /* reaplica apenas o necessário */
}

/* voltar ao estilo do browser para um elemento que foi sobrescrito */
.reset-to-browser {
  color: revert;
  font-size: revert;
}
```

</details>
