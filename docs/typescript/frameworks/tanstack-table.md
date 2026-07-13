# TanStack Table

> Escopo: TypeScript. Guia baseado em **TanStack Table 8.21**, dentro do cenário de [React SPA](react-spa.md).

O **TanStack Table** monta a lógica da tabela e não desenha nada. Ele calcula a ordenação, a paginação, o filtro e a seleção de linha, e devolve o resultado para você renderizar com o seu próprio `<table>`. A marcação e o estilo continuam sendo seus, o que deixa a tabela combinar com o resto da interface em vez de trazer o visual da biblioteca junto.

A página cobre a definição das colunas, o que fica no cliente e o que vai para o servidor, e o momento em que a tabela precisa de virtualização.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **headless** (sem interface própria) | A biblioteca entrega o comportamento e deixa a marcação e o estilo com você |
| **column definition** (definição de coluna) | O objeto que declara de onde vem o valor, o cabeçalho e como a célula é desenhada |
| **accessor** (leitor do campo) | A chave ou função que extrai da linha o valor daquela coluna |
| **row model** (modelo de linhas) | O resultado do processamento: as linhas depois de filtrar, ordenar e paginar |
| **cell renderer** (desenho da célula) | A função que transforma o valor da célula no que aparece na tela |
| **server-side pagination** (paginação no servidor) | O backend devolve uma página por vez, e a tabela recebe o total |
| **virtualization** (renderização por janela) | Só as linhas visíveis existem no DOM, e as demais entram conforme a rolagem |

<a id="column-definitions"></a>

## As colunas ficam fora do componente, e num arquivo só

A definição das colunas é dado, e não interface. Declarar o array dentro do componente recria os objetos a cada render, o que faz a tabela recalcular o que não mudou. Declarar fora resolve isso e ainda deixa a coluna ser testada sem montar a tela.

O `createColumnHelper` amarra a coluna ao tipo da linha: o `accessor` que aponta para um campo que não existe em `OrderView` deixa de compilar, e renomear o campo acusa o erro na coluna que ficou para trás.

A célula formatada mora numa função com nome. Moeda, data e status são formatação, e formatação separada do cálculo é a mesma regra que vale no resto do guia.

<details>
<summary>❌ Ruim: as colunas nascem dentro do componente, e a data é formatada no meio do desenho</summary>

```tsx
// features/orders/components/OrderTable.tsx
export function OrderTable({ orders }: OrderTableProps) {
  const columns = [
    { accessorKey: "customerName", header: "Cliente" },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      cell: (info: any) => new Date(info.getValue()).toLocaleDateString("pt-BR"),
    },
    {
      accessorKey: "totalInCents",
      header: "Total",
      cell: (info: any) => `R$ ${(info.getValue() / 100).toFixed(2)}`,
    },
  ];

  const table = useReactTable({ data: orders, columns, getCoreRowModel: getCoreRowModel() });

  return <TableShell table={table} />;
}
```

O `any` no `info` desliga a checagem: `totalInCents` poderia ser texto, e o `toFixed` só quebraria no navegador do usuário.

</details>

<details>
<summary>✅ Bom: as colunas moram no próprio arquivo, tipadas pela linha, e a formatação tem nome</summary>

```tsx
// features/orders/components/order.columns.tsx
import { createColumnHelper } from "@tanstack/react-table";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { OrderStatusBadge } from "./OrderStatusBadge";
import type { OrderView } from "../schemas/order.schema";

const columnHelper = createColumnHelper<OrderView>();

export const orderColumns = [
  columnHelper.accessor("customerName", {
    header: "Cliente",
  }),
  columnHelper.accessor("createdAt", {
    header: "Criado em",
    cell: (cell) => formatDate(cell.getValue()),
  }),
  columnHelper.accessor("totalInCents", {
    header: "Total",
    cell: (cell) => formatCurrency(cell.getValue()),
  }),
  columnHelper.accessor("status", {
    header: "Situação",
    cell: (cell) => <OrderStatusBadge status={cell.getValue()} />,
  }),
];
```

```tsx
// features/orders/components/OrderTable.tsx
import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { orderColumns } from "./order.columns";
import type { OrderView } from "../schemas/order.schema";

interface OrderTableProps {
  orders: OrderView[];
}

export function OrderTable({ orders }: OrderTableProps) {
  const table = useReactTable({
    data: orders,
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return <TableShell table={table} />;
}
```

O `cell.getValue()` chega tipado: `createdAt` é a data, `totalInCents` é o número, e o formatador recebe o que espera.

</details>

<a id="stable-data"></a>

## O array de linhas precisa manter a identidade entre renders

A tabela compara a referência do array para decidir se recalcula. Um array novo a cada render, vindo de um `.map()` ou de um `.filter()` escrito dentro do componente, faz a tabela reprocessar tudo a cada tecla digitada em qualquer campo da tela.

O dado que vem do TanStack Query já resolve isso: enquanto a chave da consulta não muda, o Query devolve a mesma referência. A transformação que precisa acontecer no cliente entra no `select` da consulta, que roda uma vez e guarda o resultado.

