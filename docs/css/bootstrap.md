# Bootstrap

**Bootstrap** (framework de CSS baseado em componentes) fornece componentes prontos via classes. Sobrescrever com `!important` ou redefinir seletores internos cria CSS que briga com o framework e perde. **override** (sobrescrita) via **custom property** (propriedade customizada) é o caminho suportado desde o Bootstrap 5.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Bootstrap** (framework de CSS baseado em componentes) | Biblioteca com `.btn`, `.card`, `.modal` prontos e grid de 12 colunas |
| **utility class** (classe utilitária) | Classe atômica como `.mt-3`, `.text-center`; modifica uma propriedade |
| **component class** (classe de componente) | Classe de papel como `.btn`, `.alert`; aplica o conjunto de estilos |
| **modifier** (modificador) | Variante de componente: `.btn-primary`, `.alert-danger` |
| **breakpoint** (ponto de quebra) | Sufixos `-sm`, `-md`, `-lg`, `-xl`, `-xxl` ativam regra a partir do tamanho |
| **grid** (sistema de grade) | `.container`/`.row`/`.col-*`; layout de 12 colunas responsivo |
| **custom property override** (sobrescrita por propriedade customizada) | Redefinir `--bs-*` no escopo do componente; não altera especificidade |

## Override via custom properties

Bootstrap 5 expõe custom properties em todos os componentes. Sobrescrever a variável muda o
visual sem alterar a especificidade do framework.

<details>
<summary>❌ Bad — sobrescrita por seletor ou !important</summary>
<br>

```css
.btn-primary {
  background-color: #7c3aed !important;
  border-color: #7c3aed !important;
}

.btn-primary:hover {
  background-color: #6d28d9 !important;
}
```

</details>

<br>

<details>
<summary>✅ Good — override via custom properties do Bootstrap</summary>
<br>

```css
:root {
  --bs-primary: #7c3aed;
  --bs-primary-rgb: 124, 58, 237;
  --bs-btn-bg: var(--bs-primary);
  --bs-btn-border-color: var(--bs-primary);
  --bs-btn-hover-bg: #6d28d9;
}
```

</details>

## Extensão de componente

Use as classes base do framework e adicione apenas o delta como modificador. Criar uma nova classe
que duplica o componente Bootstrap desacopla do framework.

<details>
<summary>❌ Bad — duplica o componente base, desacopla do framework</summary>
<br>

```html
<div class="my-card">...</div>
```

```css
.my-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  /* recria manualmente o que .card já faz */
}
```

</details>

<br>

<details>
<summary>✅ Good — compõe sobre a classe base, adiciona apenas o delta</summary>
<br>

```html
<div class="card card--product">...</div>
```

```css
.card--product {
  --bs-card-border-color: var(--color-primary);
  --bs-card-border-radius: 12px;
}
```

</details>
