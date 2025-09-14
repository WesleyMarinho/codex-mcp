import { spawn } from 'child_process';
import { z } from 'zod';
import { templateManager, type RefinedPromptOutput } from './templates.js';

/**
 * Codex CLI integration for GPT-5 prompt refinement
 */

// Validation schema for Codex CLI output
const CodexOutputSchema = z.object({
  improvedPrompt: z.string(),
  rationale: z.string(),
  risks: z.array(z.string()),
  tags: z.array(z.string()),
  metadata: z.object({
    sections: z.array(z.string()),
    acceptanceCriteria: z.array(z.string()),
    checklist: z.array(z.string())
  })
});

export interface CodexRequest {
  prompt: string;
  context?: string;
  tags?: string[];
  model?: string;
}

export class CodexCLIError extends Error {
  constructor(message: string, public readonly code?: number) {
    super(message);
    this.name = 'CodexCLIError';
  }
}

/**
 * Runs Codex CLI with GPT-5 to refine prompts
 */
export async function runCodexCLI(request: CodexRequest): Promise<RefinedPromptOutput> {
  const { prompt, context, tags, model = 'gpt-5' } = request;
  
  try {
    // Prepare the system prompt with context
    const systemPrompt = templateManager.formatSystemPrompt(context);
    
    // Build the full prompt for Codex
    const fullPrompt = buildPromptForCodex(prompt, context, tags);
    
    // Execute Codex CLI
    const codexOutput = await executeCodexCommand(model, systemPrompt, fullPrompt);
    
    // Try to parse JSON output first
    let result = tryParseJSONOutput(codexOutput);
    
    // If JSON parsing fails, create structured fallback
    if (!result) {
      result = createFallbackOutput(prompt, codexOutput, context, tags);
    }
    
    // Validate and enrich the output
    return enrichOutput(result, prompt);
    
  } catch (error) {
    console.error('Codex CLI execution failed:', error);
    
    // Return fallback response on error
    return createErrorFallbackOutput(prompt, error as Error, context, tags);
  }
}

/**
 * Builds the structured prompt to send to Codex CLI
 */
function buildPromptForCodex(
  prompt: string, 
  context?: string, 
  tags?: string[]
): string {
  let fullPrompt = `PROMPT TO REFINE:\n"${prompt}"\n\n`;
  
  if (context) {
    fullPrompt += `ADDITIONAL CONTEXT:\n${context}\n\n`;
  }
  
  if (tags && tags.length > 0) {
    fullPrompt += `SUGGESTED TAGS: ${tags.join(', ')}\n\n`;
  }
  
  fullPrompt += `Please refine this prompt and respond with ONLY a valid JSON object matching this exact structure:
{
  "improvedPrompt": "Your refined version of the prompt",
  "rationale": "Explanation of changes made and reasoning",
  "risks": ["Array of potential risks or issues"],
  "tags": ["Array of relevant tags"],
  "metadata": {
    "sections": ["Plan", "Risks", "Next actions", "Tests"],
    "acceptanceCriteria": ["Specific measurable outcomes"],
    "checklist": ["Actionable verification steps"]
  }
}`;
  
  return fullPrompt;
}

/**
 * Executes the Codex CLI command
 */
function executeCodexCommand(
  model: string, 
  systemPrompt: string, 
  userPrompt: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['chat', '-m', model];
    
    const codexProcess = spawn('codex', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    codexProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    codexProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    codexProcess.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new CodexCLIError(
          `Codex CLI failed with exit code ${code}: ${stderr}`, 
          code || undefined
        ));
      }
    });
    
    codexProcess.on('error', (error) => {
      reject(new CodexCLIError(`Failed to spawn Codex CLI: ${error.message}`));
    });
    
    // Send the input to Codex CLI
    const input = `${systemPrompt}\n\nUser: ${userPrompt}`;
    codexProcess.stdin.write(input);
    codexProcess.stdin.end();
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      codexProcess.kill('SIGTERM');
      reject(new CodexCLIError('Codex CLI operation timed out'));
    }, 30000); // 30 second timeout
    
    codexProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Attempts to parse JSON output from Codex CLI
 */
