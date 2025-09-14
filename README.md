# Prompt Engineer MCP Server

Um servidor **Model Context Protocol (MCP)** que atua como uma **Camada de Engenharia de Prompt**, interceptando prompts brutos, refinando-os usando GPT-5 (via Codex CLI), e retornando JSON estruturado com prompts melhorados, justificativas, riscos, tags e metadados.

## 🎯 Características

- **Cross-IDE**: Funciona em VSCode, Trae, Cursor e Claude Desktop
- **Integração GPT-5**: Utiliza Codex CLI para refinamento avançado de prompts
- **Saída Estruturada**: JSON com prompts melhorados, análise de riscos e metadados
- **Modo Offline**: Fallback inteligente quando Codex CLI não está disponível
- **TypeScript**: Implementação robusta com validação de tipos
- **Escalável**: Arquitetura modular para fácil extensão

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ 
- Codex CLI instalado e configurado (opcional para modo offline)
- npm ou yarn

### Instalação do Projeto

```bash
# Clone o repositório
git clone https://github.com/WesleyMarinho/codex-mcp.git
cd codex-mcp

# Instale dependências
npm install

# Compile o TypeScript
npm run build

# Instale globalmente (opcional)
npm install -g .
```

### Configuração do Codex CLI (Opcional)

Para máxima funcionalidade, instale o Codex CLI:

```bash
# Instale conforme documentação do Codex CLI
# Configure suas credenciais de API
export CODEX_API_KEY=your_api_key_here
```

## 🔧 Configuração por IDE

### VSCode

Adicione ao seu `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "prompt-engineer-mcp": {
      "command": "node",
      "args": ["/caminho/absoluto/para/prompt-engineer-mcp/dist/server.js"],
      "description": "Prompt Engineering Layer with GPT-5 integration"
    }
  }
}
```

### Trae

Adicione ao `~/.mcp/config.toml`:

```toml
[trae.prompt-engineer-mcp]
command = "prompt-engineer-mcp"
args = []
description = "Prompt Engineering Layer with GPT-5 integration"
env = {}
```

### Cursor

Crie/edite `~/.cursor/mcp.json` ou `cursor.json` na raiz do projeto:

```json
{
  "plugins": {
    "prompt-engineer-mcp": {
      "command": "prompt-engineer-mcp",
      "description": "Prompt Engineering Layer with GPT-5 integration",
      "enabled": true
    }
  }
}
```

### Claude Desktop

Adicione ao `~/.mcp/config.toml`:

```toml
[claude-desktop.prompt-engineer-mcp]
command = "prompt-engineer-mcp"
args = []
description = "Prompt Engineering Layer with GPT-5 integration"
timeout = 30
```

## 🛠️ Uso

### Ferramenta Disponível: `refine_prompt`

Refina um prompt utilizando GPT-5 via Codex CLI.

#### Entrada

```json
{
  "prompt": "Quero um script que leia CSV e grave no Postgres com validação",
  "context": "Sistema de ETL para dados financeiros",
  "tags": ["dados", "etl", "postgres"]
}
```

#### Saída

```json
{
  "success": true,
  "original_prompt": "Quero um script que leia CSV e grave no Postgres com validação",
  "improved_prompt": "Como um desenvolvedor sênior experiente, desenvolva um script Python robusto que: 1) Leia dados de um arquivo CSV com tratamento de erros, 2) Valide os tipos de dados e regras de negócio, 3) Estabeleça conexão segura com PostgreSQL, 4) Implemente inserção em lote para performance, 5) Inclua logging detalhado e tratamento de exceções.",
  "rationale": "Prompt melhorado com especificações técnicas claras, requisitos de qualidade e considerações de performance.",
  "risks": [
    "Validação de dados de entrada necessária",
    "Possível impacto na performance com grandes volumes",
    "Dados sensíveis podem estar expostos"
  ],
  "tags": ["desenvolvimento", "dados", "etl", "postgres", "python", "validação"],
  "metadata": {
    "sections": ["Plan", "Risks", "Next actions", "Tests"],
    "acceptance_criteria": [
      "Script lê CSV corretamente",
      "Validação de dados implementada",
      "Inserção no PostgreSQL funciona",
      "Tratamento de erros abrangente"
    ],
    "checklist": [
      "Implementar leitura de CSV",
      "Criar validações de dados",
      "Configurar conexão PostgreSQL",
      "Testar com dados de exemplo"
    ],
    "processing_info": {
      "codex_available": true,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "version": "1.0.0"
    }
  }
}
```

