# Fluxos de frontend

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Dois fluxos sustentam quase toda a interação de uma aplicação de frontend. O **routing** (roteamento)
decide como o usuário chega a cada tela. Os **forms** (formulários) decidem como o que ele digita é
capturado, conferido e enviado ao servidor. Os princípios desta página valem para qualquer framework:
a forma de escrever muda de stack para stack, e o contrato de cada fluxo continua o mesmo.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Routing** (roteamento) | Contrato entre URL e componente renderizado: uma URL sempre resolve para a mesma tela |
| **Guard** (proteção de rota) | Verificação de autorização executada durante a resolução da rota, antes de qualquer componente montar |
| **Loader** (carregador de dados) | Busca os dados da rota durante a resolução, antes do componente montar |
| **Schema** (esquema de validação) | Fonte da verdade para formato e regras de campos de um formulário, usada no cliente e no servidor |
| **UX** (User Experience · experiência do usuário) | Qualidade da interação do usuário com a interface |
| **Optimistic update** (atualização otimista) | Alterar o estado local imediatamente, antes da confirmação do servidor, e reverter em caso de erro |
| **Waterfall** (cascata de requisições) | Anti-padrão onde requisições são feitas em série, cada uma aguardando a anterior |

---

## Roteamento: a URL decide a tela

Routing é o contrato entre a **URL** (Uniform Resource Locator · Localizador Uniforme de Recurso) e a
tela. A mesma URL leva ao mesmo componente, com os mesmos dados, para todo usuário autorizado a
vê-la. É isso que permite copiar o endereço, mandar para um colega e ele ver a mesma coisa.

```
Ação do usuário → URL atualiza → rota correspondida (tipada) → guard executa → loader busca dados → componente recebe dados → render
```

### O guard barra antes de a tela existir

O guard (proteção de rota) confere a autorização enquanto a rota é resolvida, antes de qualquer
componente aparecer. Fazer essa checagem dentro do componente chega tarde: ele monta, desenha o
conteúdo restrito por um instante e só então o redirecionamento acontece. O usuário sem permissão vê
um piscar do que não deveria ver.

<details>
<summary>❌ Ruim: guard no componente renderiza antes de redirecionar</summary>

```js
function OrdersPage() {
  useEffect(() => {
    if (!currentUser.isAuthenticated) navigate('/login');
  }, []);

  return <OrdersList />;
}
```

</details>

<details>
<summary>✅ Bom: guard na resolução da rota, antes de qualquer componente montar</summary>

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

Rotas que exigem o mesmo papel (role) ficam aninhadas sob um guard comum. Ele roda uma vez para o
grupo inteiro, e cada rota filha herda a proteção sem repetir a regra.

```
/dashboard           ← guard: isAuthenticated
  /admin             ← guard: hasRole('admin')
    /users
  /settings
```

### O loader entrega o componente já com os dados

O loader (carregador de dados) busca os dados enquanto a rota resolve, antes de o componente montar.
O componente recebe tudo pronto e cuida apenas de desenhar. Some o estado de carregamento interno,
some o `useEffect` que dispara a busca depois que a tela já apareceu.

<details>
<summary>❌ Ruim: busca dentro do componente, após montar</summary>

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

<details>
<summary>✅ Bom: loader na rota, componente recebe dados prontos</summary>

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

Os loaders de rotas aninhadas disparam em paralelo. Encadear um atrás do outro é uma escolha
deliberada, feita apenas quando o filho depende de um dado que só o pai traz. Quando as requisições
saem em série sem essa necessidade, o usuário espera a soma dos tempos em vez do maior deles, e essa
cascata (waterfall) é o desperdício mais comum de tela lenta.

### Layouts ficam, páginas passam

O layout monta uma vez e permanece enquanto o usuário navega entre as rotas filhas. A página troca a
cada navegação. Ir de uma rota irmã para outra troca o conteúdo e mantém a moldura de pé.

```
RootLayout             → /
  DashboardLayout      → /dashboard
    OrdersPage         → /dashboard/orders
    OrderDetailPage    → /dashboard/orders/:id
```

Os dados do layout (perfil do usuário, itens de menu) ficam no loader do layout, e cada página herda
o que ele já buscou. Buscar de novo em cada página repete a mesma chamada a cada clique.

