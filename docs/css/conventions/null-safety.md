# Null Safety

CSS não tem `null` como tipo — mas tem o equivalente: uma custom property referenciada antes de
ser definida produz um valor inválido que silenciosamente herda ou ignora a propriedade. O
mecanismo de defesa é o **fallback** em `var()` e o `@property` com `initial-value`.

> Conceito geral: [Null Safety](../../../shared/null-safety.md)

## var() com fallback — o operador ?? do CSS

`var(--property, fallback)` funciona como `??` em JavaScript: usa o fallback se a propriedade
não estiver definida. Sem fallback, uma propriedade indefinida resulta em valor inválido — o
browser descarta a declaração silenciosamente.

<details>
<summary>❌ Bad — custom property sem fallback, componente quebra se o token não existir</summary>
<br>

```css
.button {
  background: var(--color-primary);     /* inválido se não definido — sem cor */
  border-radius: var(--radius-md);      /* inválido — sem borda */
  padding: var(--spacing-sm) var(--spacing-md); /* inválido — sem padding */
}
```

</details>

<br>

<details>
<summary>✅ Good — fallback garante que o componente sempre renderiza</summary>
<br>

```css
.button {
  background: var(--color-primary, #3b82f6);
  border-radius: var(--radius-md, 6px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
}
```

</details>

## @property — contrato com initial-value

`@property` (CSS Houdini) registra uma custom property com tipo e valor inicial. É o equivalente
ao `required + tipo não-nulo` das linguagens tipadas: o browser sabe o tipo esperado e qual valor
usar quando a propriedade não foi atribuída.

<details>
<summary>✅ Good — @property define contrato e previne valor inválido</summary>
<br>

```css
@property --color-primary {
  syntax: "<color>";
  inherits: true;
  initial-value: #3b82f6;   /* valor quando não definido — nunca inválido */
}

@property --transition-duration {
  syntax: "<time>";
  inherits: false;
  initial-value: 200ms;
}

@property --border-radius {
  syntax: "<length>";
  inherits: false;
  initial-value: 4px;
}

/* @property também habilita transições em custom properties */
.button {
  background: var(--color-primary);          /* usa initial-value se não definido */
  transition: background var(--transition-duration);
}
```

</details>

> `@property` tem suporte em todos os browsers modernos (Chrome 85+, Firefox 128+, Safari 16.4+).
> Para projetos que precisam de IE ou browsers antigos, use apenas `var()` com fallback.

## Fallback em cascata

Fallbacks podem referenciar outras custom properties — o browser resolve a cadeia e usa o
primeiro valor disponível, ou o valor final da cadeia se nenhum existir.

<details>
<summary>✅ Good — cadeia de fallback para tokens com herança de tema</summary>
<br>

```css
:root {
  --color-brand: #3b82f6;
}

.button {
  /* tenta o token do componente → token do tema → valor hardcoded */
  background: var(--button-bg, var(--color-primary, var(--color-brand, #3b82f6)));
}

/* tema alternativo só precisa definir --color-primary */
[data-theme="dark"] {
  --color-primary: #60a5fa;
}
```

</details>

## unset, initial e revert — resetar para o estado correto

Quando uma propriedade deve ser removida sem definir um valor concreto, esses keywords expressam
a intenção — sem usar `0`, `none` ou strings vazias como sentinelas.

| Keyword | Comportamento |
| --- | --- |
| `initial` | Valor padrão da especificação CSS (independente de herança) |
| `unset` | `inherit` se a propriedade herda, `initial` se não herda |
| `revert` | Valor do stylesheet do browser (UA stylesheet) |
| `revert-layer` | Valor da cascade layer anterior |

<details>
<summary>✅ Good — keywords semânticos no lugar de valores sentinela</summary>
<br>

```css
/* remover estilo aplicado por classe pai */
.card--plain {
  box-shadow: unset;          /* sem sombra — não "none" como magic value */
  border-radius: unset;       /* remove o border-radius herdado */
}

/* resetar todos os estilos de um elemento */
.unstyled-button {
  all: unset;                 /* reseta tudo para o valor herdado ou initial */
  cursor: pointer;            /* reaplica só o necessário */
}

/* voltar ao estilo do browser para um elemento que foi sobrescrito */
.reset-to-browser {
  color: revert;
  font-size: revert;
}
```

</details>
