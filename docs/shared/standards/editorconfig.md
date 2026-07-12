# EditorConfig

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

O `.editorconfig` guarda as regras de formatação que todo editor do time respeita, sem depender da configuração pessoal de cada um. A base abaixo funciona em VS Code, JetBrains, Vim e qualquer editor com suporte ao padrão. Copie o arquivo para a raiz do projeto.

> [!NOTE]
> Linguagens com convenções próprias podem sobrescrever as regras globais; veja a seção de overrides ao final.

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **EditorConfig** (configuração de editor) | Padrão multi-editor para regras de formatação por arquivo |
| **EOF** (End Of File · Fim do Arquivo) | Caractere final do arquivo; convenção exige linha em branco terminal |
| **BOM** (Byte Order Mark · Marca de Ordem de Bytes) | Marcador UTF-8 no início do arquivo; incompatível com várias toolchains |
| **LF vs CRLF** (Line Feed / Carriage Return + Line Feed, Fim de Linha Unix vs Windows) | Separador de linhas; `LF` é o padrão cross-platform |
| **SQL** (Structured Query Language · Linguagem de Consulta Estruturada) | Arquivos `.sql` herdam overrides específicos (indentação, quebra de linha) |

## Arquivo pronto para uso

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.sql]
max_line_length = 120

[*.{js,ts,jsx,tsx,cjs,mjs}]
max_line_length = 80

[*.{cs,csx}]
max_line_length = 120

[*.md]
trim_trailing_whitespace = false
```

## Regras

| Propriedade | Valor | Por quê |
| --- | --- | --- |
| `indent_style` | `space` | Renderização consistente em qualquer editor e plataforma |
| `indent_size` | `2` | Espaço visual adequado sem deslocar código aninhado |
| `end_of_line` | `lf` | Padrão Unix: evita `\r\n` no histórico do Git em ambientes mistos |
| `charset` | `utf-8` | Suporte a caracteres especiais sem **BOM** |
| `trim_trailing_whitespace` | `true` | Elimina ruído em diffs (comparações de mudanças): whitespace (espaço em branco) invisível não deve aparecer em commits |
| `insert_final_newline` | `true` | Padrão POSIX: ferramentas como `git diff` e `cat` esperam newline no **EOF** |
| `max_line_length` SQL / C# | `120` | SQL vertical é naturalmente longo; 80 seria restritivo demais |
| `max_line_length` JS / TS | `80` | Lê melhor em linhas curtas |
| `trim_trailing_whitespace` `.md` | `false` | Em Markdown, dois espaços seguidos de Enter é quebra de linha intencional |

## Overrides por linguagem

O bloco `[*]` é o ponto de partida, e cada seção seguinte sobrescreve apenas o que diverge dele.

Num projeto de linguagem única, mova as regras específicas direto para `[*]` e apague os overrides que sobraram.