---

## Formulários: o que o usuário digita chega ao servidor

Um formulário é uma operação de escrita: o usuário preenche, o sistema confere, grava e devolve o
resultado. O caminho espelha o pipeline de escrita descrito em
[operation-flow.md](operation-flow.md).

```
Usuário submete → schema.parse (cliente) → inválido: erros de campo | válido: server action → schema.parse (servidor) → inválido: erros estruturados | ok: sucesso → feedback
```

### O schema é o contrato dos dois lados

O schema (esquema de validação) descreve o formato e as regras de cada campo. Ele é escrito uma vez e
usado nas duas pontas, o que mantém cliente e servidor de acordo sobre o que é um pedido válido.

<details>
<summary>✅ Bom: schema único como contrato entre cliente e servidor</summary>

```js
import { z } from 'zod';

const orderSchema = z.object({
  customerId: z.string().uuid(),
  quantity: z.number().int().min(1),
  notes: z.string().max(500).optional(),
});
```

</details>

As duas validações rodam sempre, com papéis diferentes. No cliente, a validação existe pela **UX**
(User Experience · experiência do usuário): o erro aparece na hora, sem ida e volta até o servidor. No
servidor, ela existe pela segurança: o cliente pode ser um script qualquer chamando a rota direto, e
o servidor confere tudo de novo antes de gravar.

O servidor devolve o erro amarrado ao campo que o causou, para a tela conseguir mostrá-lo no lugar
certo:

<details>
<summary>✅ Bom: retorno estruturado de erros do servidor</summary>

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

Um status **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) sozinho
diz que algo deu errado. O retorno estruturado diz qual campo errou e por quê.

### Erro de campo e erro de formulário

Dois escopos, dois propósitos:

| Escopo | Quando usar | Exemplo |
|---|---|---|
| **Por campo** | Falha de validação em um input específico | "E-mail precisa ser um endereço válido" |
| **Por formulário** | Regra de negócio, cruzamento de campos, falha de rede | "E-mail já cadastrado", "Estoque insuficiente" |

O erro de campo aparece logo abaixo do input, ligado a ele por `aria-describedby` para que o leitor de
tela anuncie os dois juntos. Ele some assim que o valor do campo muda.

O erro de formulário fica no escopo do `<form>`, perto do botão de envio. É ali que moram as falhas
que nenhum campo isolado explica: a regra que só o servidor conhece, a restrição que envolve dois
campos ao mesmo tempo, a rede que caiu.

### Enquanto a requisição está no ar

O formulário inteiro fica desabilitado durante o envio, incluindo os campos. Travar o botão sozinho
deixa o usuário editar o que já foi enviado e clicar duas vezes por outros caminhos, criando pedido
duplicado. A forma mais acessível é o `<fieldset disabled>`: o atributo desce para todos os inputs de
dentro sem precisar tocar em cada um.

### Atualização otimista

A atualização otimista altera a tela na hora, antes de o servidor confirmar, e desfaz a alteração se a
resposta trouxer erro. O ganho é a interface responder ao clique sem espera.

Usar quando a alteração tem baixo risco, é reversível e o servidor quase nunca recusa: favoritar,
reordenar uma lista, marcar como lido.

Evitar em formulário com regra de negócio complexa, operação financeira, fluxo sem volta e em tudo que
o servidor calcula e o cliente não tem como adivinhar (IDs gerados, campos derivados, horários de
gravação). Nesses casos o palpite da tela erra, e o usuário vê o valor mudar duas vezes.

A atualização otimista substitui o spinner de carregamento e mantém o tratamento de erro no lugar. A
resposta do servidor continua chegando, e a tela precisa saber voltar atrás quando ela recusa.

---

**Implementações por stack**
- JavaScript/TypeScript: [javascript/conventions/advanced/](../../javascript/conventions/advanced/)
- C#: [csharp/setup/vertical-slice.md](../../csharp/setup/vertical-slice.md)

**Veja também**
- [operation-flow.md](operation-flow.md): pipeline de busca de dados: Component → Hook → Service → apiClient
- [component-architecture.md](component-architecture.md): container vs presentacional; rotas impõem essa separação naturalmente