<details>
<summary>❌ Ruim: a lista é remontada no corpo do componente, e a tabela reprocessa a cada render</summary>

```tsx
export function OrderTable() {
  const { data: orders = [] } = useQuery(ordersQuery(status));

  const visibleOrders = orders
    .filter((order) => !order.isArchived)
    .map((order) => ({ ...order, customerName: order.customer.name }));

  const table = useReactTable({
    data: visibleOrders,
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return <TableShell table={table} />;
}
```

</details>

<details>
<summary>✅ Bom: a transformação acontece no select da consulta, e a referência se mantém entre renders</summary>

```ts
// features/orders/queries/order.queries.ts
import { queryOptions } from "@tanstack/react-query";
import { listOrders } from "../services/order.service";
import { toOrderRow } from "../services/order.mapper";

export function orderRowsQuery(status: StatusFilter) {
  const options = queryOptions({
    queryKey: ["orders", { status }],
    queryFn: () => listOrders(status),
    select: (orders) => orders.filter((order) => !order.isArchived).map(toOrderRow),
  });

  return options;
}
```

</details>

<a id="server-side-pagination"></a>

## Acima de alguns milhares de linhas, a paginação vai para o servidor

A paginação no cliente exige que todas as linhas estejam no navegador. Ela serve enquanto a lista inteira cabe numa resposta, o que na prática vale até alguns milhares de linhas.

Passando disso, quem pagina é o backend, e a tabela deixa de calcular o recorte. Três coisas mudam: a página entra na chave da consulta, o `manualPagination` avisa a tabela para não recortar nada, e o total de linhas chega da resposta, porque o cliente não tem como contar o que ele nunca recebeu.

O `placeholderData` mantém a página anterior na tela enquanto a próxima chega, e a tabela para de piscar a cada clique em "próxima".

<details>
<summary>✅ Bom: o servidor recorta a página, e a tabela mostra a anterior enquanto a próxima chega</summary>

```ts
// features/orders/queries/order.queries.ts
import { queryOptions, keepPreviousData } from "@tanstack/react-query";
import { listOrdersPage } from "../services/order.service";

interface OrdersPageParams {
  pageIndex: number;
  pageSize: number;
  status: StatusFilter;
}

export function ordersPageQuery(params: OrdersPageParams) {
  const options = queryOptions({
    queryKey: ["orders", "page", params],
    queryFn: () => listOrdersPage(params),
    placeholderData: keepPreviousData,
  });

  return options;
}
```

```tsx
// features/orders/components/OrderTable.tsx
export function OrderTable() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const status = useOrderFilterStore((state) => state.status);
  const { data: page, isPending } = useQuery(ordersPageQuery({ ...pagination, status }));

  const table = useReactTable({
    data: page?.rows ?? [],
    columns: orderColumns,
    rowCount: page?.totalCount ?? 0,
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isPending) return <TableSkeleton />;

  return <TableShell table={table} />;
}
```

O `rowCount` vem da resposta. Sem ele, a tabela conta as linhas que recebeu, e o rodapé anuncia 25 resultados quando existem 4.000.

</details>

<a id="virtualization"></a>

## A rolagem longa renderiza só o que está na tela

Uma tabela que mostra milhares de linhas de uma vez coloca milhares de nós no DOM, e a rolagem trava. A virtualização mantém no DOM apenas as linhas visíveis, mais algumas de folga acima e abaixo, e reaproveita esses nós conforme o usuário rola.

Ela entra quando a tela precisa mesmo mostrar a lista longa sem paginar, como num relatório que se percorre de ponta a ponta. Quando a paginação resolve a tarefa do usuário, ela é o caminho mais simples, e a virtualização não é necessária.

<details>
<summary>✅ Bom: só as linhas visíveis existem no DOM, e o container reserva a altura total</summary>

```tsx
// features/orders/components/VirtualOrderTable.tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const ROW_HEIGHT_IN_PX = 48;
const OVERSCAN_ROW_COUNT = 8;

export function VirtualOrderTable({ table }: VirtualOrderTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT_IN_PX,
    overscan: OVERSCAN_ROW_COUNT,
  });

  const visibleRows = rowVirtualizer.getVirtualItems();
  const totalHeightInPx = rowVirtualizer.getTotalSize();

  return (
    <div ref={scrollContainerRef} className="order-table__scroll">
      <div style={{ height: `${totalHeightInPx}px` }}>
        {visibleRows.map((virtualRow) => (
          <OrderRow
            key={rows[virtualRow.index].id}
            row={rows[virtualRow.index]}
            offsetInPx={virtualRow.start}
          />
        ))}
      </div>
    </div>
  );
}
```

O `<div>` interno reserva a altura de todas as linhas, e por isso a barra de rolagem tem o tamanho certo mesmo com poucas linhas no DOM.

</details>

## Próximos passos

- [React SPA](react-spa.md): o Query, o Router e a store que a tabela consome.
- [Performance](../conventions/advanced/performance.md): o custo do render e o que medir antes de otimizar.
