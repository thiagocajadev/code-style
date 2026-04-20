# Bootstrap

Bootstrap fornece componentes prontos via classes. Sobrescrever com `!important` ou redefinir
seletores internos cria CSS que briga com o framework — e perde. Override via custom properties
é o caminho suportado desde o Bootstrap 5.

## Override via custom properties

Bootstrap 5 expõe custom properties em todos os componentes. Sobrescrever a variável muda o
visual sem tocar na especificidade do framework.

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

Não criar nova classe que duplica o componente Bootstrap — usar classes base do framework e
adicionar apenas o delta como modificador.

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
