# Layout responsivo em CSS

Escreva o estilo da tela pequena primeiro, e vá acrescentando regras conforme a tela cresce. É isso que **mobile-first** (mobile primeiro) quer dizer, e a diferença aparece no volume de código.

Começando pelo desktop, o layout de duas colunas vira a base, e a tela do celular precisa desfazer o que a base montou: voltar para uma coluna, reduzir o espaçamento, esconder o que não cabe. Cada regra ganha uma contra-regra. Começando pelo celular, a base já é o caso simples, e a tela maior só acrescenta.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **mobile-first** (mobile primeiro) | Escrever o estilo da tela pequena como base, e usar `min-width` para acrescentar regras nas telas maiores |
| **breakpoint** (largura de corte) | A largura em que o layout muda. As mais usadas são 640px, 768px, 1024px e 1280px |
| **media query** (consulta de mídia) | `@media (min-width: 768px)`, que aplica um conjunto de regras só a partir daquela largura |
| **container query** (consulta de container) | `@container (min-width: 320px)`, que olha o tamanho do elemento pai em vez do tamanho da tela |
| **viewport unit** (unidade da área visível) | `vw`, `vh`, `dvh` e `svh`, medidas que acompanham o tamanho da área visível |
| **fluid type** (tipografia fluida) | `clamp(mínimo, ideal, máximo)`, que faz a fonte crescer junto com a tela dentro de dois limites |
| **aspect-ratio** (proporção) | Reserva o espaço na proporção declarada, como `16/9`, para o conteúdo não pular quando a mídia carrega |

<a id="mobile-first"></a>

## Comece pela tela pequena, e cresça a partir dela

<details>
<summary>❌ Ruim: a base é o desktop, e a tela pequena precisa desfazer o que ela montou</summary>

```css
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 32px;
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

</details>

<details>
<summary>✅ Bom: a base é uma coluna, e a tela maior só acrescenta a segunda</summary>

```css
.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .layout {
    grid-template-columns: 240px 1fr;
    gap: 32px;
  }
}
```

</details>

## As larguras de corte ficam declaradas num lugar só

Quando cada arquivo escolhe a própria largura, o layout desalinha em silêncio. O `layout.css` corta em 768px e o `nav.css` corta em 760px, então existe uma faixa de oito pixels em que o menu já mudou e o conteúdo ainda não. Ninguém escreveu isso de propósito: os oito pixels são um erro de digitação que nenhuma ferramenta acusa.

Declarar as larguras em um arquivo de tokens dá o valor de referência ao time.

<details>
<summary>❌ Ruim: dois arquivos cortam em larguras quase iguais, e o layout desalinha entre elas</summary>

```css
/* layout.css */
@media (min-width: 768px) { }

/* nav.css: valor diferente para o mesmo breakpoint */
@media (min-width: 760px) { }

@media (min-width: 1024px) { }
```

</details>

<details>
<summary>✅ Bom: as larguras declaradas num arquivo de tokens, e citadas no comentário</summary>

```css
/* tokens/breakpoints.css: definição única */
:root {
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}
```

```css
/* layout.css: valor consistente, comentário documenta o token */
@media (min-width: 768px) /* --bp-md */ { }
```

> Uma limitação vale registrar: a variável do CSS não funciona dentro do `@media`. O navegador
> resolve a consulta de mídia antes de resolver as variáveis, então `@media (min-width: var(--bp-md))`
> não tem efeito. O valor vai escrito à mão, com o nome do token no comentário ao lado.

</details>
