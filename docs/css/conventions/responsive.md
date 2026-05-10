# Responsive

**mobile-first** (mobile primeiro) significa definir o estilo base pra mobile e expandir com `min-width`. Começar no desktop e restringir com `max-width` cria sobreposições e resets desnecessários.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **mobile-first** (mobile primeiro) | Base pra tela pequena; `min-width` adiciona regras pra telas maiores |
| **breakpoint** (ponto de quebra) | Largura em que o layout muda; convenções: 640px, 768px, 1024px, 1280px |
| **media query** (consulta de mídia) | `@media (min-width: 768px)`; aplica regras condicionalmente |
| **container query** (consulta de container) | `@container (min-width: 320px)`; responde ao tamanho do pai, não da viewport |
| **viewport unit** (unidade de viewport) | `vw`, `vh`, `dvh`, `svh`; medidas relativas à área visível |
| **fluid type** (tipografia fluida) | `clamp(min, preferred, max)`; escala suave entre limites |
| **aspect-ratio** (razão de aspecto) | Reserva proporção de espaço (`16/9`); previne layout shift |

## Mobile-first

<details>
<summary>❌ Bad — desktop-first: base para tela grande, override para tela pequena</summary>
<br>

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

<br>

<details>
<summary>✅ Good — mobile-first: base simples, expansão progressiva</summary>
<br>

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

Valores de breakpoint espalhados em vários arquivos criam inconsistência. Mudar `768px` exige
grep no projeto inteiro.

<details>
<summary>❌ Bad — pixel values mágicos e inconsistentes entre arquivos</summary>
<br>

```css
/* layout.css */
@media (min-width: 768px) { }

/* nav.css — valor diferente para o mesmo breakpoint */
@media (min-width: 760px) { }

@media (min-width: 1024px) { }
```

</details>

<br>

<details>
<summary>✅ Good — breakpoints centralizados como fonte única de verdade</summary>
<br>

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

> Custom properties não funcionam dentro de `@media`. Use o valor diretamente e referencie o
> token no comentário. A centralização acontece no arquivo de tokens como fonte única de verdade.

</details>
