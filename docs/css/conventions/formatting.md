# Formatting

A ordem de **declaration** (declaração) não é arbitrária. Agrupar por responsabilidade (**positioning**, **box model**, **typography**, visual) torna um **ruleset** (bloco de regras) legível de cima pra baixo: de "onde está e qual o tamanho" para "como parece".

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **ruleset** (bloco de regras) | Seletor + declarações entre chaves: `.card { ... }` |
| **selector** (seletor) | Padrão que escolhe os elementos: `.card`, `nav > a`, `[type="email"]` |
| **declaration** (declaração) | Par `propriedade: valor;` dentro do ruleset |
| **shorthand** (forma resumida) | `margin: 8px 16px` em vez de quatro `margin-*`; cuidado com sobrescrita acidental |
| **box model** (modelo de caixa) | `content` → `padding` → `border` → `margin`; base do dimensionamento |
| **positioning** (posicionamento) | Grupo de `position`, `top`/`right`/`bottom`/`left`, `z-index` |
| **typography** (tipografia) | Grupo de `font-*`, `line-height`, `letter-spacing`, `text-*` |

## Ordem de propriedades

<details>
<summary>❌ Ruim: ordem aleatória, difícil de escanear</summary>

```css
.card {
  background: white;
  position: relative;
  font-size: 1rem;
  width: 320px;
  border-radius: 8px;
  display: flex;
  color: #111;
  z-index: 1;
  padding: 24px;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  line-height: 1.5;
}
```

</details>

<details>
<summary>✅ Bom: agrupado por responsabilidade, legível de cima pra baixo</summary>

```css
.card {
  position: relative;
  z-index: 1;

  display: flex;
  flex-direction: column;
  width: 320px;
  padding: 24px;

  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text);

  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
```

<div align="left">
  <img src="../../../assets/css-card-with-notes.svg" alt="CSS Card" width="720" style="border: 1px solid #30363d; border-radius: 8px;" />
</div>

</details>

## Uma propriedade por linha

<details>
<summary>❌ Ruim: múltiplas propriedades em uma linha, diff ilegível</summary>

<!-- prettier-ignore -->
```css
.button { display: inline-flex; align-items: center; padding: 8px 16px; font-weight: 600; }
```

</details>

<details>
<summary>✅ Bom: uma propriedade por linha, diff limpo</summary>

```css
.button {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  font-weight: 600;
}
```

</details>
