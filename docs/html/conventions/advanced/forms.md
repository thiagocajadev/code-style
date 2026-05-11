# Forms

> Escopo: HTML. Idiomas específicos deste ecossistema.

Formulários acessíveis associam **label** (rótulo) a **input** (campo), agrupam campos relacionados em **fieldset** (conjunto de campos) e usam tipos nativos. O browser entrega validação, teclado virtual e **autocomplete** (autopreenchimento) sem JavaScript adicional.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **form** (formulário) | Container que agrupa campos e dispara o envio via `action`/`method` |
| **input** (campo) | Elemento de entrada; o atributo `type` define teclado virtual e validação |
| **label** (rótulo) | Texto associado ao campo via `for`/`id`; alvo de clique e leitor de tela |
| **fieldset** (conjunto de campos) | Agrupa campos relacionados; `<legend>` descreve o grupo |
| **autocomplete** (autopreenchimento) | Atributo que sinaliza o tipo do dado (`email`, `name`, `tel`) ao browser |
| **client-side validation** (validação no cliente) | `required`, `type`, `pattern`, `min`/`max` aplicados pelo browser antes do submit |
| **placeholder** (texto auxiliar) | Dica que desaparece ao digitar; não substitui label |

## Label

Todo input tem um `<label>` explícito associado via `for`/`id`. Placeholder não substitui label:
desaparece ao digitar e tem contraste insuficiente.

<details>
<summary>❌ Ruim — sem label, placeholder como único texto</summary>

```html
<input type="text" placeholder="First name" />
<input type="email" placeholder="Email address" />
<input type="password" placeholder="Password" />
```

</details>

<details>
<summary>✅ Bom — label explícita com for/id; placeholder complementa</summary>

```html
<label for="first-name">First name</label>
<input id="first-name" type="text" name="first_name" autocomplete="given-name" />

<label for="email">Email address</label>
<input id="email" type="email" name="email" placeholder="name@example.com" autocomplete="email" />

<label for="password">Password</label>
<input id="password" type="password" name="password" autocomplete="new-password" />
```

</details>

## fieldset e legend

`<fieldset>` + `<legend>` agrupam campos relacionados. Obrigatório para grupos de radio/checkbox,
recomendado para seções de formulário com múltiplos campos.

<details>
<summary>❌ Ruim — grupo de radio sem fieldset, sem contexto semântico</summary>

```html
<p>Shipping method</p>
<input id="standard" type="radio" name="shipping" value="standard" />
<label for="standard">Standard</label>
<input id="express" type="radio" name="shipping" value="express" />
<label for="express">Express</label>
```

</details>

<details>
<summary>✅ Bom — fieldset + legend contextualiza o grupo</summary>

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

## Tipos de input

O tipo correto entrega teclado virtual otimizado no mobile, validação nativa e autopreenchimento
contextual, sem JavaScript adicional.

<details>
<summary>❌ Ruim — type="text" para tudo</summary>

```html
<input type="text" name="email" />
<input type="text" name="phone" />
<input type="text" name="age" />
<input type="text" name="price" />
<input type="text" name="birthday" />
```

</details>

<details>
<summary>✅ Bom — tipo correto para cada dado</summary>

```html
<input type="email" name="email" autocomplete="email" />
<input type="tel" name="phone" autocomplete="tel" />
<input type="number" name="age" min="0" max="120" />
<input type="number" name="price" min="0" step="0.01" />
<input type="date" name="birthday" />
```

</details>

## Validação nativa

Atributos **HTML** (HyperText Markup Language, Linguagem de Marcação de Hipertexto) (`required`, `pattern`, `min`, `max`, `minlength`, `maxlength`) ativam validação
nativa do browser; use antes de JavaScript. Para mensagens customizadas, combine com
`setCustomValidity` ou `aria-describedby`.

<details>
<summary>❌ Ruim — validação só em JS, sem atributos nativos</summary>

```html
<input type="text" id="username" name="username" />
<p id="username-error" class="error hidden">Username is required</p>
```

</details>

<details>
<summary>✅ Bom — atributos nativos + mensagem de erro acessível</summary>

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
