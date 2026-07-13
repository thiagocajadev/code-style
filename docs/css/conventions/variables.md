# Variáveis em CSS

A **custom property** (propriedade customizada) é a variável nativa do CSS, e é com ela que se monta um **design token** (token de design): o valor do design guardado num nome, declarado uma vez e referenciado em todo lugar.

O ganho aparece na hora de mudar. Com o `#3b82f6` copiado em quarenta seletores, trocar a cor da marca exige achar as quarenta ocorrências, e basta esquecer uma para a interface ficar com duas cores de marca. Com o valor num token, a troca acontece na declaração, e as quarenta regras acompanham.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **custom property** (propriedade customizada) | A variável do CSS, declarada como `--nome: valor` e lida com `var(--nome)` |
| **design token** (token de design) | O valor do design guardado num nome que descreve o papel dele, como `--color-primary` |
| **cascade** (cascata) | A ordem em que o navegador aplica as regras, decidida pela origem, pela especificidade e pela posição no arquivo |
| **scope** (escopo) | Onde a variável vale. Declarada num elemento, ela alcança ele e os descendentes. Declarada em `:root`, alcança o documento inteiro |
| **fallback** (valor de reserva) | O segundo argumento de `var(--nome, reserva)`, usado quando a variável não existe |
| **theme switch** (troca de tema) | Redeclarar os tokens dentro de `[data-theme="dark"]`, o que troca o tema sem tocar em nenhuma regra de componente |
| **semantic token** (token semântico) | O token nomeado pelo papel (`--surface-card`), e não pela cor que ele guarda hoje (`--white`) |

<a id="semantic-tokens"></a>

## O nome do token diz para que ele serve

`--blue-500` guarda uma cor e nomeia essa cor. No dia em que a marca virar roxa, você fica com duas opções ruins: renomear o token em todos os arquivos, ou deixar um token chamado `--blue-500` devolvendo roxo.

`--color-primary` guarda a mesma cor e nomeia o papel dela. A troca acontece só no valor.

O par `--color-primary` e `--color-on-primary` merece atenção: o segundo é a cor do texto que fica por cima do primeiro. Guardar os dois juntos mantém o contraste correto quando a cor de fundo mudar.

<details>
<summary>❌ Ruim: a mesma cor copiada em três regras, e o token nomeado pela cor</summary>

```css
.button { background: #3b82f6; }
.badge { background: #3b82f6; }
.link { color: #3b82f6; }

:root {
  --blue-500: #3b82f6; /* ❌ nome de cor, não papel */
  --color1: #ef4444;
}
```

</details>

<details>
<summary>✅ Bom: o token declarado uma vez pelo papel, e referenciado em todo lugar</summary>

```css
:root {
  --color-primary: #3b82f6;
  --color-danger: #ef4444;
  --color-surface: #ffffff;
  --color-on-primary: #ffffff;
}

.button {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.badge--danger {
  background: var(--color-danger);
}

.link {
  color: var(--color-primary);
}
```

</details>

## O token do componente fica dentro do componente

O `:root` é o lugar do que atravessa a interface inteira: as cores da marca, a escala de espaçamento, os tamanhos de fonte. O que só o card usa não precisa estar lá.

Declarar `--card-padding` no `:root` deixa ele visível para todo o CSS, e agora qualquer regra pode consumir esse valor. Meses depois, mexer no espaçamento do card significa procurar quem mais passou a depender dele.

Declarar dentro de `.card` resolve o alcance: o valor vale ali e nos descendentes, e ninguém de fora enxerga. O prefixo `--_` marca a variável como interna ao bloco, o que avisa a quem lê que aquele nome não faz parte da API do design system.

<details>
<summary>❌ Ruim: três valores só do card declarados no escopo global</summary>

```css
:root {
  --card-padding: 24px;
  --card-radius: 8px;
  --card-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card {
  padding: var(--card-padding);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}
```

</details>

<details>
<summary>✅ Bom: os valores ficam dentro do bloco, marcados como internos</summary>

```css
.card {
  --_padding: 24px;
  --_radius: 8px;
  --_shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  padding: var(--_padding);
  border-radius: var(--_radius);
  box-shadow: var(--_shadow);
}
```

</details>
