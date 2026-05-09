# Angular

> Escopo: TypeScript. Guia baseado em **Angular 21** com **Standalone API** e **Signals**.

Angular é um framework completo: roteamento, injeção de dependência, formulários reativos e comunicação **HTTP** (HyperText Transfer Protocol, Protocolo de Transferência de Hipertexto) fazem parte do core. Este guia mostra como implementar os contratos de [operation-flow.md](../../shared/architecture/operation-flow.md) e [frontend-flow.md](../../shared/architecture/frontend-flow.md) com Angular moderno.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Signal** (sinal reativo) | Valor reativo do Angular: notifica dependentes quando muda, sem RxJS para estado local |
| **Computed** (derivado) | Signal calculado a partir de outros signals: recalcula automaticamente quando os inputs mudam |
| **Effect** (efeito colateral) | Função que executa quando um Signal muda: sincronização com sistemas externos |
| **Standalone Component** (componente autônomo) | Componente sem NgModule: declara suas dependências diretamente em `imports` |
| **DI** (Dependency Injection, Injeção de Dependência) | Mecanismo do Angular que fornece dependências via `inject()` sem instanciação direta |
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
| **API** | Fronteira do frontend com o backend | backend |

## Estrutura de pastas

Angular não impõe estrutura de pastas. O roteamento é configurado em código, não por arquivo. Isso permite organização por slice vertical: cada feature reúne pages, components, services e resolvers. Guards e interceptors ficam em `core/` por serem infraestrutura compartilhada por todos os slices.

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

Componentes standalone são o padrão. Sem NgModule, sem boilerplate. Cada componente declara as dependências que usa diretamente em `imports`.

<details>
<summary>❌ Bad — componente declarado em NgModule</summary>
<br>

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

<br>

<details>
<summary>✅ Good — standalone com imports e @Input({ required: true })</summary>
<br>

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

## Signals: estado local reativo

Signals substituem `BehaviorSubject` e `Subject` do RxJS para estado local de componentes. A **API** (Application Programming Interface, Interface de Programação de Aplicações) é síncrona, sem subscribe, sem gerenciamento de ciclo de vida.

Regra: `signal()` para estado mutável, `computed()` para derivados, `effect()` apenas para sincronização com sistemas externos (DOM direto, localStorage, analytics), nunca para sincronizar signals entre si.

<details>
<summary>❌ Bad — BehaviorSubject para estado local simples</summary>
<br>

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

<br>

<details>
<summary>✅ Good — signal e computed para estado local</summary>
<br>

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
<summary>❌ Bad — componente de lista com lógica de negócio misturada</summary>
<br>

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

<br>

<details>
<summary>✅ Good — Smart orquestra com signals; Dumb apresenta</summary>
<br>

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
          {{ order.id }} — {{ order.total | currency }}
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

Services encapsulam lógica de negócio e acesso a dados. Usam `inject()` em vez de injeção via construtor. Return type explícito em todos os métodos públicos.

`providedIn: "root"` cria um singleton na aplicação. Use como padrão; escopos menores apenas quando houver razão explícita.

<details>
<summary>❌ Bad — injeção via construtor, return type implícito</summary>
<br>

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

<br>

<details>
<summary>✅ Good — inject(), return type explícito, tipos genéricos no HttpClient</summary>
<br>

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

## Guards: CanActivateFn

Guards de autorização ficam na definição da rota: executam antes de qualquer componente montar, conforme o padrão do [frontend-flow.md](../../shared/architecture/frontend-flow.md). Guard dentro do componente renderiza antes do redirect (redirecionamento), expondo conteúdo restrito.

Rotas com restrição por papel (role) são agrupadas sob um guard compartilhado; roda uma vez para o grupo, não individualmente em cada rota filha.

<details>
<summary>❌ Bad — guard no ngOnInit do componente</summary>
<br>

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

<br>

<details>
<summary>✅ Good — CanActivateFn na definição da rota</summary>
<br>

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

## Resolvers: dados antes do render

O **Resolver** cobre o papel do **Loader** definido em [frontend-flow.md](../../shared/architecture/frontend-flow.md): busca os dados da rota durante a resolução, antes do componente montar. O componente recebe dados prontos via `ActivatedRoute`, sem estado de loading interno.

<details>
<summary>❌ Bad — busca no ngOnInit, componente monta sem dados</summary>
<br>

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

<br>

<details>
<summary>✅ Good — ResolveFn na rota, componente recebe dados prontos via signal</summary>
<br>

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

## Formulários reativos tipados

Angular tem `FormGroup` e `FormControl` com tipagem genérica. Use `FormBuilder`: acesso direto aos controls, sem `form.get("campo")?.value` não-tipado.

O schema Zod valida a fronteira com o servidor (API call). O `Validators` do Angular valida a experiência do usuário no formulário; os dois executam sempre, conforme o padrão de [frontend-flow.md](../../shared/architecture/frontend-flow.md).

<details>
<summary>❌ Bad — FormGroup não-tipado, acesso por string</summary>
<br>

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

<br>

<details>
<summary>✅ Good — FormBuilder tipado, acesso direto aos controls, fieldset disabled</summary>
<br>

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

## Interceptors: HTTP global

**Interceptors** (`HttpInterceptorFn`) processam todas as requisições HTTP antes de chegarem ao serviço e todas as respostas antes de chegarem ao componente. Centralizam autenticação, error handling e retry, sem repetir lógica em cada **Service**.

Fluxo: `Service → Interceptor (auth) → Interceptor (error) → HttpClient → API`

<details>
<summary>❌ Bad — token injetado manualmente em cada service</summary>
<br>

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

<br>

<details>
<summary>✅ Good — auth interceptor centraliza o token em todas as requisições</summary>
<br>

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

<br>

<details>
<summary>✅ Good — error interceptor trata 401 e 500 globalmente</summary>
<br>

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
