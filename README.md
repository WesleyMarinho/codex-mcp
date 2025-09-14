# Prompt Engineer MCP Server (@wesleymarinho/prompt-engineer-mcp)

Version: 0.3.0

Este projeto é um **Model Context Protocol (MCP) Server** que atua como uma camada de engenharia de prompts. Ele recebe prompts brutos e os refina usando CLIs de IA externos (`Codex`, `Gemini`, etc.), transformando-os em uma saída JSON estruturada e acionável.

O objetivo é centralizar a lógica de engenharia de prompt, permitindo que qualquer IDE ou cliente compatível com MCP se beneficie de prompts mais claros, detalhados e seguros.

## Funcionalidades

-   **Refinamento de Prompt**: Transforma um prompt vago em uma instrução detalhada.
-   **Saída Estruturada**: Gera um JSON com `improvedPrompt`, `rationale`, `risks`, `tags` e `metadata` (checklist, critérios de aceitação).
-   **Seleção de Provedor**: Permite escolher dinamicamente qual CLI de IA usar (ex: `codex`, `gemini`).
-   **Seleção de Modelo**: Permite especificar o modelo exato para o provedor (ex: `gpt-5`, `gemini-1.5-pro`).
-   **Segurança**: Regras para redigir segredos e identificar riscos.
-   **Extensível**: A arquitetura facilita a adição de novos provedores de IA.

## Como Funciona

1.  Um cliente (como VSCode, Trae, etc.) envia uma requisição JSON para o `stdin` do servidor.
2.  O servidor MCP analisa a requisição e invoca a ferramenta `refine_prompt`.
3.  A ferramenta `refine_prompt` constrói um "meta-prompt" com base nas regras em `rules/prompt_rules.yaml` e no input do usuário.
4.  O servidor executa o CLI de IA correspondente (`codex` ou `gemini`) como um processo filho, passando o meta-prompt.
5.  O CLI de IA processa a requisição e retorna o JSON estruturado.
6.  O servidor MCP valida a saída e a retorna para o cliente via `stdout`.

## Requisitos

-   [Node.js](https://nodejs.org/) (v20 ou superior)
-   `npm` ou `pnpm`
-   **Um ou ambos os CLIs de IA** instalados e disponíveis no `PATH` do sistema:
    -   `codex` CLI
    -   `gemini` CLI (ou qualquer outro que você queira adicionar)

## Instalação

```bash
git clone https://github.com/WesleyMarinho/prompt-engineer-mcp.git
cd prompt-engineer-mcp
npm install
```

## Execução

### Modo de Desenvolvimento

Para rodar o servidor com recarregamento automático (`tsx`):

```bash
npm run dev
```

#### Testando com Mock

Para testar a lógica do servidor sem depender dos CLIs reais, use a variável de ambiente `USE_MOCK_AI`:

```bash
USE_MOCK_AI=true npm run dev
```

### Exemplo de Requisição

Para testar manualmente, inicie o servidor e cole um dos seguintes blocos JSON no seu terminal, pressionando `Enter` duas vezes.

**1. Requisição Básica (usando provedor e modelo padrão):**
```json
{
  "mcp_version": "0.1",
  "id": "1",
  "tool_name": "refine_prompt",
  "input": {
    "prompt": "Quero um script que leia CSV e grave no Postgres com validação"
  }
}
```

**2. Escolhendo o Provedor `gemini` (modelo padrão `gemini-pro`):**
```json
{
  "mcp_version": "0.1",
  "id": "2",
  "tool_name": "refine_prompt",
  "input": {
    "prompt": "Crie uma API para upload de arquivos em S3",
    "provider": "gemini"
  }
}
```

**3. Especificando Provedor e Modelo:**
```json
{
  "mcp_version": "0.1",
  "id": "3",
  "tool_name": "refine_prompt",
  "input": {
    "prompt": "Explique o conceito de RAG em LLMs",
    "provider": "gemini",
    "model": "gemini-1.5-pro"
  }
}
```

## Integração com IDEs

A integração é feita configurando o cliente MCP para executar este servidor via `stdio`.

### Exemplo para `~/.mcp/config.toml` (Trae, Claude Desktop)

```toml
# ~/.mcp/config.toml

[[servers]]
# Nome para identificar o servidor no cliente
name = "prompt-engineer"

# Comando para iniciar o servidor. Use o caminho absoluto.
# Para desenvolvimento:
command = ["/caminho/completo/para/node_modules/.bin/tsx", "/caminho/completo/para/prompt-engineer-mcp/src/server.ts"]

# Para produção (após rodar `npm run build`):
# command = ["node", "/caminho/completo/para/prompt-engineer-mcp/dist/server.js"]
```