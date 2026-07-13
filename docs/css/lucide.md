# Lucide

> Escopo: CSS. Ícones em React, ao lado de [shadcn/ui](shadcn.md).

O **Lucide** é uma coleção de ícones em **SVG** (Scalable Vector Graphics · Gráficos Vetoriais Escaláveis), distribuída como componente. Cada ícone é um componente que você importa pelo nome, e o `lucide-react` é o pacote que o shadcn/ui adota por padrão.

As decisões que importam aqui são três, e nenhuma delas é sobre desenho. Quanto do pacote vai parar no arquivo final, se o ícone acompanha a cor e o tamanho do texto ao redor, e o que o leitor de tela anuncia quando encontra o ícone. A terceira é a que mais aparece quebrada em produção.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Lucide** (coleção de ícones em SVG) | Ícones distribuídos como componente, um por arquivo |
| **SVG** (Scalable Vector Graphics · Gráficos Vetoriais Escaláveis) | Formato vetorial: o ícone escala sem perder nitidez e aceita estilo do CSS |
| **`currentColor`** (a cor do texto ao redor) | Valor que faz o traço do ícone herdar a cor que o elemento pai já tem |
| **stroke width** (espessura do traço) | A grossura da linha do desenho, que o Lucide expõe como propriedade |
| **tree shaking** (remoção do código não usado) | O build descarta os ícones que ninguém importou |
| **`aria-hidden`** (escondido da tecnologia assistiva) | Atributo que remove o elemento da árvore que o leitor de tela percorre |
| **accessible name** (nome acessível) | O texto que a tecnologia assistiva anuncia para o elemento |
| **icon button** (botão só com ícone) | Botão sem texto visível, que depende de um nome acessível para significar algo |

<a id="named-imports"></a>

## Importe o ícone pelo nome, e nunca a coleção inteira

O `import { Search } from "lucide-react"` traz um ícone. O `import * as Icons from "lucide-react"` traz mais de mil, e o build perde a chance de descartar o que ninguém usa, porque o objeto `Icons` pode ser indexado por qualquer chave em tempo de execução.

O sintoma é um pacote que cresce sem explicação e um servidor local que fica lento para iniciar, já que o Vite precisa processar os mil módulos que o import pediu.

O ícone escolhido por uma variável (o status do pedido decide o ícone) resolve com um mapa explícito. O mapa lista os ícones que aquela tela usa, e o build enxerga cada um deles.

<details>
<summary>❌ Ruim: o import traz a coleção inteira, e o build não consegue descartar o que ninguém usa</summary>

```tsx
// features/orders/components/OrderStatusIcon.tsx
import * as Icons from "lucide-react";

export function OrderStatusIcon({ status }: OrderStatusIconProps) {
  const IconComponent = Icons[STATUS_ICON_NAMES[status]];

  return <IconComponent />;
}
```

</details>

<details>
<summary>✅ Bom: cada ícone é importado pelo nome, e o mapa lista os que a tela usa</summary>

```tsx
// features/orders/components/OrderStatusIcon.tsx
import { CircleCheck, CircleX, Clock, Truck } from "lucide-react";
import type { OrderStatus } from "../schemas/order.schema";

const STATUS_ICONS = {
  pending: Clock,
  shipped: Truck,
  delivered: CircleCheck,
  cancelled: CircleX,
} as const;

interface OrderStatusIconProps {
  status: OrderStatus;
}

export function OrderStatusIcon({ status }: OrderStatusIconProps) {
  const StatusIcon = STATUS_ICONS[status];

  return <StatusIcon aria-hidden="true" />;
}
```

O objeto `as const` faz o compilador acusar o status que ninguém mapeou, e o build enxerga os quatro ícones que o arquivo importou.

</details>

<a id="current-color"></a>

## O ícone herda a cor e o tamanho do texto ao redor

O Lucide desenha o traço com `currentColor`, e por isso o ícone dentro de um botão vermelho já sai vermelho, sem ninguém configurar nada. Fixar a cor no componente (`color="#ef4444"`) desliga essa herança, e aquele ícone fica de fora da troca de tema, junto do botão que continua vermelho no tema escuro.

O tamanho segue a mesma ideia. O `size` em pixel funciona, e ele descola o ícone do texto quando a tipografia da tela muda. Dimensionar em `1em` faz o ícone acompanhar a fonte do elemento que o contém, e o par texto mais ícone continua alinhado em qualquer tamanho.

<details>
<summary>❌ Ruim: a cor e o tamanho fixos descolam o ícone do texto e do tema</summary>