function tryParseJSONOutput(output: string): RefinedPromptOutput | null {
  try {
    // Extract JSON from output (in case there's additional text)
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }
    
    const parsedOutput = JSON.parse(jsonMatch[0]);
    
    // Validate against schema
    const validated = CodexOutputSchema.parse(parsedOutput);
    return validated as RefinedPromptOutput;
    
  } catch (error) {
    console.warn('Failed to parse Codex CLI JSON output:', error);
    return null;
  }
}

/**
 * Creates a structured fallback when JSON parsing fails
 */
function createFallbackOutput(
  originalPrompt: string,
  codexOutput: string,
  _context?: string,
  tags?: string[]
): RefinedPromptOutput {
  const template = templateManager.detectTemplate(originalPrompt);
  const suggestedTags = templateManager.suggestTags(originalPrompt);
  const identifiedRisks = templateManager.identifyRisks(originalPrompt);
  
  // Try to extract improved prompt from Codex output
  let improvedPrompt = originalPrompt;
  const lines = codexOutput.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    // Use the first substantial line as improved prompt
    improvedPrompt = lines.find(line => line.length > originalPrompt.length * 0.8) || 
                    lines[0] || 
                    originalPrompt;
  }
  
  return {
    improvedPrompt: improvedPrompt,
    rationale: "Prompt refinado utilizando template padrão devido a limitações na saída do Codex CLI.",
    risks: identifiedRisks.length > 0 ? identifiedRisks : ["Verificar implementação cuidadosamente"],
    tags: [...suggestedTags, ...(tags || [])].slice(0, 8), // Limit to 8 tags
    metadata: templateManager.getTemplateMetadata(template)
  };
}

/**
 * Creates error fallback output when Codex CLI completely fails
 */
function createErrorFallbackOutput(
  originalPrompt: string,
  error: Error,
  _context?: string,
  tags?: string[]
): RefinedPromptOutput {
  const template = templateManager.detectTemplate(originalPrompt);
  const suggestedTags = templateManager.suggestTags(originalPrompt);
  const identifiedRisks = templateManager.identifyRisks(originalPrompt);
  
  return {
    improvedPrompt: `${originalPrompt}\n\n[NOTA: Prompt processado em modo offline devido a erro no Codex CLI]`,
    rationale: `Não foi possível conectar com o Codex CLI (${error.message}). Utilizando análise local baseada em templates.`,
    risks: [
      "Codex CLI indisponível - usando análise offline",
      ...identifiedRisks
    ],
    tags: ['fallback', 'offline', ...suggestedTags, ...(tags || [])].slice(0, 8),
    metadata: templateManager.getTemplateMetadata(template)
  };
}

/**
 * Enriches the output with additional context and validation
 */
function enrichOutput(
  result: RefinedPromptOutput, 
  originalPrompt: string
): RefinedPromptOutput {
  // Ensure we have minimum required content
  if (!result.improvedPrompt || result.improvedPrompt.trim() === '') {
    result.improvedPrompt = originalPrompt;
  }
  
  if (!result.rationale || result.rationale.trim() === '') {
    result.rationale = "Prompt processado com refinamento automático.";
  }
  
  // Ensure we have at least one risk
  if (!result.risks || result.risks.length === 0) {
    result.risks = ["Validar implementação cuidadosamente"];
  }
  
  // Ensure we have at least one tag
  if (!result.tags || result.tags.length === 0) {
    result.tags = templateManager.suggestTags(originalPrompt);
  }
  
  // Validate metadata structure
  if (!result.metadata.sections || result.metadata.sections.length === 0) {
    result.metadata.sections = ["Plan", "Risks", "Next actions", "Tests"];
  }
  
  if (!result.metadata.acceptanceCriteria || result.metadata.acceptanceCriteria.length === 0) {
    result.metadata.acceptanceCriteria = [
      "Solução implementada corretamente",
      "Testes executados com sucesso",
      "Documentação atualizada"
    ];
  }
  
  if (!result.metadata.checklist || result.metadata.checklist.length === 0) {
    result.metadata.checklist = [
      "Revisar requisitos",
      "Implementar solução",
      "Executar testes",
      "Validar resultado"
    ];
  }
  
  return result;
}

/**
 * Tests if Codex CLI is available in the system
 */
export async function testCodexAvailability(): Promise<boolean> {
  try {
    await executeCodexCommand('gpt-5', 'Test system availability.', 'Hello');
    return true;
  } catch (error) {
    console.warn('Codex CLI not available:', error);
    return false;
  }
}