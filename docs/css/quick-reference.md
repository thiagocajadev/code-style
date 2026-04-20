# Quick Reference

Tabelas de consulta rápida para as convenções CSS deste guia.

## Nomenclatura

| Contexto | Convenção | Exemplos |
| --- | --- | --- |
| Bloco | kebab-case | `.card`, `.nav-bar`, `.product-list` |
| Elemento BEM | `bloco__elemento` | `.card__title`, `.nav-bar__link` |
| Modificador BEM | `bloco--modificador` | `.card--featured`, `.button--primary` |
| Custom property | `--kebab-case` | `--color-primary`, `--spacing-md` |
| Arquivo CSS | kebab-case | `card.css`, `nav-bar.css` |

## Ordem de propriedades

| Grupo | Propriedades |
| --- | --- |
| Posicionamento | `position`, `top/right/bottom/left`, `z-index` |
| Box model | `display`, `width/height/min/max`, `margin`, `padding` |
| Tipografia | `font-*`, `line-height`, `text-*`, `color` |
| Visual | `background`, `border`, `border-radius`, `box-shadow`, `opacity` |
| Animação | `transition`, `animation` |

## Tokens semânticos

| Categoria | Padrão | Exemplos |
| --- | --- | --- |
| Cor | `--color-{papel}` | `--color-primary`, `--color-surface`, `--color-danger` |
| Tipografia | `--font-{aspecto}` | `--font-size-md`, `--font-weight-bold` |
| Espaçamento | `--spacing-{tamanho}` | `--spacing-xs`, `--spacing-md`, `--spacing-xl` |
| Raio | `--radius-{tamanho}` | `--radius-sm`, `--radius-lg` |
| Sombra | `--shadow-{tamanho}` | `--shadow-sm`, `--shadow-card` |
| Breakpoint | `--bp-{tamanho}` | `--bp-md` (768px), `--bp-lg` (1024px) |

## Unidades

| Unidade | Nome completo | Quando usar |
| --- | --- | --- |
| `px` | pixel | Borders, sombras, valores fixos precisos |
| `rem` | root em | Tipografia e espaçamento; escala com o `font-size` do `:root` |
| `em` | em | Espaçamento relativo ao `font-size` do elemento pai |
| `%` | percentual | Layout proporcional ao elemento pai |
| `vh` / `vw` | viewport height / width | Dimensões relativas à janela do browser |
| `svh` / `dvh` | small / dynamic viewport height | Viewport mobile; corrige a barra de URL que some ao rolar |
| `fr` | fraction | Distribuição de espaço no CSS Grid (`1fr 2fr` = 1/3 e 2/3) |
| `ch` | character | Largura baseada no glifo `0` da fonte; útil para colunas de texto |

> `rem` é o mais seguro para tipografia e espaçamento: baseia-se no `:root`, não no pai imediato.
> `em` acumula escala em elementos aninhados, o que pode surpreender.

## Propriedades que confundem

| Propriedade | O que faz |
| --- | --- |
| `z-index` | Profundidade no eixo Z. Maior valor fica na frente. Só funciona em elementos com `position` definido |
| `box-shadow` | Sombra ao redor do box do elemento: `offset-x offset-y blur spread color` |
| `box-sizing` | `border-box` inclui padding e border no `width` declarado; é o padrão sensato |
| `overflow` | O que acontece quando o conteúdo ultrapassa o box: `hidden`, `scroll`, `auto` |
| `display` | Como o elemento participa do layout: `block`, `inline`, `flex`, `grid`, `none` |
| `opacity` | Transparência do elemento inteiro (0–1); diferente de `rgba()`, que afeta só a cor |
| `pointer-events` | `none` remove o elemento da interação do mouse sem escondê-lo visualmente |
| `will-change` | Avisa o browser para promover o elemento a layer; usar com parcimônia |

---

## Tailwind: prefixos de espaçamento

Padrão: `{propriedade}{lado}-{escala}`. A escala é um número de 0 a 96; cada unidade equivale a `0.25rem`.

| Prefixo | Propriedade CSS | Exemplo |
| --- | --- | --- |
| `p` | `padding` (todos os lados) | `p-4` → `padding: 1rem` |
| `px` | `padding-left` + `padding-right` (eixo X) | `px-6` → padding horizontal |
| `py` | `padding-top` + `padding-bottom` (eixo Y) | `py-2` → padding vertical |
| `pt` / `pb` | `padding-top` / `padding-bottom` | `pt-8` → `padding-top: 2rem` |
| `pl` / `pr` | `padding-left` / `padding-right` | `pl-4` |
| `ps` / `pe` | `padding-inline-start` / `end` (lógico, RTL-safe) | `ps-4` |
| `m` | `margin` (todos os lados) | `m-auto`, `m-4` |
| `mx` / `my` | margin nos eixos X / Y | `mx-auto` → centraliza horizontalmente |
| `mt` / `mb` / `ml` / `mr` | margin por lado | `mt-2`, `mb-4` |
| `gap` | `gap` (flex / grid) | `gap-4` → espaço entre filhos |
| `space-x` / `space-y` | `margin` entre filhos no eixo X / Y | `space-y-4` |
| `w` / `h` | `width` / `height` | `w-full`, `h-screen`, `w-1/2` |
| `min-w` / `max-w` | `min-width` / `max-width` | `max-w-lg` |
| `z` | `z-index` | `z-10`, `z-50` |
| `shadow` | `box-shadow` | `shadow-sm`, `shadow-lg` |
| `rounded` | `border-radius` | `rounded-md`, `rounded-full` |
| `opacity` | `opacity` | `opacity-50` → `opacity: 0.5` |