```tsx
<button className="btn btn--destructive">
  <Trash2 size={16} color="#ef4444" />
  Excluir pedido
</button>
```

</details>

<details>
<summary>✅ Bom: o traço herda a cor do botão, e o tamanho acompanha a fonte</summary>

```tsx
<button className="btn btn--destructive">
  <Trash2 className="size-[1em]" aria-hidden="true" />
  Excluir pedido
</button>
```

```css
/* components/button.css */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn--destructive {
  color: var(--destructive-foreground);
  background-color: var(--destructive);
}
```

O `gap` no botão cuida do espaço entre o ícone e o texto, e a margem escrita no próprio ícone deixa de ser necessária.

</details>

<a id="accessible-name"></a>

## O ícone decorativo se esconde, e o ícone sozinho ganha nome

Esta é a regra que decide se o botão significa alguma coisa para quem usa leitor de tela, e ela tem dois casos.

O ícone ao lado de um texto é decoração: o texto já diz o que o botão faz, e o `aria-hidden="true"` tira o ícone da leitura. Sem isso, o leitor de tela anuncia o nome do arquivo do ícone antes do texto, e o usuário ouve a mesma informação duas vezes.

O botão só com ícone não tem texto para ser lido, e o leitor de tela anuncia "botão", sem mais nada. O nome vem do `aria-label` no botão, e o ícone continua escondido. O `title` do SVG resolve pela metade: ele vira dica visual do navegador e nem toda tecnologia assistiva o anuncia da mesma forma.

O botão só com ícone precisa também de área de toque. Um ícone de 16 pixels dentro de um botão de 16 pixels é um alvo que o dedo erra, e a recomendação de acessibilidade pede pelo menos 44 pixels de lado.

<details>
<summary>❌ Ruim: o botão não anuncia nada, e o alvo tem o tamanho do desenho</summary>

```tsx
<button onClick={deleteOrder} className="p-0">
  <Trash2 size={16} />
</button>
```

O leitor de tela anuncia "botão". O usuário decide se clica sem saber o que acontece.

</details>

<details>
<summary>✅ Bom: o botão carrega o nome, o ícone sai da leitura, e o alvo cabe no dedo</summary>

```tsx
// features/orders/components/DeleteOrderButton.tsx
import { Trash2 } from "lucide-react";

interface DeleteOrderButtonProps {
  orderNumber: string;
  onDelete: () => void;
}

export function DeleteOrderButton({ orderNumber, onDelete }: DeleteOrderButtonProps) {
  const deleteLabel = `Excluir o pedido ${orderNumber}`;

  return (
    <button type="button" onClick={onDelete} aria-label={deleteLabel} className="icon-button">
      <Trash2 aria-hidden="true" className="size-4" />
    </button>
  );
}
```

```css
/* components/icon-button.css */
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 44px;
  min-block-size: 44px;
}
```

O rótulo cita o número do pedido, então a lista com dez botões de excluir passa a ter dez nomes distintos, em vez de dez "Excluir".

</details>

<a id="consistent-style"></a>

## A espessura do traço é decidida uma vez, no provider

O Lucide aceita `strokeWidth` em cada ícone. Ajustar o valor caso a caso produz uma interface em que alguns ícones parecem mais pesados que outros, e a diferença aparece quando eles ficam lado a lado na mesma barra.

O `IconContext` do `lucide-react` declara a espessura e o tamanho padrão uma vez, na raiz da aplicação. O ícone que precisa fugir do padrão recebe a propriedade, e a exceção fica visível por ser exceção.

<details>
<summary>✅ Bom: o padrão do sistema fica na raiz, e cada ícone deixa de repetir a configuração</summary>

```tsx
// app/providers.tsx
import { IconContext } from "lucide-react";

const ICON_DEFAULTS = {
  size: 20,
  strokeWidth: 1.75,
  absoluteStrokeWidth: true,
};

export function AppProviders({ children }: AppProvidersProps) {
  return <IconContext.Provider value={ICON_DEFAULTS}>{children}</IconContext.Provider>;
}
```

O `absoluteStrokeWidth` mantém a espessura constante quando o ícone escala, e o ícone grande deixa de exibir um traço proporcionalmente mais grosso que o pequeno.

</details>

## Próximos passos

- [shadcn/ui](shadcn.md): os componentes que consomem estes ícones.
- [Acessibilidade](../html/conventions/advanced/accessibility.md): o nome acessível e a navegação por teclado.
