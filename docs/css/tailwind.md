# Tailwind

**Tailwind** (framework de CSS utility-first) é **utility-first** (utilidades em primeiro lugar). A produtividade vem de não sair do **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto), mas há um limite. Quando a lista de **utility class** (classe utilitária) cresce, o HTML vira ruído e o padrão se repete sem nome.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Tailwind** (framework de CSS utility-first) | Conjunto de classes atômicas geradas a partir de um `theme` configurável |
| **utility-first** (utilidades em primeiro lugar) | Compor estilo via classes atômicas no HTML, sem CSS por componente |
| **utility class** (classe utilitária) | Classe que faz uma coisa só: `p-4`, `text-center`, `bg-blue-600` |
| **JIT** (Just-In-Time, compilação sob demanda) | Compilador gera só as classes detectadas nos arquivos escaneados |
| **arbitrary value** (valor arbitrário) | `bg-[#1da1f2]`, `top-[117px]`; escapa do **theme** quando necessário |
| **theme** (tema) | Objeto em `tailwind.config` que define escalas de cor, espaço, tipografia |
| **@apply** (extrair utilidades) | Diretiva pra agrupar utilities em uma classe de componente em `@layer components` |
| **variant** (variante) | Prefixo de estado/breakpoint: `hover:`, `md:`, `dark:` |

## Utility sprawl

Uma lista longa de utilities não é componente: é o estado antes de extrair um.

<details>
<summary>❌ Bad — lista inlegível, sem nome, não reutilizável</summary>
<br>

```html
<button class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
  Salvar
</button>
```

</details>

<br>

<details>
<summary>✅ Good — utilities extraídas para componente com @layer</summary>
<br>

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
tokens no config gera classes semânticas e mantém o design system consistente.

<details>
<summary>❌ Bad — valores arbitrários, magic numbers espalhados</summary>
<br>

```html
<div class="text-[13px] bg-[#1e293b] rounded-[6px] p-[18px]">...</div>
```

</details>

<br>

<details>
<summary>✅ Good — tokens no tailwind.config, classes semânticas no HTML</summary>
<br>

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
