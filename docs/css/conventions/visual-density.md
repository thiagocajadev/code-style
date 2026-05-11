# Visual density: CSS

Os mesmos princípios de [densidade visual](../../shared/standards/visual-density.md) aplicados a CSS: agrupar **declaration** (declaração) por responsabilidade e separar **ruleset** (bloco de regras) distintos com **blank line** (linha em branco). CSS é declarativo — não há control flow, retorno ou guarda. Sobram as regras de separação entre unidades e de proibição de alinhamento artificial.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **ruleset** (bloco de regras) | Seletor + declarações entre chaves; unidade semântica do arquivo |
| **declaration** (declaração) | Par `propriedade: valor;` dentro do ruleset |
| **blank line** (linha em branco) | Separador entre unidades coesas; uma só, nunca duas seguidas |
| **declaration group** (grupo de declarações) | Conjunto de propriedades da mesma responsabilidade (posição, box, tipografia, visual) |
| **multi-line block** (bloco multi-linha) | `@media`, `@keyframes` ou regra aninhada com várias linhas; pede linha em branco depois quando seguido de outra regra |
| **column alignment** (alinhamento de coluna) | Espaços extras para alinhar `:` ou valores verticalmente; antipadrão — frágil a renomeações, gera diff ruidoso |
| **scannability** (legibilidade vertical) | Capacidade de localizar uma regra ou propriedade sem ler o arquivo todo |

## Referência rápida

| Regra | Descrição |
| --- | --- |
| **Rulesets separados por blank** | Cada seletor + bloco é uma unidade; uma linha em branco entre rulesets consecutivos |
| **Blocos multi-linha pedem respiro depois** | `@media`, `@keyframes` e aninhamentos com várias linhas exigem linha em branco quando seguidos de outra regra |
| **Agrupamento semântico dentro do ruleset** | Posição → box → tipografia → visual; grupos diferentes podem ser separados por blank quando o ruleset é longo |
| **Sem alinhamento de coluna** | Um espaço único após `:`; nunca alinhar valores ou comentários verticalmente |
| **Nunca duplo respiro** | Exatamente uma linha em branco entre unidades; duas é ruído |

## A regra central

**Cada ruleset é uma unidade.** Uma linha em branco separa rulesets consecutivos e revela a estrutura no scan vertical. Dentro do ruleset, propriedades relacionadas ficam juntas; grupos distintos (posição, box, tipografia, visual) podem ser separados por blank quando o bloco é longo o suficiente para se beneficiar.

## Entre regras: blank line entre rulesets

Cada bloco CSS é uma unidade semântica. Uma linha em branco entre seletores distintos separa responsabilidades e torna o arquivo escaneável.

<details>
<summary>❌ Ruim — regras coladas, sem respiro entre blocos</summary>

```css
.card {
  padding: 16px;
  border-radius: 8px;
}
.card__header {
  font-size: 1.125rem;
  font-weight: 600;
}
.card__body {
  color: var(--color-text-muted);
  line-height: 1.6;
}
```

</details>

<details>
<summary>✅ Bom — uma linha em branco entre cada regra</summary>

```css
.card {
  padding: 16px;
  border-radius: 8px;
}

.card__header {
  font-size: 1.125rem;
  font-weight: 600;
}

.card__body {
  color: var(--color-text-muted);
  line-height: 1.6;
}
```

</details>

## Grupos de propriedades dentro do ruleset

Dentro de uma regra longa, propriedades são agrupadas por responsabilidade: posicionamento, layout/box, tipografia, visual. Uma linha em branco separa cada grupo e torna o bloco legível de cima pra baixo. Para rulesets curtos (3-4 propriedades), o agrupamento é dispensável — o blank fica ruído.

