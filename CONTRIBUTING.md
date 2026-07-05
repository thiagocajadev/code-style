# Contribuindo

Este repositório é um guia de convenções em que cada exemplo publicado em `docs/` também é um teste do próprio estilo. Toda contribuição passa pelos mesmos gates de qualidade do conteúdo existente.

## Como propor mudança

1. Abra uma issue descrevendo o problema: exemplo inconsistente, regra sem justificativa, link quebrado, linguagem faltando.
2. Para correções pequenas (typo, link, âncora), abra o **PR** (Pull Request, Pedido de Integração) direto.
3. Para mudanças de estrutura ou regra nova, alinhe o escopo na issue antes de escrever. Discussão de escopo dentro do diff custa caro para os dois lados.

## Gates de qualidade

Rode antes de abrir o PR:

```bash
npm install
npm run audit:docs   # linter dos blocos Good (dogfooding das próprias regras)
npm run test:docs    # testes do linter
npm run lint         # ESLint nos scripts
```

`audit:docs` precisa terminar com zero violações. Exemplos marcados como ✅ Bom seguem todos os princípios do guia ao mesmo tempo; exemplos ❌ Ruim podem concentrar anti-patterns de propósito.

## Estilo dos exemplos

- Cada linguagem segue o idioma nativo dela (snake_case em Python, PascalCase em C#). O significado das regras é universal; a forma pertence à linguagem.
- Termos técnicos ficam em inglês, com tradução entre parênteses na primeira ocorrência.
- Todo arquivo técnico abre com um parágrafo de contexto seguido da seção `## Conceitos fundamentais`.
- Nomes de domínio nos exemplos (`Order`, `Invoice`, `Customer`), nunca nomes de tipo técnico (`data`, `obj`, `item`).

## Commits

Conventional Commits: `feat:`, `fix:`, `docs:`. O CHANGELOG segue o formato Keep a Changelog e é atualizado junto com a mudança.

## Licença

Ao contribuir, você concorda que o conteúdo enviado é publicado sob [CC BY 4.0](LICENSE).
