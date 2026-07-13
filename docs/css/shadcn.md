# shadcn/ui

> Escopo: CSS. Componentes em React, montados sobre [Tailwind](tailwind.md).

O **shadcn/ui** entrega o código do componente para dentro do seu repositório. Você roda um comando, o arquivo `Button.tsx` aparece em `components/ui/`, e ele passa a ser seu: você edita, versiona e revisa como qualquer outro arquivo do projeto. Não existe pacote no `node_modules` para atualizar.

A troca é essa: você ganha controle total sobre a marcação e perde a atualização automática. O componente que você editou não recebe a correção que o projeto publicou depois, e cabe a você trazer a mudança se quiser. Por isso as decisões desta página giram em torno de uma pergunta: o que fica na camada de baixo, que você não mexe, e o que fica na sua.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **shadcn/ui** (coleção de componentes copiados para o projeto) | Componentes React que o comando copia para o seu repositório, sem virar dependência |
| **design token** (valor nomeado do design) | A cor, o espaçamento ou o raio guardado num nome que diz para que ele serve |
| **cva** (Class Variance Authority) | Biblioteca que declara as variantes do componente e devolve as classes de cada combinação |
| **variant** (variante) | A dimensão de aparência do componente: a hierarquia (`primary`, `ghost`) e o tamanho |
| **`cn()`** (junção de classes) | Função que junta as classes e resolve o conflito entre duas utilitárias da mesma propriedade |
| **Radix** (biblioteca de primitivos acessíveis) | A base sem estilo que cuida de foco, teclado e leitor de tela |
| **primitive** (componente de base) | O componente genérico em `components/ui/`, que as telas compõem |

<a id="design-tokens"></a>

## A cor mora no token semântico, e o componente nunca cita o valor

O shadcn/ui escreve as cores como variáveis do CSS com nome de papel: `--background`, `--foreground`, `--primary`, `--destructive`, `--muted`. O componente usa `bg-primary`, e nunca `bg-blue-600`.

O ganho aparece no tema escuro e na troca de marca. Trocar `--primary` num lugar troca a cor em todos os componentes que a usam, e o tema escuro é a mesma folha de tokens com outros valores. O componente que cita `blue-600` direto fica de fora dessa troca, e ele é o botão que continua azul quando o resto do sistema virou verde.

Esta é a mesma regra de [Variáveis](conventions/variables.md#semantic-tokens), aplicada ao vocabulário do shadcn.

<details>
<summary>❌ Ruim: o componente cita a cor da paleta, e ele fica de fora da troca de tema</summary>

```tsx
// components/ui/Alert.tsx
export function Alert({ children }: AlertProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-900 rounded-md p-4">
      {children}
    </div>
  );
}
```

No tema escuro, o fundo continua num vermelho claro, e o texto escuro sobre ele deixa de ter contraste.

</details>

<details>
<summary>✅ Bom: o componente cita o papel da cor, e o tema decide o valor</summary>

```css
/* app/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 4%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 4%;
    --foreground: 0 0% 98%;
    --destructive: 0 62% 31%;
    --destructive-foreground: 0 0% 98%;
  }
}
```

```tsx
// components/ui/Alert.tsx
export function Alert({ children }: AlertProps) {
  return (
    <div className="bg-destructive text-destructive-foreground rounded-md border p-4">
      {children}
    </div>
  );
}
```

O par `--destructive` e `--destructive-foreground` mantém o contraste nos dois temas, porque o texto acompanha o fundo.

</details>

<a id="cva-variants"></a>

## As variantes ficam declaradas, e não montadas com condicionais

A aparência do componente costuma variar em duas dimensões: a hierarquia (principal, secundário, fantasma, destrutivo) e o tamanho. Montar isso com ternários encadeados dentro do `className` esconde o conjunto de combinações possíveis, e acrescentar um tamanho novo vira uma caça pelos pontos que precisam saber dele.

O `cva` declara as dimensões em um objeto. As combinações ficam visíveis num lugar só, a variante padrão é explícita, e o TypeScript passa a acusar `variant="primry"` em tempo de compilação.

<details>
<summary>❌ Ruim: os ternários escondem quais combinações existem, e o padrão fica implícito</summary>

```tsx
// components/ui/Button.tsx
export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center rounded-md font-medium ${
        variant === "destructive"
          ? "bg-destructive text-destructive-foreground"
          : variant === "ghost"
            ? "hover:bg-accent"
            : "bg-primary text-primary-foreground"
      } ${size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"} ${className}`}
      {...props}
    />
  );
}
```

O `className` que chega por prop é concatenado no fim, e uma classe de fundo vinda de fora entra em conflito com a que o ternário escolheu. Qual das duas vence depende da ordem no arquivo final.

</details>

<details>
<summary>✅ Bom: as variantes são declaradas, e o `cn()` resolve o conflito de classes</summary>

```tsx
// components/ui/Button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:ring-2 disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        small: "h-8 px-3 text-xs",
        medium: "h-10 px-4 text-sm",
        large: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