### Desenvolvimento Local

```bash
# Modo desenvolvimento (hot reload)
npm run dev

# Compile TypeScript
npm run build

# Inicie servidor compilado
npm start

# Teste manual
echo '{"method": "tools/call", "params": {"name": "refine_prompt", "arguments": {"prompt": "teste"}}}' | npm run dev
```

## 📁 Estrutura do Projeto

```
prompt-engineer-mcp/
├── src/
│   ├── server.ts          # Servidor MCP principal
│   ├── codex.ts          # Integração com Codex CLI  
│   └── templates.ts      # Gerenciamento de templates
├── rules/
│   └── prompt_rules.yaml # Regras e templates de prompt
├── examples/
│   └── mcp-configs.toml  # Exemplos de configuração
├── .vscode/
│   └── settings.json     # Configuração VSCode
├── dist/                 # Código compilado
├── package.json
├── tsconfig.json
└── README.md
```

## 🔍 Funcionalidades Avançadas

### Detecção Automática de Templates

O sistema detecta automaticamente o tipo de prompt e aplica templates apropriados:

- **Software Development**: Para prompts de desenvolvimento
- **Data Processing**: Para prompts de processamento de dados
- **General**: Template padrão para outros casos

### Identificação de Riscos

Análise automática identifica riscos potenciais:

- Segurança (dados sensíveis, autenticação)
- Performance (loops, grandes volumes)
- Dependências externas (APIs, serviços)
- Validação de dados

### Sistema de Tags

Tags automáticas baseadas no conteúdo:

- Categorias técnicas (desenvolvimento, dados, api)
- Tecnologias (python, postgres, react)
- Processos (testes, documentação, devops)

### Modo Fallback

Quando Codex CLI não está disponível:

- Análise local baseada em templates
- Identificação de riscos por palavras-chave  
- Sugestão de tags por contexto
- Metadados estruturados padrão

## 🧪 Testes

```bash
# Teste a ferramenta refine_prompt
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "refine_prompt",
    "arguments": {
      "prompt": "Quero um script que leia CSV e grave no Postgres com validação",
      "context": "Sistema de ETL para dados financeiros"
    }
  }'
```

## 📊 Logging e Monitoramento

O servidor registra informações importantes:

- Status de disponibilidade do Codex CLI
- Processamento de solicitações
- Erros e fallbacks
- Estatísticas de uso

Logs são enviados para stderr para não interferir com o protocolo MCP.

## 🔧 Solução de Problemas

### Codex CLI não encontrado

```bash
# Verifique se Codex CLI está instalado
which codex

# Instale se necessário
npm install -g @codex/cli

# Configure variáveis de ambiente
export CODEX_API_KEY=sua_chave_aqui
```

### Erro de permissão

```bash
# Torne o script executável
chmod +x dist/server.js

# Ou execute diretamente com node
node dist/server.js
```

### Problemas de conectividade MCP

1. Verifique se o caminho no arquivo de configuração está correto
2. Certifique-se de que o projeto foi compilado (`npm run build`)
3. Teste manualmente com `npm run dev`
4. Consulte logs no stderr da IDE

## 🚀 Extensibilidade

### Adicionar Nova Ferramenta

```typescript
// Em src/server.ts, adicione nova ferramenta:
{
  name: "lint_prompt", 
  description: "Analisa qualidade do prompt",
  inputSchema: {
    // schema aqui
  }
}

// Implemente o handler:
case "lint_prompt":
  return await this.handleLintPrompt(args);
```

### Novos Templates

```yaml
# Em rules/prompt_rules.yaml, adicione:
templates:
  new_category:
    prompt_prefix: "Para esta categoria específica, "
    sections:
      - "Análise Inicial"
      - "Implementação"
      - "Validação"
```

### Integração com Outros LLMs

```typescript
// Em src/codex.ts, adicione novo provider:
export async function runAlternateLLM(request: CodexRequest): Promise<RefinedPromptOutput> {
  // Implementação alternativa
}
```

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)  
5. Abra um Pull Request

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/WesleyMarinho/codex-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/WesleyMarinho/codex-mcp/discussions)
- **Email**: wesley@example.com

---

**Prompt Engineer MCP Server** - Transformando prompts simples em instruções precisas e estruturadas. 🚀
