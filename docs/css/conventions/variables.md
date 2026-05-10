# Variables

**custom property** (propriedade customizada) é o mecanismo nativo do CSS pra **design token** (token de design). Nomes semânticos que descrevem o papel do valor, não a aparência, permitem mudar o design sem caçar ocorrências espalhadas pelo código.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **custom property** (propriedade customizada) | Variável CSS declarada com `--nome: valor`; lida via `var(--nome)` |
| **design token** (token de design) | Valor nomeado por papel (`--color-primary`); fonte única da verdade do design |
| **cascade** (cascata) | Ordem de aplicação por origem, especificidade e ordem do código |
| **scope** (escopo) | Custom property vale pro elemento e descendentes; `:root` cobre o documento |
| **fallback** (valor de reserva) | Segundo argumento de `var(--nome, fallback)`; cobre ausência da variável |
| **theme switch** (troca de tema) | Redefinir tokens em `[data-theme="dark"]` ou `:root.dark` |
| **semantic token** (token semântico) | Nome descreve o papel (`--surface-card`), não a aparência (`--white`) |

## Tokens semânticos

<details>
<summary>❌ Ruim — valores mágicos espalhados e nomes não-semânticos</summary>
<br>

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

<br>

<details>
<summary>✅ Bom — token semântico definido uma vez, referenciado em todo lugar</summary>
<br>

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
<summary>❌ Ruim — variáveis de componente expostas globalmente</summary>
<br>

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

<br>

<details>
<summary>✅ Bom — variáveis de componente escopadas ao bloco</summary>
<br>

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
