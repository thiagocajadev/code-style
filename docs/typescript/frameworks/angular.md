# Angular

> Escopo: TypeScript. Guia baseado em **Angular 21** com **Standalone API** e **Signals**.

Angular é um framework completo: roteamento, injeção de dependência, formulários reativos e comunicação **HTTP** (HyperText Transfer Protocol · Protocolo de Transferência de Hipertexto) fazem parte do core. Este guia mostra como implementar os contratos de [operation-flow.md](../../shared/architecture/operation-flow.md) e [frontend-flow.md](../../shared/architecture/frontend-flow.md) com Angular moderno.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Signal** (sinal reativo) | Valor reativo do Angular: notifica dependentes quando muda, sem RxJS para estado local |
| **Computed** (derivado) | Signal calculado a partir de outros signals: recalcula automaticamente quando os inputs mudam |
| **Effect** (efeito colateral) | Função que executa quando um Signal muda: sincronização com sistemas externos |
| **Standalone Component** (componente autônomo) | Componente sem NgModule: declara suas dependências diretamente em `imports` |
| **DI** (Dependency Injection · Injeção de Dependência) | Mecanismo do Angular que fornece dependências via `inject()` sem instanciação direta |
| **Smart Component** (componente inteligente) | Componente que orquestra dados e estado; delega renderização a **Dumb Components** |
| **Dumb Component** (componente de apresentação) | Componente que recebe dados via `@Input()` e emite eventos via `@Output()`; sem lógica de negócio |
| **Guard** (proteção de rota) | Verificação de autorização executada durante a resolução da rota, antes de qualquer componente montar |
| **Resolver** (carregador de dados) | Busca os dados da rota durante a resolução, antes do componente montar |

## Fluxo de Operação

`URL → app.routes.ts → Guard → Resolver → Smart Component → Service → Interceptor → HttpClient → API`

| Passo | O que faz | Domínio |
|---|---|---|
| **URL** | Navegação do usuário inicia a resolução da rota | navegador |
| **app.routes.ts** | Mapeia a URL para guard, resolver e componente destino | `core/` |
| **Guard** | Verifica autenticação ou papel; redireciona se não autorizado, antes de qualquer componente montar | `core/` |
| **Resolver** | Busca os dados da rota; o componente recebe dados prontos, sem estado de loading interno | `features/` |
| **Smart Component** | Orquestra estado com signals; delega renderização a **Dumb Components** via `@Input()` | `features/` |
| **Service** | Encapsula a lógica de acesso HTTP e retorna `Observable<T>` | `features/` |
| **Interceptor** | Processa todas as requisições (injeta token) e respostas (trata 401, 500) de forma centralizada | `core/` |
| **HttpClient** | Injectable do framework: configurado em `app.config.ts`, injetado nos Services via `inject(HttpClient)` | `core/` · `features/` |
| **API** | O limite entre o frontend e o backend | backend |

## Estrutura de pastas

Angular deixa a estrutura de pastas por sua conta, e o roteamento é declarado em código, dentro de `app.routes.ts`. Como o caminho da URL não depende de onde o arquivo está, as pastas ficam livres para agrupar por funcionalidade: cada fatia reúne as páginas, os componentes, os services e os resolvers do mesmo assunto. Guards e interceptors ficam em `core/`, porque são infraestrutura que atende todas as fatias.

```
src/app/
├── features/
│   └── orders/                              ← slice: tudo relativo a orders
│       ├── pages/order-detail.page.ts       → Smart Component: orquestra dados e estado
│       ├── components/order-list.component.ts → Dumb Component: @Input(), @Output(), sem lógica
│       ├── services/order.service.ts         → Injectable: HttpClient, retorna Observable<T>
│       └── resolvers/order-detail.resolver.ts → ResolveFn: busca dados antes do componente montar
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts                    → CanActivateFn: verifica autenticação
│   │   └── role.guard.ts                    → CanActivateFn: verifica papel do usuário
│   ├── interceptors/
│   │   ├── auth.interceptor.ts              → HttpInterceptorFn: injeta token nas requisições
│   │   └── error.interceptor.ts             → HttpInterceptorFn: trata 401 e 500 globalmente
│   ├── app.routes.ts                        → rotas: guards, resolvers, lazy load
│   └── app.config.ts                        → providers: HttpClient, interceptors
```

## Componentes standalone

O componente standalone é o padrão. Ele declara em `imports` as dependências que usa, e dispensa o
`NgModule`, que era um segundo arquivo por onde cada componente precisava passar para existir. Com
ele, a lista do que o componente usa fica no próprio componente, e não em um registro à parte que
ninguém lembra de atualizar.

