#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { runCodexCLI, testCodexAvailability, type CodexRequest } from './codex.js';
import { templateManager, type RefinedPromptOutput } from './templates.js';

/**
 * Prompt Engineer MCP Server
 * A Model Context Protocol server that refines prompts using GPT-5 via Codex CLI
 */

// Input validation schema for refine_prompt tool
const RefinePromptInputSchema = z.object({
  prompt: z.string().min(1, "Prompt não pode estar vazio"),
  context: z.string().optional(),
  tags: z.array(z.string()).optional()
});

type RefinePromptInput = z.infer<typeof RefinePromptInputSchema>;

/**
 * MCP Server for Prompt Engineering
 */
class PromptEngineerMCPServer {
  private server: Server;
  private isCodexAvailable: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: "prompt-engineer-mcp",
        version: "1.0.0",
        description: "Model Context Protocol server that acts as a Prompt Engineering Layer with GPT-5 integration"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
    this.checkCodexAvailability();
  }

  /**
   * Check if Codex CLI is available
   */
  private async checkCodexAvailability(): Promise<void> {
    try {
      this.isCodexAvailable = await testCodexAvailability();
      if (this.isCodexAvailable) {
        console.error('✓ Codex CLI available and ready');
      } else {
        console.error('⚠ Codex CLI not available - using offline mode');
      }
    } catch (error) {
      console.error('⚠ Failed to test Codex CLI availability:', error);
      this.isCodexAvailable = false;
    }
  }

  /**
   * Setup tool request handlers
   */
  private setupToolHandlers(): void {
    // Handle list tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<{ tools: Tool[] }> => {
      return {
        tools: [
          {
            name: "refine_prompt",
            description: "Refina um prompt utilizando GPT-5 via Codex CLI, retornando versão melhorada com análise estruturada",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "O prompt original que precisa ser refinado",
                  minLength: 1
                },
                context: {
                  type: "string",
                  description: "Contexto adicional opcional para o refinamento"
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Tags opcionais para categorizar o prompt"
                }
              },
              required: ["prompt"]
            }
          }
        ]
      };
    });

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "refine_prompt":
          return await this.handleRefinePrompt(args as RefinePromptInput);
        
        default:
          throw new Error(`Ferramenta desconhecida: ${name}`);
      }
    });
  }

  /**
   * Handle refine_prompt tool requests
   */
  private async handleRefinePrompt(input: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input
      const validatedInput = RefinePromptInputSchema.parse(input);
      const { prompt, context, tags } = validatedInput;

      console.error(`Processing prompt refinement request: "${prompt.substring(0, 50)}..."`);

      // Prepare Codex request
      const codexRequest: CodexRequest = {
        prompt,
        ...(context && { context }),
        ...(tags && { tags }),
        model: 'gpt-5'
      };

      // Refine the prompt using Codex CLI
      const refinedOutput = await runCodexCLI(codexRequest);

      // Format the response for MCP
      const response = this.formatMCPResponse(refinedOutput, validatedInput);

      console.error(`✓ Prompt refined successfully with ${refinedOutput.risks.length} risks identified`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2)
          }
        ]
      };

    } catch (error) {
      console.error('Error in refine_prompt:', error);

      // Return error response with fallback
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Erro ao processar solicitação de refinamento",
              message: error instanceof Error ? error.message : "Erro desconhecido",
              fallback: this.createErrorFallback(input as RefinePromptInput)
            }, null, 2)
          }
        ]
      };
    }
  }

  /**
   * Format the refined output for MCP response
   */
  private formatMCPResponse(refinedOutput: RefinedPromptOutput, originalInput: RefinePromptInput): object {
    return {
      success: true,
      original_prompt: originalInput.prompt,
      improved_prompt: refinedOutput.improvedPrompt,
      rationale: refinedOutput.rationale,
      risks: refinedOutput.risks,
      tags: refinedOutput.tags,
      metadata: {
        sections: refinedOutput.metadata.sections,
        acceptance_criteria: refinedOutput.metadata.acceptanceCriteria,
        checklist: refinedOutput.metadata.checklist,
        processing_info: {
          codex_available: this.isCodexAvailable,
          timestamp: new Date().toISOString(),
          version: "1.0.0"
        }
      }
    };
  }

  /**
   * Create error fallback response
   */
  private createErrorFallback(input: RefinePromptInput): object {
    const suggestedTags = templateManager.suggestTags(input.prompt);
    const identifiedRisks = templateManager.identifyRisks(input.prompt);

    return {
      original_prompt: input.prompt,
      improved_prompt: `${input.prompt}\n\n[NOTA: Prompt processado em modo offline]`,
      rationale: "Processamento realizado localmente devido a erro no sistema principal.",
      risks: ["Sistema de refinamento offline", ...identifiedRisks],
      tags: ["fallback", ...suggestedTags, ...(input.tags || [])],
      metadata: {
        sections: ["Plan", "Risks", "Next actions", "Tests"],
        acceptance_criteria: ["Validar funcionamento", "Testar implementação"],
        checklist: ["Revisar erro", "Tentar novamente", "Usar alternativa"],
        processing_info: {
          codex_available: false,
          fallback_mode: true,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    console.error('🚀 Starting Prompt Engineer MCP Server...');
    console.error(`📡 Codex CLI Status: ${this.isCodexAvailable ? 'Available' : 'Offline Mode'}`);
    console.error('📝 Tools available: refine_prompt');
    console.error('🔌 Server ready for connections via stdio');

    await this.server.connect(transport);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const server = new PromptEngineerMCPServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start Prompt Engineer MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n🛑 Shutting down Prompt Engineer MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n🛑 Shutting down Prompt Engineer MCP Server...');
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}