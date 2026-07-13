# Tailwind

O **Tailwind** (framework de CSS montado sobre classes utilitárias) troca o arquivo de CSS por uma lista de classes escritas direto no HTML. `p-4` aplica espaçamento, `bg-blue-600` aplica cor de fundo, e você monta o botão sem trocar de arquivo. A produtividade vem daí.

O ponto de atenção aparece quando a lista cresce. Um botão com vinte classes ocupa três linhas de HTML, e o padrão que ele representa não tem nome nenhum: para reusar aquele botão em outra tela, alguém copia as vinte classes, e a partir daí existem duas cópias para manter em sincronia.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Tailwind** (framework de CSS montado sobre classes utilitárias) | Conjunto de classes geradas a partir de um tema configurável |
| **utility class** (classe utilitária) | Classe que faz uma coisa só: `p-4`, `text-center`, `bg-blue-600` |
| **JIT** (Just-In-Time · compilação sob demanda) | O compilador varre os arquivos e gera só as classes que ele encontrou em uso |
| **arbitrary value** (valor solto) | Um valor escrito à mão, como `bg-[#1da1f2]` ou `top-[117px]`, que passa por fora do tema |
| **theme** (tema) | O objeto do `tailwind.config` onde ficam as escalas de cor, espaçamento e tipografia |
| **@apply** (extração para uma classe) | Diretiva que junta várias utilitárias numa classe de componente, dentro de `@layer components` |
| **variant** (variante) | O prefixo que liga a classe em uma condição: `hover:`, `md:`, `dark:` |

## Quando a lista de classes cresce, dê um nome a ela

Vinte classes numa tag são o sinal de que existe um componente ali, ainda sem nome. O `@apply` dentro de `@layer components` dá esse nome: as utilitárias saem do HTML e passam a morar numa classe.

A marcação volta a ser legível, e o botão passa a existir num lugar só. Mudar a cor dele deixa de ser uma busca por todas as telas que copiaram a lista.

<details>
<summary>❌ Ruim: vinte classes na tag, e reusar o botão significa copiar as vinte</summary>

```html
<button class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
  Salvar
</button>
```

</details>

<details>
<summary>✅ Bom: as classes viram um componente com nome, e a marcação encolhe para uma linha</summary>

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

## Registre o valor no tema, em vez de escrever ele à mão

O Tailwind aceita valores soltos entre colchetes, como `text-[13px]` e `bg-[#1e293b]`. Eles resolvem o caso da tela em que você está, e espalham números pela marcação: no mês seguinte, o `#1e293b` aparece em oito arquivos, com um `#1e293c` no meio, digitado errado.

Registrar o valor no `tailwind.config` transforma ele numa classe com nome. `bg-surface-dark` diz o que a cor é, e a troca acontece na configuração, uma vez.

<details>
<summary>❌ Ruim: quatro valores escritos à mão na tag, sem nome e sem lugar de origem</summary>

```html
<div class="text-[13px] bg-[#1e293b] rounded-[6px] p-[18px]">...</div>
```

</details>

<details>
<summary>✅ Bom: os valores viram tokens no config, e as classes passam a dizer o que são</summary>

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