<details>
<summary>❌ Ruim: o componente precisa ser registrado em um NgModule</summary>

```ts
@NgModule({
  declarations: [UserCardComponent],
  imports: [CommonModule],
  exports: [UserCardComponent],
})
export class UserCardModule {}

@Component({
  selector: "app-user-card",
  templateUrl: "./user-card.component.html",
})
export class UserCardComponent {
  @Input() user!: User;
}
```

</details>

<details>
<summary>✅ Bom: standalone com imports e @Input({ required: true })</summary>

```ts
import { Component, input } from "@angular/core";
import { CurrencyPipe } from "@angular/common";

@Component({
  selector: "app-user-card",
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="user-card">
      <h2>{{ user().name }}</h2>
      <p>{{ user().balance | currency }}</p>
    </div>
  `,
})

export class UserCardComponent {
  readonly user = input.required<User>();
}
```

</details>

## Signals: o estado local do componente

Para o estado que vive dentro de um componente, o **Signal** substitui o `BehaviorSubject` do RxJS.
A diferença prática está no que ele dispensa: a leitura é direta, sem `subscribe`, e sem o
cancelamento que todo `subscribe` exige quando o componente é destruído, sob pena de vazar memória.

A divisão é esta: `signal()` guarda um valor que muda, `computed()` calcula um valor a partir de
outros signals, e `effect()` reage a uma mudança para falar com o mundo de fora (o DOM, o
`localStorage`, o analytics). Usar `effect()` para manter dois signals em sincronia é reescrever à
mão o que o `computed()` faz sozinho.

<details>
<summary>❌ Ruim: BehaviorSubject para um estado local simples</summary>

```ts
@Component({ /* ... */ })
export class CartComponent implements OnInit, OnDestroy {
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>([]);
  readonly items$ = this.itemsSubject.asObservable();
  readonly total$ = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + item.price * item.qty, 0))
  );

  private readonly destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

</details>

<details>
<summary>✅ Bom: signal e computed para estado local</summary>

```ts
import { Component, signal, computed } from "@angular/core";
import { CurrencyPipe } from "@angular/common";

@Component({
  selector: "app-cart",
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <p>Total: {{ total() | currency }}</p>
    <button (click)="clearCart()">Limpar</button>
  `,
})