```

</details>

<a id="cn-helper"></a>

## O `cn()` decide o conflito entre duas classes da mesma propriedade

Juntar classes com template literal produz `"px-4 px-8"` quando a tela passa um espaçamento próprio. As duas classes existem no arquivo final, e quem vence é a que o Tailwind escreveu por último, o que nada tem a ver com a intenção de quem escreveu a tela.

O `cn()` é a junção de `clsx` (monta a lista, aceitando condição) com `twMerge` (descarta a classe perdedora quando duas mexem na mesma propriedade). Com ele, `cn("px-4", "px-8")` devolve `"px-8"`: a classe que veio de fora vence, que é o que a tela esperava.

<details>
<summary>✅ Bom: a classe que vem de fora sobrescreve a do componente, sem depender da ordem no arquivo final</summary>

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classes: ClassValue[]) {
  const merged = twMerge(clsx(classes));
  return merged;
}
```

```tsx
// features/orders/components/OrderActions.tsx
<Button variant="destructive" className="w-full">
  Cancelar pedido
</Button>
```

</details>

<a id="extend-vs-fork"></a>

## Estender é acrescentar variante; forkar é mudar a marcação

O componente em `components/ui/` é a base, e as telas compõem sobre ele. A pergunta que aparece toda semana é se a mudança entra na base ou fica na tela.

A resposta segue o que a mudança faz. Uma aparência nova que outras telas vão querer é uma variante, e ela entra no `cva` do componente. Um espaçamento que só aquela tela precisa passa pelo `className`, e o `cn()` cuida do conflito. Um comportamento novo (um botão que mostra estado de carregamento) vira um componente próprio em `features/`, que compõe o `Button` da base em vez de reescrevê-lo.

Editar a marcação do arquivo em `components/ui/` é o último recurso, e ele tem custo: aquele arquivo deixa de acompanhar as correções que o shadcn publicar, e a diferença precisa ser reaplicada à mão. Vale quando a acessibilidade ou a estrutura do componente precisa mudar, e não para trocar uma cor ou um espaçamento, que os tokens e as variantes já resolvem.

<details>
<summary>❌ Ruim: a tela reescreve o botão para acrescentar o estado de carregamento</summary>

```tsx
// features/orders/components/SubmitOrderButton.tsx
export function SubmitOrderButton({ isSubmitting, onSubmit }: SubmitOrderButtonProps) {
  return (
    <button
      onClick={onSubmit}
      disabled={isSubmitting}
      className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      {isSubmitting ? <Spinner /> : "Confirmar pedido"}
    </button>
  );
}
```

As classes do `Button` foram copiadas à mão. Quando o raio da borda mudar no sistema, este botão fica para trás.

</details>

<details>
<summary>✅ Bom: o componente da tela compõe o botão da base, e acrescenta só o comportamento novo</summary>

```tsx
// features/orders/components/SubmitOrderButton.tsx
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface SubmitOrderButtonProps {
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function SubmitOrderButton({ isSubmitting, onSubmit }: SubmitOrderButtonProps) {
  return (
    <Button onClick={onSubmit} disabled={isSubmitting}>
      {isSubmitting ? <Spinner /> : "Confirmar pedido"}
    </Button>
  );
}
```

</details>

## Próximos passos

- [Tailwind](tailwind.md): as utilitárias e o tema que o shadcn assume.
- [Variáveis](conventions/variables.md): os tokens semânticos por trás das cores.
- [React SPA](../typescript/frameworks/react-spa.md): onde estes componentes são consumidos.
