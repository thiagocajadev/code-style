# Variables

Custom properties são o mecanismo nativo do CSS para design tokens. Nomes semânticos — que
descrevem o **papel** do valor, não a aparência — permitem mudar o design sem caçar ocorrências
espalhadas pelo código.

## Tokens semânticos

<details>
<summary>❌ Bad — valores mágicos espalhados e nomes não-semânticos</summary>

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
<summary>✅ Good — token semântico definido uma vez, referenciado em todo lugar</summary>

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

## Escopo

Custom properties se propagam em cascata. Quando um valor faz sentido apenas dentro de um
componente, defini-lo no `:root` polui o namespace global.

<details>
<summary>❌ Bad — variáveis de componente expostas globalmente</summary>

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
<summary>✅ Good — variáveis de componente escopadas ao bloco</summary>

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
