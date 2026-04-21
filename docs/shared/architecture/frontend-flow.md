# Fluxos de Frontend

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Dois fluxos estruturam a maior parte da lógica de interação em aplicações de frontend: **routing** (roteamento), que determina como o usuário navega entre telas, e **forms** (formulários), que governa como alterações são capturadas, validadas e enviadas ao servidor. Os princípios desta página são agnósticos de framework. A implementação varia por stack, mas o contrato de cada fluxo é o mesmo.

---

## Routing (Roteamento)

Routing é o contrato entre URL e tela. Uma URL sempre resolve para o mesmo componente, com os mesmos dados, para qualquer usuário autorizado a vê-la.

```
Ação do usuário → URL atualiza → rota correspondida (tipada) → guard executa → loader busca dados → componente recebe dados → render
```

### Guard de rota

O guard (proteção de rota) verifica autorização durante a resolução da rota, antes de qualquer componente renderizar. Colocar essa verificação dentro do componente é um anti-pattern: o componente monta antes do redirect (redirecionamento), expondo conteúdo restrito por um frame.

<details>
<summary>❌ Bad — guard no componente renderiza antes de redirecionar</summary>
<br>

```js
function OrdersPage() {
  useEffect(() => {
    if (!currentUser.isAuthenticated) navigate('/login');
  }, []);

  return <OrdersList />;
}
```

</details>

<br>

<details>
<summary>✅ Good — guard na resolução da rota, antes de qualquer componente montar</summary>
<br>

```js
{
  path: '/orders',
  beforeLoad: (routeContext) => {
    const { auth } = routeContext.context;
    if (!auth.isAuthenticated) throw redirect({ to: '/login' });
  },
  component: OrdersPage,
}
```

</details>

Rotas com restrição por papel (role) são aninhadas sob um guard compartilhado. O guard roda uma vez para todo o grupo, não individualmente em cada rota filha.

```
/dashboard           ← guard: isAuthenticated
  /admin             ← guard: hasRole('admin')
    /users
  /settings
```

### Loaders

O loader (carregador de dados) busca os dados da rota durante a resolução, antes do componente montar. O componente recebe dados prontos. Sem estado de loading interno, sem `useEffect` de busca disparado após o mount (montagem).

<details>
<summary>❌ Bad — busca dentro do componente, após montar</summary>
<br>

```js
function OrderDetailPage({ orderId }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetchOrder(orderId).then(setOrder);
  }, [orderId]);

  return <OrderDetailView order={order} />;
}
```

</details>

<br>

<details>
<summary>✅ Good — loader na rota, componente recebe dados prontos</summary>
<br>

```js
async function loadOrderDetail(loaderArgs) {
  const { params } = loaderArgs;
  const order = await fetchOrder(params.orderId);

  return order;
}

function OrderDetailPage() {
  const order = useLoaderData();
  const orderView = <OrderDetailView order={order} />;

  return orderView;
}
```

</details>

Loaders de rotas aninhadas executam em paralelo. Esperar o pai para carregar o filho é opt-in explícito, não o padrão. Waterfall (cascata de requisições em série) é falha de design.

### Layouts aninhados

Layouts são persistentes; páginas são efêmeras. Um layout monta uma vez e permanece enquanto o usuário navega entre rotas filhas. Transições entre rotas irmãs não remontam o layout.

```
RootLayout             → /
  DashboardLayout      → /dashboard
    OrdersPage         → /dashboard/orders
    OrderDetailPage    → /dashboard/orders/:id
```

Dados do layout (perfil do usuário, itens de navegação) ficam no loader do layout. Buscá-los de novo em cada página é falha de colocalização.

---

## Forms (Formulários)

Um formulário é uma operação de escrita: o usuário fornece input (entrada), o sistema valida, persiste e retorna feedback. O fluxo espelha o pipeline de escrita do [operation-flow.md](operation-flow.md).

```
Usuário submete → schema.parse (cliente) → inválido: erros de campo | válido: server action → schema.parse (servidor) → inválido: erros estruturados | ok: sucesso → feedback
```

### Schema como contrato

O schema (esquema de validação) é a fonte da verdade para formato e regras de campo. Definido uma vez, usado tanto no cliente quanto no servidor.

<details>
<summary>✅ Good — schema único como contrato entre cliente e servidor</summary>
<br>

```js
import { z } from 'zod';

const orderSchema = z.object({
  customerId: z.string().uuid(),
  quantity: z.number().int().min(1),
  notes: z.string().max(500).optional(),
});
```

</details>

Validação no cliente é UX (experiência do usuário): resposta rápida, sem round-trip (ida e volta ao servidor). Validação no servidor é o boundary (fronteira) de segurança. Nunca confia no que veio do cliente. As duas sempre executam.

O servidor retorna erros estruturados por campo, não status HTTP isolado:

<details>
<summary>✅ Good — retorno estruturado de erros do servidor</summary>
<br>

```js
async function submitOrder(orderInput) {
  const parseResult = orderSchema.safeParse(orderInput);

  if (!parseResult.success) {
    const fieldErrors = { ok: false, errors: parseResult.error.flatten().fieldErrors };
    return fieldErrors;
  }

  await saveOrder(parseResult.data);

  const successResult = { ok: true };
  return successResult;
}
```

</details>

### Erros por campo e por formulário

Dois escopos, dois propósitos diferentes:

| Escopo | Quando usar | Exemplo |
|---|---|---|
| **Por campo** | Falha de validação em um input específico | "E-mail precisa ser um endereço válido" |
| **Por formulário** | Regra de negócio, cruzamento de campos, falha de rede | "E-mail já cadastrado", "Estoque insuficiente" |

Erros por campo ficam inline (integrados ao elemento), abaixo do input, associados via `aria-describedby`. Limpam quando o valor do campo muda.

Erros por formulário ficam no escopo do `<form>`, adjacentes ao botão de submit (envio). Capturam o que validação de campo não consegue: regras com contexto de servidor, restrições entre campos, falhas de infraestrutura.

### Submissão in-flight (em voo)

O formulário fica desabilitado durante a requisição. Não apenas o botão de submit: todos os campos. Previne double-submit (envio duplicado) e comunica estado ao usuário. `<fieldset disabled>` é a forma mais acessível: o atributo se propaga para todos os inputs filhos sem precisar desabilitar cada um individualmente.

### Optimistic updates (atualizações otimistas)

Optimistic update (atualização otimista) altera o estado local imediatamente, antes da confirmação do servidor, e reverte em caso de erro.

Usar quando: a alteração é de baixo risco, reversível, e o servidor raramente rejeita. Exemplos: favoritar, reordenar, marcar como lido.

Não usar em: formulários com validação de negócio complexa, operações financeiras, fluxos irreversíveis, ou onde o servidor produz dados que o cliente não consegue prever: IDs gerados, campos calculados, timestamps.

O update otimista substitui o spinner de loading (carregamento), não o tratamento de erro. O caminho de falha sempre existe.

---

**Implementações por stack**
- JavaScript/TypeScript: [javascript/conventions/advanced/](../../javascript/conventions/advanced/)
- C#: [csharp/setup/vertical-slice.md](../../csharp/setup/vertical-slice.md)

**Veja também**
- [operation-flow.md](operation-flow.md) — pipeline de busca de dados: Component → Hook → Service → apiClient
- [component-architecture.md](component-architecture.md) — container vs presentacional; rotas impõem essa separação naturalmente
