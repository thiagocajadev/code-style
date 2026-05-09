# Blockchain / Smart Contracts

> Escopo: Solana (solana-program 4.0, Agave 2.1) + Anchor 1.0.

Programas Solana são contratos inteligentes escritos em Rust e compilados para
**BPF** (Berkeley Packet Filter, formato de bytecode da Solana Virtual Machine).
O framework Anchor abstrai o boilerplate do SDK nativo e adiciona validação de accounts
em tempo de compilação via macros.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **program** (programa) | Contrato inteligente implantado on-chain; identificado por um `Pubkey` único |
| **account** (conta) | Unidade de armazenamento na Solana; toda instrução declara quais accounts acessa |
| **instruction** (instrução) | Chamada a um programa com accounts e dados de entrada; equivale a uma transação |
| **signer** | Account que assinou a transação; garante autorização da operação |
| **PDA** (Program Derived Address) | Endereço determinístico derivado do program; não tem chave privada |
| **lamport** | Menor unidade de SOL (10⁻⁹ SOL); usado para fees e rent |
| `anchor-lang` | Crate Anchor para Rust; define macros `#[program]`, `#[derive(Accounts)]`, `#[account]` |
| **IDL** (Interface Description Language) | JSON gerado pelo Anchor descrevendo o programa; usado pelos clients |

## Estrutura de um programa Anchor

Um programa Anchor tem três partes: o módulo de handlers (`#[program]`), as structs de
accounts (`#[derive(Accounts)]`) e as structs de estado (`#[account]`).

```
my-program/
├── Cargo.toml
├── src/
│   └── lib.rs          ← módulo principal: handlers + structs
├── tests/
│   └── my-program.ts   ← testes de integração em TypeScript (Anchor padrão)
└── Anchor.toml         ← config do workspace Anchor
```

## Instrução — BAD/GOOD

<details>
<summary>❌ Bad — sem validação de accounts, lógica na instrução</summary>
<br>

```rust
use anchor_lang::prelude::*;

declare_id!("Prog1111111111111111111111111111111111111111");

#[program]
pub mod store {
    use super::*;

    pub fn update_price(
        context: Context<UpdatePrice>,
        new_price: u64,
    ) -> Result<()> {
        let product = &mut context.accounts.product;

        // sem verificação de autorização
        // sem verificação de preço positivo
        product.price = new_price;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(mut)]
    pub product: Account<'info, Product>, // qualquer um pode chamar

    pub authority: Signer<'info>,
}

#[account]
pub struct Product {
    pub price: u64,
    pub authority: Pubkey, // campo existe mas não é verificado
}
```

</details>

<br>

<details>
<summary>✅ Good — constraint de autorização + validação de entrada</summary>
<br>

```rust
use anchor_lang::prelude::*;

declare_id!("Prog1111111111111111111111111111111111111111");

#[program]
pub mod store {
    use super::*;

    pub fn initialize_product(
        context: Context<InitializeProduct>,
        initial_price: u64,
    ) -> Result<()> {
        require!(initial_price > 0, StoreError::InvalidPrice);

        let product = &mut context.accounts.product;

        product.price = initial_price;
        product.authority = context.accounts.authority.key();

        Ok(())
    }

    pub fn update_price(
        context: Context<UpdatePrice>,
        new_price: u64,
    ) -> Result<()> {
        require!(new_price > 0, StoreError::InvalidPrice);

        let product = &mut context.accounts.product;

        product.price = new_price;

        Ok(())
    }
}

// Instrução de inicialização — cria o account via seeds (PDA)
#[derive(Accounts)]
pub struct InitializeProduct<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Product::INIT_SPACE,
        seeds = [b"product", authority.key().as_ref()],
        bump,
    )]
    pub product: Account<'info, Product>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Instrução de atualização — valida autorização via constraint
#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(
        mut,
        seeds = [b"product", authority.key().as_ref()],
        bump,
        has_one = authority @ StoreError::Unauthorized,
    )]
    pub product: Account<'info, Product>,

    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Product {
    pub price: u64,
    pub authority: Pubkey,
}

#[error_code]
pub enum StoreError {
    #[msg("price must be greater than zero")]
    InvalidPrice,

    #[msg("only the product authority can perform this action")]
    Unauthorized,
}
```

</details>

## Accounts — modelo de dados

Cada instrução declara explicitamente os accounts que acessa. O runtime valida propriedade,
mutabilidade e assinatura antes de executar o programa.

<details>
<summary>❌ Bad — account sem constraint, mutabilidade excessiva</summary>
<br>

```rust
#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub destination: AccountInfo<'info>, // AccountInfo: sem validação de tipo

    pub caller: Signer<'info>, // qualquer signer — sem verificação de ownership
}
```

</details>

<br>

<details>
<summary>✅ Good — account tipado, constraint de ownership, PDA verificado</summary>
<br>

```rust
#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump,
        has_one = owner @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub destination: SystemAccount<'info>, // tipo verificado: account de sistema

    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

</details>

## Tooling

| Ferramenta | Uso |
| ---------- | --- |
| `anchor build` | Compila o programa e gera o IDL |
| `anchor test` | Executa testes TypeScript contra um validator local |
| `anchor deploy` | Implanta o programa na rede configurada |
| [Solana Playground](https://beta.solpg.io/) | IDE web para protótipos rápidos sem setup local |
| `solana-test-validator` | Validator local para desenvolvimento |
