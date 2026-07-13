# Formatação do CSS

Um bloco de regras com doze propriedades em ordem aleatória obriga o leitor a percorrer as doze para achar a que ele procura. Agrupar por responsabilidade responde antes de ele começar a ler: onde o elemento está, que tamanho ele tem, como o texto dentro dele se comporta e como ele se parece.

O bloco passa a ser lido de cima para baixo, das decisões de layout até as de acabamento.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **ruleset** (bloco de regras) | O seletor mais as declarações entre chaves: `.card { ... }` |
| **selector** (seletor) | O padrão que escolhe quais elementos recebem as regras: `.card`, `nav > a`, `[type="email"]` |
| **declaration** (declaração) | Um par `propriedade: valor;` dentro do bloco |
| **shorthand** (forma resumida) | Uma propriedade que escreve várias de uma vez, como `margin: 8px 16px`. Ela zera as que você não mencionou |
| **box model** (modelo de caixa) | Como o elemento é medido, do conteúdo para fora: `content`, `padding`, `border` e `margin` |
| **positioning** (posicionamento) | O grupo de `position`, `top`, `right`, `bottom`, `left` e `z-index` |
| **typography** (tipografia) | O grupo de `font-*`, `line-height`, `letter-spacing` e `text-*` |

<a id="property-order"></a>

## As propriedades entram agrupadas por responsabilidade

Quatro grupos, sempre nesta ordem, separados por uma linha em branco:

1. **Posicionamento**: onde o elemento fica e quem passa por cima de quem.
2. **Caixa**: como o elemento se organiza por dentro e quanto espaço ocupa.
3. **Texto**: tamanho, altura de linha e cor da fonte.
4. **Acabamento**: fundo, borda e sombra.

<details>
<summary>❌ Ruim: doze propriedades sem agrupamento, e achar uma delas exige ler todas</summary>

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
<summary>✅ Bom: quatro grupos separados por linha em branco, do layout ao acabamento</summary>

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

Quatro propriedades numa linha só cabem na tela, e o custo aparece no histórico. Quando alguém muda o `font-weight`, o diff do Git marca a linha inteira como alterada, e o revisor precisa comparar duas linhas longas caractere a caractere para achar o que mudou.

Com uma propriedade por linha, o diff aponta exatamente a linha que mudou.

<details>
<summary>❌ Ruim: quatro propriedades numa linha, e o diff não mostra qual delas mudou</summary>

<!-- prettier-ignore -->
```css
.button { display: inline-flex; align-items: center; padding: 8px 16px; font-weight: 600; }
```

</details>

<details>
<summary>✅ Bom: uma por linha, e o diff aponta a que mudou</summary>

```css
.button {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  font-weight: 600;
}
```

</details>
