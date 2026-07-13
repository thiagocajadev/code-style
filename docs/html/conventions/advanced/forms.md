# Formulários em HTML

O navegador já sabe fazer boa parte do trabalho de um formulário. Ele valida o formato do e-mail, abre o teclado numérico no celular, preenche o endereço que o usuário salvou e mostra a mensagem de campo obrigatório. Tudo isso vem dos atributos da marcação, sem uma linha de JavaScript.

Esta página mostra como pedir esse trabalho ao navegador: amarrar cada **label** (rótulo) ao seu **input** (campo), agrupar campos relacionados num **fieldset** (conjunto de campos) e escolher o `type` certo para cada dado.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **form** (formulário) | O elemento que agrupa os campos e dispara o envio, configurado por `action` e `method` |
| **input** (campo) | O elemento de entrada. O `type` dele decide o teclado do celular e a validação |
| **label** (rótulo) | O texto do campo, ligado a ele por `for` e `id`. Vira área de clique e é o que o leitor de tela anuncia |
| **fieldset** (conjunto de campos) | Agrupa campos relacionados, com a `<legend>` nomeando o grupo |
| **autocomplete** (autopreenchimento) | Diz ao navegador que dado o campo espera, como `email` ou `tel`, para ele oferecer o que o usuário já salvou |
| **client-side validation** (validação no navegador) | `required`, `type`, `pattern`, `min` e `max`, conferidos antes do envio |
| **placeholder** (texto de exemplo) | A dica dentro do campo, que some assim que o usuário digita |

<a id="label"></a>

## Todo campo tem uma `<label>` própria

Ligue a `<label>` ao campo pelo par `for` e `id`. Isso dá duas coisas ao usuário: o leitor de tela anuncia o nome do campo ao chegar nele, e um clique no texto do rótulo põe o cursor dentro do campo, o que amplia bastante a área de acerto no celular.

O `placeholder` não faz esse papel. Ele some assim que a pessoa começa a digitar, e é justamente aí que ela precisa conferir o que aquele campo pedia. Em formulário longo, o usuário apaga o que escreveu só para reler a dica. Some a isso o contraste baixo do texto de exemplo na maioria dos temas.

O `placeholder` continua útil ao lado do rótulo, para mostrar o formato esperado: `name@example.com`.

<details>
<summary>❌ Ruim: nenhum rótulo, e o texto de exemplo some ao digitar</summary>

```html
<input type="text" placeholder="First name" />
<input type="email" placeholder="Email address" />
<input type="password" placeholder="Password" />
```

</details>

<details>
<summary>✅ Bom: rótulo ligado ao campo por for e id, com o exemplo de formato ao lado</summary>

```html
<label for="first-name">First name</label>
<input id="first-name" type="text" name="first_name" autocomplete="given-name" />

<label for="email">Email address</label>
<input id="email" type="email" name="email" placeholder="name@example.com" autocomplete="email" />

<label for="password">Password</label>
<input id="password" type="password" name="password" autocomplete="new-password" />
```

</details>

## Grupo de opções vai dentro de `<fieldset>` com `<legend>`

Um grupo de radio ou de checkbox precisa de uma pergunta, e a `<legend>` é onde ela mora. Sem o `<fieldset>`, o leitor de tela anuncia "Standard, botão de opção" e não diz do que se trata: a pergunta "Shipping method" está num `<p>` solto acima, que não pertence ao grupo.

Com o par `<fieldset>` e `<legend>`, o leitor de tela anuncia a pergunta antes de cada opção, e o usuário entende o que está escolhendo.

Vale também para blocos maiores do formulário, como separar os dados de entrega dos dados de pagamento.

<details>
<summary>❌ Ruim: as opções soltas, e a pergunta num parágrafo que não pertence ao grupo</summary>

```html
<p>Shipping method</p>
<input id="standard" type="radio" name="shipping" value="standard" />
<label for="standard">Standard</label>
<input id="express" type="radio" name="shipping" value="express" />
<label for="express">Express</label>
```

