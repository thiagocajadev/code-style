# Bootstrap

O **Bootstrap** (framework de CSS com componentes prontos) entrega `.btn`, `.card` e `.modal` já estilizados, e a pergunta que surge no primeiro dia é como mudar o visual deles.

A resposta que costuma aparecer, repetir o seletor do framework e carimbar `!important`, funciona no primeiro caso e cria uma dívida. Cada estilo novo do seu time precisa pesar mais que o do framework, e depois mais que o do seu próprio time. Desde a versão 5, existe caminho suportado: cada componente lê as variáveis `--bs-*`, e redefinir essas variáveis muda o visual sem entrar nessa disputa.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Bootstrap** (framework de CSS com componentes prontos) | Biblioteca com `.btn`, `.card` e `.modal` já estilizados, mais uma grade de 12 colunas |
| **utility class** (classe utilitária) | Classe que muda uma propriedade só, como `.mt-3` ou `.text-center` |
| **component class** (classe de componente) | Classe que aplica o conjunto de estilos de um componente inteiro, como `.btn` ou `.alert` |
| **modifier** (modificador) | Variante do componente: `.btn-primary`, `.alert-danger` |
| **breakpoint** (largura de corte) | Os sufixos `-sm`, `-md`, `-lg`, `-xl` e `-xxl`, que ligam a regra a partir daquela largura |
| **grid** (grade) | O trio `.container`, `.row` e `.col-*`, que monta o layout de 12 colunas |
| **custom property override** (troca pela variável) | Redefinir uma variável `--bs-*` no escopo do componente, sem mexer no peso do seletor |

## Troque a variável, e não o seletor

Sobrescrever `.btn-primary` com `!important` resolve o botão de hoje. O problema chega quando alguém precisa de um botão primário diferente numa tela específica: como o `!important` já venceu tudo, a única saída é outro `!important` com seletor mais pesado.

Redefinir `--bs-btn-bg` faz o mesmo trabalho por dentro. O seletor do Bootstrap continua o mesmo, o peso na cascata não muda, e a próxima pessoa que precisar de uma variação ainda tem para onde ir.

<details>
<summary>❌ Ruim: !important em cada declaração, e a próxima variação precisará pesar mais</summary>

```css
.btn-primary {
  background-color: #7c3aed !important;
  border-color: #7c3aed !important;
}

.btn-primary:hover {
  background-color: #6d28d9 !important;
}
```

</details>

<details>
<summary>✅ Bom: as variáveis do próprio Bootstrap carregam a cor da marca</summary>

```css
:root {
  --bs-primary: #7c3aed;
  --bs-primary-rgb: 124, 58, 237;
  --bs-btn-bg: var(--bs-primary);
  --bs-btn-border-color: var(--bs-primary);
  --bs-btn-hover-bg: #6d28d9;
}
```

</details>

## Componha sobre a classe do framework, e escreva só a diferença

Criar uma `.my-card` do zero significa reescrever à mão o fundo, a borda, o raio e o espaçamento que a `.card` já entrega. A partir daí, o componente deixa de acompanhar o framework: uma atualização que ajusta a sombra dos cards passa ao largo da sua classe, e o visual sai do lugar.

Mantenha a `.card` no elemento e acrescente uma classe só com a diferença. O componente continua recebendo o que vier do framework, e o seu CSS guarda apenas o que é seu.

<details>
<summary>❌ Ruim: a classe própria recria o que a .card já fazia, e para de acompanhar o framework</summary>

```html
<div class="my-card">...</div>
```

```css
.my-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  /* recria manualmente o que .card já faz */
}
```

</details>

<details>
<summary>✅ Bom: a .card continua no elemento, e a classe nova traz só a diferença</summary>

```html
<div class="card card--product">...</div>
```

```css
.card--product {
  --bs-card-border-color: var(--color-primary);
  --bs-card-border-radius: 12px;
}
```

</details>