export class CartComponent {
  readonly items = signal<CartItem[]>([]);
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.qty, 0)
  );

  addItem(item: CartItem): void {
    this.items.update(current => [...current, item]);
  }

  clearCart(): void {
    this.items.set([]);
  }
}
```

</details>

## Smart e Dumb Components

O pipeline de [operation-flow.md](../../shared/architecture/operation-flow.md) se mapeia diretamente: **Smart Component** chama o **Service**, que chama o `HttpClient`. **Dumb Component** recebe dados por `@Input()` e emite eventos por `@Output()`.

Fluxo: `Smart → @Input() → Dumb → @Output() → Smart`

<details>
<summary>❌ Ruim: o componente de lista carrega a regra de negócio dentro dele</summary>

```ts
@Component({
  selector: "app-order-list",
  standalone: true,
  template: `...`,
})
export class OrderListComponent implements OnInit {
  orders: Order[] = [];

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.orderService.listOrders().subscribe(orders => {
      this.orders = orders.filter(o => o.status !== "cancelled");
    });
  }

  cancelOrder(id: string): void {
    this.orderService.cancel(id).subscribe(() => {
      this.orders = this.orders.filter(o => o.id !== id);
    });
  }
}
```

</details>

<details>
<summary>✅ Bom: Smart orquestra com signals; Dumb apresenta</summary>

```ts
// Smart Component
import { Component, computed, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { OrderListComponent } from "./order-list.component";

@Component({
  selector: "app-orders-page",
  standalone: true,
  imports: [OrderListComponent],
  template: `
    <app-order-list
      [orders]="activeOrders()"
      (cancel)="handleCancel($event)"
    />
  `,
})

export class OrdersPageComponent {
  private readonly orderService = inject(OrderService);

  private readonly orders$ = this.orderService.listOrders();
  readonly orders = toSignal(this.orders$, { initialValue: [] });
  readonly activeOrders = computed(() =>
    this.orders().filter(order => order.status !== "cancelled")
  );

  handleCancel(id: string): void {
    this.orderService.cancel(id).subscribe();
  }
}
```

```ts
// Dumb Component
@Component({
  selector: "app-order-list",
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <ul>
      @for (order of orders(); track order.id) {
        <li>
          {{ order.id }}: {{ order.total | currency }}
          <button (click)="cancel.emit(order.id)">Cancelar</button>
        </li>
      }
    </ul>
  `,
})

export class OrderListComponent {
  readonly orders = input.required<Order[]>();
  readonly cancel = output<string>();
}
```

</details>

## Services e injeção de dependência

O Service guarda a regra de negócio e o acesso a dados, e recebe suas dependências por `inject()`. A
função dispensa o construtor cheio de parâmetros e funciona também fora de classes, em guards e
resolvers escritos como função. Todo método público declara o tipo de retorno.

`providedIn: "root"` cria uma instância única para a aplicação inteira, e é o padrão. Um escopo menor
só se justifica quando o Service guarda estado que precisa morrer junto com a tela.

<details>
<summary>❌ Ruim: dependências pelo construtor, e o retorno sem tipo declarado</summary>

```ts
@Injectable({ providedIn: "root" })
export class OrderService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getOrders() {
    return this.http.get("/api/orders");
  }
}
```

</details>

<details>
<summary>✅ Bom: inject(), return type explícito, tipos genéricos no HttpClient</summary>

```ts
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class OrderService {
  private readonly http = inject(HttpClient);

  listOrders(): Observable<Order[]> {
    const orders = this.http.get<Order[]>("/api/orders");
    return orders;
  }

  findById(id: string): Observable<Order> {
    const order = this.http.get<Order>(`/api/orders/${id}`);
    return order;
  }

  cancel(id: string): Observable<void> {
    const cancellation = this.http.delete<void>(`/api/orders/${id}`);
    return cancellation;
  }
}
```

</details>

## A checagem de acesso mora na rota, antes de qualquer render

A verificação de permissão fica na definição da rota, e roda antes de o componente montar, como manda
o [frontend-flow.md](../../shared/architecture/frontend-flow.md).

Feita no `ngOnInit`, ela chega tarde. O componente já montou, o template já foi pintado, e o
redirecionamento acontece depois. Nesse intervalo o conteúdo restrito aparece na tela para quem não
deveria vê-lo.

Rotas que exigem o mesmo papel ficam agrupadas sob um guard só, no nó pai. Ele roda uma vez para o
grupo inteiro, e não a cada rota filha.

<details>
<summary>❌ Ruim: a checagem no ngOnInit, depois de o componente já ter montado</summary>

```ts
@Component({ /* ... */ })
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(["/login"]);
    }
  }
}
```

</details>

<details>
<summary>✅ Bom: CanActivateFn na definição da rota</summary>

```ts
// guards/auth.guard.ts
import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    const loginUrl = router.createUrlTree(["/login"]);
    return loginUrl;
  }

  const accessGranted = true;
  return accessGranted;
};

// guards/role.guard.ts
export function roleGuard(role: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.hasRole(role)) {
      const forbiddenUrl = router.createUrlTree(["/forbidden"]);
      return forbiddenUrl;
    }

    const accessGranted = true;
    return accessGranted;
  };
}
```

```ts
// app.routes.ts
export const routes: Routes = [
  {
    path: "dashboard",
    canActivate: [authGuard],
    children: [
      {
        path: "admin",
        canActivate: [roleGuard("admin")],
        children: [
          { path: "users", component: UsersPageComponent },
        ],
      },
      { path: "settings", component: SettingsPageComponent },
    ],
  },
];
```

</details>

## O Resolver busca os dados antes de o componente montar

O **Resolver** cumpre o papel do **Loader** de
[frontend-flow.md](../../shared/architecture/frontend-flow.md): ele busca os dados durante a
resolução da rota, e o componente monta com o dado já em mãos, recebido pelo `ActivatedRoute`.

A alternativa, buscar no `ngOnInit`, obriga o componente a nascer vazio e a lidar com o intervalo em
que o dado ainda não chegou. Aparece o estado de carregamento, aparece o `?.` em toda propriedade, e
a tela pisca entre o esqueleto e o conteúdo.

<details>
<summary>❌ Ruim: a busca no ngOnInit, e o componente monta sem dado nenhum</summary>

```ts
@Component({ /* ... */ })
export class OrderDetailComponent implements OnInit {
  order: Order | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id")!;
    this.orderService.findById(id).subscribe(order => {
      this.order = order;
    });
  }
}
```

</details>

<details>
<summary>✅ Bom: ResolveFn na rota, componente recebe dados prontos via signal</summary>

```ts
// resolvers/order-detail.resolver.ts
import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";

export const orderDetailResolver: ResolveFn<Order> = (route) => {
  const id = route.paramMap.get("id")!;
  const orderService = inject(OrderService);
  const order = orderService.findById(id);
  return order;
};
```

```ts
// app.routes.ts
{
  path: "orders/:id",
  component: OrderDetailPageComponent,
  resolve: { order: orderDetailResolver },
}
```

```ts
// pages/order-detail.page.ts
import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

@Component({
  selector: "app-order-detail-page",
  standalone: true,
  template: `
    @if (order()) {
      <app-order-detail [order]="order()!" />
    }
  `,
})

export class OrderDetailPageComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly order$ = this.route.data.pipe(
    map(data => data["order"] as Order)
  );

  readonly order = toSignal(this.order$);
}
```

</details>

## Formulários reativos com tipo

`FormGroup` e `FormControl` aceitam tipo, e o `FormBuilder` os monta já tipados. O ganho aparece no
acesso: `form.controls.email.value` é uma `string`, enquanto `form.get("email")?.value` devolve um
valor sem tipo, e ainda aceita um nome de campo que não existe, sem erro de compilação.

As duas validações convivem, e cada uma tem seu papel. O `Validators` do Angular cuida da
experiência do usuário e avisa enquanto ele digita. O schema Zod valida no limite com o servidor,
antes da chamada de API, porque a checagem do navegador é conveniência, e conveniência pode ser
contornada. Os dois rodam sempre, como manda o
[frontend-flow.md](../../shared/architecture/frontend-flow.md).

<details>
<summary>❌ Ruim: o FormGroup não tem tipo, e os campos são acessados por texto</summary>

```ts
@Component({ /* ... */ })
export class LoginFormComponent {
  readonly form = new FormGroup({
    email: new FormControl(""),
    password: new FormControl(""),
  });

  submit(): void {
    const email = this.form.get("email")?.value; // string | null | undefined
    const password = this.form.get("password")?.value;
  }
}
```

</details>

<details>
<summary>✅ Bom: FormBuilder tipado, acesso direto aos controls, fieldset disabled</summary>

```ts
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
  selector: "app-login-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <fieldset [disabled]="isSubmitting()">
        <input formControlName="email" type="email" aria-describedby="email-error" />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <span id="email-error">E-mail inválido.</span>
        }

        <input formControlName="password" type="password" />

        @if (formError()) {
          <p role="alert">{{ formError() }}</p>
        }

        <button type="submit">
          {{ isSubmitting() ? "Entrando..." : "Entrar" }}
        </button>
      </fieldset>
    </form>
  `,
})

export class LoginFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.formBuilder.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;

    const { email, password } = this.form.getRawValue();
    const credentials = { email: email!, password: password! };

    this.isSubmitting.set(true);
    this.formError.set(null);

    this.authService.login(credentials).subscribe({
      next: () => this.isSubmitting.set(false),
      error: () => {
        this.formError.set("E-mail ou senha inválidos.");
        this.isSubmitting.set(false);
      },
    });
  }
}
```

</details>

## O Interceptor trata o que vale para toda requisição HTTP

O **Interceptor** (`HttpInterceptorFn`) fica no caminho de todas as requisições que saem e de todas as respostas que voltam. É o lugar do que vale para todas elas: pendurar o token de autenticação, tratar o 401 que expirou a sessão, decidir o que fazer com o 500.

Sem ele, cada Service repete as mesmas linhas, e a regra passa a existir em vinte lugares. Basta um Service novo esquecer o token para uma tela quebrar, e o motivo não vai estar no Service que quebrou.

Fluxo: `Service → Interceptor (auth) → Interceptor (error) → HttpClient → API`

<details>
<summary>❌ Ruim: cada service pendura o token por conta própria</summary>

```ts
@Injectable({ providedIn: "root" })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  listOrders(): Observable<Order[]> {
    const token = this.auth.getToken();
    const headers = { Authorization: `Bearer ${token}` };
    const orders = this.http.get<Order[]>("/api/orders", { headers });

    return orders;
  }
}
```

</details>

<details>
<summary>✅ Bom: auth interceptor centraliza o token em todas as requisições</summary>

```ts
// interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from "@angular/common/http";
import { inject } from "@angular/core";

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (!token) {
    const unauthenticatedResponse = next(request);
    return unauthenticatedResponse;
  }

  const authenticatedRequest = request.clone({
    headers: request.headers.set("Authorization", `Bearer ${token}`),
  });

  const authenticatedResponse = next(authenticatedRequest);
  return authenticatedResponse;
};
```

```ts
// app.config.ts
import { provideHttpClient, withInterceptors } from "@angular/common/http";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

</details>

<details>
<summary>✅ Bom: error interceptor trata 401 e 500 globalmente</summary>

```ts
// interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";

export const errorInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.clearSession();
        router.navigate(["/login"]);
      }

      return throwError(() => error);
    })
  );
};
```

</details>