</details>

<details>
<summary>✅ Bom: a legend faz a pergunta, e o leitor de tela anuncia ela antes de cada opção</summary>

```html
<fieldset>
  <legend>Shipping method</legend>

  <label>
    <input type="radio" name="shipping" value="standard" />
    Standard (5–7 business days)
  </label>

  <label>
    <input type="radio" name="shipping" value="express" />
    Express (1–2 business days)
  </label>
</fieldset>
```

</details>

## O `type` do campo decide o que o navegador entrega

`type="text"` em tudo funciona, e joga fora o que o navegador daria de graça. Trocar pelo tipo certo muda a experiência no celular, que é onde a maioria dos formulários é preenchida.

Com `type="email"`, o teclado do celular já vem com a tecla `@`, e o navegador confere o formato antes do envio. Com `type="tel"`, aparece o teclado numérico. Com `type="date"`, o usuário ganha o seletor de data do próprio sistema, no lugar de digitar a data à mão e errar o formato.

<details>
<summary>❌ Ruim: cinco dados diferentes, todos como texto</summary>

```html
<input type="text" name="email" />
<input type="text" name="phone" />
<input type="text" name="age" />
<input type="text" name="price" />
<input type="text" name="birthday" />
```

</details>

<details>
<summary>✅ Bom: cada campo declara o dado que espera, e o navegador ajusta teclado e validação</summary>

```html
<input type="email" name="email" autocomplete="email" />
<input type="tel" name="phone" autocomplete="tel" />
<input type="number" name="age" min="0" max="120" />
<input type="number" name="price" min="0" step="0.01" />
<input type="date" name="birthday" />
```

</details>

## Declare a regra na marcação antes de escrever validação em JavaScript

Os atributos `required`, `pattern`, `min`, `max`, `minlength` e `maxlength` fazem o navegador barrar o envio e apontar o campo errado sozinho. A regra fica declarada ao lado do campo, onde quem lê a marcação a encontra.

O JavaScript entra por cima disso, para o que a marcação não cobre: a mensagem de erro escrita com as palavras do produto (via `setCustomValidity`) e a dica que explica o formato antes de o usuário errar. O `aria-describedby` amarra a dica e o erro ao campo, e é assim que o leitor de tela anuncia os dois.

<details>
<summary>❌ Ruim: o campo não declara regra nenhuma, e o erro vive escondido num parágrafo solto</summary>

```html
<input type="text" id="username" name="username" />
<p id="username-error" class="error hidden">Username is required</p>
```

</details>

<details>
<summary>✅ Bom: as regras na marcação, com a dica e o erro ligados ao campo</summary>

```html
<label for="username">Username</label>
<input
  id="username"
  type="text"
  name="username"
  minlength="3"
  maxlength="20"
  pattern="[a-zA-Z0-9_]+"
  aria-describedby="username-hint username-error"
  required
/>
<p id="username-hint" class="field-hint">3–20 characters, letters and numbers only</p>
<p id="username-error" class="field-error" aria-live="polite"></p>
```

</details>

## Referência rápida

| Input type  | Uso                          | Benefício nativo                    |
| ----------- | ---------------------------- | ----------------------------------- |
| `email`     | Endereço de e-mail           | Teclado `@`, validação de formato   |
| `tel`       | Telefone                     | Teclado numérico mobile             |
| `number`    | Valor numérico               | Controles de incremento, min/max    |
| `date`      | Data                         | Date picker nativo                  |
| `search`    | Campo de busca               | Botão de limpar, semântica de busca |
| `password`  | Senha                        | Mascaramento, autopreenchimento     |
| `url`       | URL                          | Validação de formato                |
| `checkbox`  | Múltipla seleção             | Estado checked acessível            |
| `radio`     | Seleção exclusiva no grupo   | Grupo via `name`, navegação teclado |
