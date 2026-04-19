# Responsive

Mobile-first significa definir o estilo base para mobile e **expandir** com `min-width`. O
inverso — começar no desktop e restringir com `max-width` — cria sobreposições e resets
desnecessários.

## Mobile-first

<details>
<summary>❌ Bad — desktop-first: base para tela grande, override para tela pequena</summary>

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
<summary>✅ Good — mobile-first: base simples, expansão progressiva</summary>

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

## Breakpoints nomeados

Valores de breakpoint espalhados em vários arquivos criam inconsistência — mudar `768px` exige
grep no projeto inteiro.

<details>
<summary>❌ Bad — pixel values mágicos e inconsistentes entre arquivos</summary>

```css
/* layout.css */
@media (min-width: 768px) { }

/* nav.css — valor diferente para o mesmo breakpoint */
@media (min-width: 760px) { }

@media (min-width: 1024px) { }
```

</details>

<details>
<summary>✅ Good — breakpoints centralizados como fonte única de verdade</summary>

```css
/* tokens/breakpoints.css — definição única */
:root {
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}
```

```css
/* layout.css — valor consistente, comentário documenta o token */
@media (min-width: 768px) /* --bp-md */ { }
```

> Custom properties não funcionam dentro de `@media` — use o valor diretamente e referencie o
> token no comentário. A centralização acontece no arquivo de tokens como fonte única de verdade.

</details>
