# Forms

> Escopo: HTML. Idiomas específicos deste ecossistema.

Formulários acessíveis associam labels a inputs, agrupam campos relacionados e usam tipos nativos.
O browser entrega validação, teclado virtual e autopreenchimento sem JavaScript adicional.

## Label

Todo input tem um `<label>` explícito associado via `for`/`id`. Placeholder não substitui label:
desaparece ao digitar e tem contraste insuficiente.

<details>
<summary>❌ Bad — sem label, placeholder como único texto</summary>
<br>

```html
<input type="text" placeholder="First name" />
<input type="email" placeholder="Email address" />
<input type="password" placeholder="Password" />
```

</details>

<br>

<details>
<summary>✅ Good — label explícita com for/id; placeholder complementa</summary>
<br>

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
<summary>❌ Bad — grupo de radio sem fieldset, sem contexto semântico</summary>
<br>

```html
<p>Shipping method</p>
<input id="standard" type="radio" name="shipping" value="standard" />
<label for="standard">Standard</label>
<input id="express" type="radio" name="shipping" value="express" />
<label for="express">Express</label>
```

</details>

<br>

<details>
<summary>✅ Good — fieldset + legend contextualiza o grupo</summary>
<br>

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
<summary>❌ Bad — type="text" para tudo</summary>
<br>

```html
<input type="text" name="email" />
<input type="text" name="phone" />
<input type="text" name="age" />
<input type="text" name="price" />
<input type="text" name="birthday" />
```

</details>

<br>

<details>
<summary>✅ Good — tipo correto para cada dado</summary>
<br>

```html
<input type="email" name="email" autocomplete="email" />
<input type="tel" name="phone" autocomplete="tel" />
<input type="number" name="age" min="0" max="120" />
<input type="number" name="price" min="0" step="0.01" />
<input type="date" name="birthday" />
```

</details>

## Validação nativa

Atributos HTML (`required`, `pattern`, `min`, `max`, `minlength`, `maxlength`) ativam validação
nativa do browser; use antes de JavaScript. Para mensagens customizadas, combine com
`setCustomValidity` ou `aria-describedby`.

<details>
<summary>❌ Bad — validação só em JS, sem atributos nativos</summary>
<br>

```html
<input type="text" id="username" name="username" />
<p id="username-error" class="error hidden">Username is required</p>
```

</details>

<br>

<details>
<summary>✅ Good — atributos nativos + mensagem de erro acessível</summary>
<br>

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
