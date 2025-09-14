// src/server.ts
// The main entry point for the Model Context Protocol (MCP) server.

import { MCPServer, Tool, ToolInput, ToolOutput } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { refineWithAI, RefinedPrompt } from './ai-providers';

// Define the Zod schema for the input of our 'refine_prompt' tool.
// It now includes an optional 'model' field for specific model selection.
const RefinePromptInputSchema = z.object({
  prompt: z.string().min(1, { message: 'Prompt cannot be empty.' }),
  context: z.string().optional(),
  tags: z.array(z.string()).optional(),
  provider: z.enum(['codex', 'gemini']).optional().default('codex'),
  model: z.string().optional(),
});

class RefinePromptTool implements Tool<typeof RefinePromptInputSchema, RefinedPrompt> {
  public readonly inputSchema = RefinePromptInputSchema;
  public readonly name = 'refine_prompt';
  public readonly description = 'Refines a raw user prompt into a structured JSON object using a selected AI provider and model.';

  public async execute(input: ToolInput<this>): Promise<ToolOutput<this>> {
    try {
      // The provider and model are now part of the input.
      const { prompt, context, provider, model } = input;
      
      const refinedOutput = await refineWithAI(provider, model, prompt, context);

      return refinedOutput;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`Error in RefinePromptTool with provider '${input.provider}' and model '${input.model || 'default'}': ${errorMessage}`);
      throw new Error(`Failed to refine prompt: ${errorMessage}`);
    }
  }
}

function main() {
  if (process.env.USE_MOCK_AI === 'true') {
      console.warn("--- Running in MOCK mode. Real AI CLIs will not be called. ---");
  }

  const server = new MCPServer({
    name: 'prompt-engineer-mcp',
    version: '0.3.0', // Incremented version
    description: 'A server that provides prompt engineering and refinement tools via multiple AI providers and models.',
  });

  server.registerTool(new RefinePromptTool());
  server.listen();
  console.error('Prompt Engineer MCP server started and listening on stdio.');
}

main();