A ordem dos grupos é definida em [Formatting](formatting.md#ordem-de-propriedades).

<details>
<summary>❌ Ruim — propriedades longas sem separação entre grupos</summary>

```css
.modal {
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  font-size: 1rem;
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}
```

</details>

<details>
<summary>✅ Bom — grupos separados, cada responsabilidade legível</summary>

```css
.modal {
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;

  font-size: 1rem;
  line-height: 1.5;

  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
}
```

</details>

## Blocos multi-linha pedem respiro depois

`@media`, `@keyframes` e regras aninhadas (CSS nesting ou SCSS) ocupam várias linhas físicas — peso visual próprio. Quando seguidos de outra regra, exigem linha em branco depois para isolar o bloco grande.

<details>
<summary>❌ Ruim — @media colados, sem separação visual</summary>

```css
.hero {
  padding: 16px;
  font-size: 1rem;
}
@media (min-width: 768px) {
  .hero {
    padding: 32px;
    font-size: 1.25rem;
  }
}
@media (min-width: 1280px) {
  .hero {
    padding: 64px;
    font-size: 1.5rem;
  }
}
```

</details>

<details>
<summary>✅ Bom — uma linha em branco entre cada bloco</summary>

```css
.hero {
  padding: 16px;
  font-size: 1rem;
}

@media (min-width: 768px) {
  .hero {
    padding: 32px;
    font-size: 1.25rem;
  }
}

@media (min-width: 1280px) {
  .hero {
    padding: 64px;
    font-size: 1.5rem;
  }
}
```

</details>

## CSS nesting: cada bloco aninhado é uma unidade

Com CSS nesting (ou SCSS), cada bloco aninhado é uma unidade separada. Uma linha em branco antes de cada bloco filho mantém a hierarquia clara.

<details>
<summary>❌ Ruim — tudo colado, hierarquia difícil de ler</summary>

```css
.nav {
  display: flex;
  gap: 8px;
  .nav__item {
    padding: 8px 12px;
    border-radius: 4px;
    &:hover {
      background: var(--color-surface-hover);
    }
    &.is-active {
      color: var(--color-primary);
      font-weight: 600;
    }
  }
}
```

</details>

<details>
<summary>✅ Bom — cada bloco aninhado separado, hierarquia visível</summary>

```css
.nav {
  display: flex;
  gap: 8px;

  .nav__item {
    padding: 8px 12px;
    border-radius: 4px;

    &:hover {
      background: var(--color-surface-hover);
    }

    &.is-active {
      color: var(--color-primary);
      font-weight: 600;
    }
  }
}
```

</details>

## Sem alinhamento de coluna

Não alinhe verticalmente `:`, valores ou comentários com múltiplos espaços. Use sempre **um espaço único** após `:`. Alinhamento artificial quebra com qualquer renomeação de token, gera diff ruidoso e treina o olho a procurar colunas que somem na primeira refatoração.

<details>
<summary>❌ Ruim — espaços extras para alinhar valores e comentários</summary>

<!-- prettier-ignore -->
```css
:root {
  --color-primary:       #3b82f6;
  --color-primary-hover: #2563eb;
  --color-on-primary:    #ffffff;
  --color-danger:        #ef4444;
  --color-surface:       #ffffff;
  --color-border:        #e5e7eb;
}

.button {
  background: var(--color-primary);     /* cor de fundo */
  border-radius: 6px;                   /* raio */
  padding: 8px 16px;                    /* espaçamento interno */
}
```

</details>

<details>
<summary>✅ Bom — espaço único, sem espaçamento extra</summary>

```css
:root {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-on-primary: #ffffff;
  --color-danger: #ef4444;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
}

.button {
  background: var(--color-primary); /* cor de fundo */
  border-radius: 6px; /* raio */
  padding: 8px 16px; /* espaçamento interno */
}
```

</details>

## Nunca duplo respiro

Exatamente uma linha em branco entre rulesets. Duas linhas em branco seguidas é ruído — fragmenta a leitura sem marcar fase. Se um grupo de rulesets precisa de mais separação, use comentário de seção em vez de double blank.

```css
/* --- Card --- */

.card {
  padding: 16px;
}

.card__header {
  font-weight: 600;
}

/* --- Button --- */

.button {
  padding: 8px 16px;
}
```
</content>
</invoke>