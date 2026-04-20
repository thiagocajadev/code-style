# Tailwind

Tailwind é utility-first. A produtividade vem de não sair do HTML — mas isso tem um limite.
Quando a lista de utilities cresce, o HTML vira ruído e o padrão se repete sem nome.

## Utility sprawl

Uma lista longa de utilities não é componente — é o estado antes de extrair um.

<details>
<br>
<summary>❌ Bad — lista inlegível, sem nome, não reutilizável</summary>

```html
<button class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
  Salvar
</button>
```

</details>

<br>

<details>
<br>
<summary>✅ Good — utilities extraídas para componente com @layer</summary>

```css
/* components/button.css */
@layer components {
  .button--primary {
    @apply inline-flex items-center justify-center gap-2
           px-4 py-2 text-sm font-semibold
           text-white bg-blue-600 rounded-md shadow-sm
           hover:bg-blue-700 focus:outline-none focus:ring-2
           focus:ring-blue-500 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors;
  }
}
```

```html
<button class="button--primary">Salvar</button>
```

</details>

## Design tokens no config

Valores arbitrários (`text-[14px]`, `bg-[#3b82f6]`) espalham magic numbers pelo HTML. Registrar
os tokens no config gera classes semânticas e mantém o design system consistente.

<details>
<br>
<summary>❌ Bad — valores arbitrários, magic numbers espalhados</summary>

```html
<div class="text-[13px] bg-[#1e293b] rounded-[6px] p-[18px]">...</div>
```

</details>

<br>

<details>
<br>
<summary>✅ Good — tokens no tailwind.config, classes semânticas no HTML</summary>

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        surface: { dark: '#1e293b' },
      },
      borderRadius: {
        card: '6px',
      },
      spacing: {
        18: '18px',
      },
      fontSize: {
        caption: '13px',
      },
    },
  },
};
```

```html
<div class="text-caption bg-surface-dark rounded-card p-18">...</div>
```

</details>
