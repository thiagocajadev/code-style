# Densidade visual em CSS

As regras de [densidade visual](../../shared/standards/visual-density.md) valem em CSS com duas ferramentas: a linha em branco separa um bloco de regras do seguinte, e dentro do bloco ela separa as propriedades que cuidam de coisas diferentes.

CSS é declarativo, e não tem retorno de função, condicional nem guarda. As regras de densidade que tratam disso ficam de fora aqui. O que sobra é separar as unidades umas das outras e nunca alinhar valores em coluna.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **ruleset** (bloco de regras) | O seletor mais as declarações entre chaves. É a unidade do arquivo |
| **declaration** (declaração) | Um par `propriedade: valor;` dentro do bloco |
| **blank line** (linha em branco) | Separa duas unidades. Uma só entre elas, nunca duas seguidas |
| **multi-line block** (bloco de várias linhas) | `@media`, `@keyframes` ou uma regra aninhada. Pede uma linha em branco depois quando outra regra vem em seguida |
| **column alignment** (alinhamento em colunas) | Espaços extras para alinhar os `:` ou os valores na vertical. Antipadrão |
| **nesting** (aninhamento) | Escrever um bloco dentro de outro, o que o CSS passou a aceitar sem pré-processador |

## Referência rápida

| Regra | Descrição |
| --- | --- |
| Uma linha em branco entre blocos | Cada seletor com o bloco dele é uma unidade, e fica separado do próximo |
| Bloco de várias linhas pede respiro depois | Um `@media` ou um `@keyframes` seguido de outra regra leva uma linha em branco entre os dois |
| Propriedades agrupadas dentro do bloco | Posição, caixa, texto e acabamento, nesta ordem, separados por linha em branco quando o bloco for longo |
| Um espaço depois do `:` | Nunca alinhe os valores nem os comentários na vertical |
| Uma linha em branco basta | Duas seguidas são ruído |

## A regra central

Cada bloco de regras é uma unidade, e uma linha em branco o separa do próximo. É essa separação que permite descer o arquivo e enxergar quantos seletores existem sem ler nenhum deles.

Dentro do bloco, as propriedades da mesma responsabilidade ficam juntas. Quando o bloco cresce, as quatro responsabilidades (posição, caixa, texto e acabamento) ganham uma linha em branco entre si.

## Uma linha em branco entre um bloco e o próximo

Sem respiro entre os blocos, os seletores se perdem no meio das declarações, e achar onde `.card__header` começa vira uma leitura linha a linha.

<details>
<summary>❌ Ruim: três blocos colados, e os seletores somem no meio das declarações</summary>

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
<summary>✅ Bom: uma linha em branco entre cada regra</summary>

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

## Dentro do bloco, agrupe as propriedades por responsabilidade

Num bloco longo, as propriedades se dividem em quatro grupos: posição, caixa, texto e acabamento. Uma linha em branco entre eles responde de longe onde está a propriedade que você procura.

Num bloco de três ou quatro propriedades, deixe todas juntas. A separação ali fragmenta um grupo que já se lê de uma vez.

A ordem dos grupos vem de [Formatação](formatting.md#property-order).

<details>
<summary>❌ Ruim: doze propriedades empilhadas, sem divisão entre as responsabilidades</summary>

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
<summary>✅ Bom: quatro grupos separados, e cada responsabilidade se lê de uma vez</summary>

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

## Depois de um bloco de várias linhas, deixe um respiro

Um `@media` ou um `@keyframes` traz chaves dentro de chaves e ocupa dez ou quinze linhas. Sem uma linha em branco depois dele, a chave que fecha o bloco e a chave que fecha a regra de dentro ficam empilhadas, e a regra seguinte parece continuar ali dentro.

<details>
<summary>❌ Ruim: dois @media colados, e as chaves de fechamento se confundem</summary>

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
<summary>✅ Bom: uma linha em branco isola cada bloco do próximo</summary>

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

## No bloco aninhado, cada filho ganha uma linha em branco antes

Ao aninhar um bloco dentro do outro, as declarações do pai e o começo do filho ficam encostados, e o olho perde o limite entre os dois níveis. Uma linha em branco antes de cada filho mantém a hierarquia visível.

<details>
<summary>❌ Ruim: pai e filhos colados, e os níveis se misturam</summary>

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
<summary>✅ Bom: cada filho começa depois de um respiro, e os níveis se distinguem</summary>

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

## Não alinhe o código em colunas

Use um espaço depois do `:`. Alinhar os valores ou os comentários na vertical parece organizado e sai caro: renomear um token desalinha o bloco inteiro, o diff do Git marca todas as linhas como alteradas, e alguém precisa reespaçar tudo a cada mudança.

<details>
<summary>❌ Ruim: espaços extras alinham os valores e os comentários na vertical</summary>

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
<summary>✅ Bom: um espaço depois do `:`, e nada alinhado à força</summary>

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

## Uma linha em branco basta

Duas linhas em branco seguidas afastam os blocos sem dizer nada a mais: a separação já estava feita pela primeira.

Quando um conjunto de blocos precisa se destacar do resto do arquivo, o que marca isso é um comentário nomeando a seção.

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