// src/ai-providers.ts
// This module handles interaction with external AI command-line tools.

import { spawn } from 'child_process';
import { getAIMasterPrompt } from './templates';
import { z } from 'zod';

// Define the Zod schema for the expected JSON output from the AI CLIs.
const RefinedPromptSchema = z.object({
  improvedPrompt: z.string(),
  rationale: z.string(),
  risks: z.array(z.string()),
  tags: z.array(z.string()),
  metadata: z.object({
    sections: z.array(z.string()),
    acceptanceCriteria: z.array(z.string()),
    checklist: z.array(z.string()),
  }),
});

export type RefinedPrompt = z.infer<typeof RefinedPromptSchema>;
export type AIProvider = 'codex' | 'gemini';

/**
 * A mock response used for development and testing when AI CLIs are not available.
 */
const mockResponse: RefinedPrompt = {
    improvedPrompt:
      "Create a robust Node.js script that reads data from a CSV file named 'input.csv'. The script must validate each row against a predefined schema (e.g., 'id' is a number, 'email' is a valid email format). Valid rows should be inserted into a PostgreSQL table named 'customers'. Invalid rows should be logged to a file named 'error.log' with clear error messages. The database connection details should be configurable via environment variables (PG_HOST, PG_USER, PG_PASSWORD, PG_DATABASE).",
    rationale:
      "The original prompt was vague. This version specifies file names, validation rules, error handling, and configuration methods, making it an actionable and complete task for an AI or developer.",
    risks: [
      'The CSV file might be very large, potentially causing memory issues. Consider stream processing.',
      'Database credentials will be used; ensure they are handled securely and not hard-coded.',
      'The script assumes the PostgreSQL table `customers` already exists with the correct schema.',
    ],
    tags: ['nodejs', 'csv', 'postgres', 'validation', 'etl'],
    metadata: {
      sections: ['CSV Parsing', 'Data Validation', 'Database Insertion', 'Error Logging', 'Configuration'],
      acceptanceCriteria: [
        'The script runs without errors given a valid `input.csv` and database connection.',
        'All valid rows from `input.csv` are present in the `customers` table.',
        'All invalid rows are logged with specific reasons in `error.log`.',
        'No database credentials are visible in the source code.',
      ],
      checklist: [
        '1. Implement a function to read and parse `input.csv` row by row.',
        '2. Define a validation schema for the CSV data.',
        '3. Create a function to validate a single row against the schema.',
        '4. Set up a connection to the PostgreSQL database using environment variables.',
        '5. Write a function to insert a valid data row into the `customers` table.',
        '6. Implement a logging mechanism to write errors to `error.log`.',
        '7. Combine all parts in a main function that orchestrates the ETL process.',
      ],
    },
  };

/**
 * Executes a command-line AI tool to refine a prompt.
 * @param provider The AI provider to use ('codex' or 'gemini').
 * @param model The specific model to use (e.g., 'gpt-5', 'gemini-1.5-pro').
 * @param rawPrompt The user's original prompt.
 * @param context Optional additional context.
 * @returns A promise that resolves to the structured, refined prompt object.
 */
export async function refineWithAI(provider: AIProvider, model: string | undefined, rawPrompt: string, context?: string): Promise<RefinedPrompt> {
  if (process.env.USE_MOCK_AI === 'true') {
    console.warn(`--- MOCK MODE: Simulating AI response for provider: ${provider}, model: ${model || 'default'} ---`);
    return Promise.resolve(mockResponse);
  }

  const masterPrompt = getAIMasterPrompt(rawPrompt, context);
  
  let command: string;
  let args: string[];

  // Configure command and arguments based on the selected provider and model
  switch (provider) {
    case 'gemini':
      command = 'gemini'; // Assuming 'gemini' is the CLI command
      args = ['chat', '-m', model || 'gemini-pro', '--format', 'json']; // Use provided model or default to 'gemini-pro'
      break;
    case 'codex':
    default:
      command = 'codex';
      args = ['chat', '-m', model || 'gpt-5', '--format', 'json']; // Use provided model or default to 'gpt-5'
      break;
  }

  console.error(`Executing AI provider: ${command} with args: ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`${command} CLI exited with code ${code}: ${stderr}`));
      }
      try {
        // Attempt to find a JSON block in the output, in case the CLI adds extra text
        const jsonMatch = stdout.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
        if (!jsonMatch) {
          throw new Error("No JSON object found in the output.");
        }
        const jsonString = jsonMatch[1] || jsonMatch[2];

        const parsedJson = JSON.parse(jsonString);
        const validationResult = RefinedPromptSchema.safeParse(parsedJson);
        if (!validationResult.success) {
          return reject(new Error(`${command} CLI output failed validation: ${validationResult.error.message}`));
        }
        resolve(validationResult.data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        reject(new Error(`Failed to parse ${command} CLI output as JSON. Error: ${errorMessage}. Raw output: ${stdout}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start ${command} CLI. Is it installed and in your PATH? Error: ${err.message}`));
    });

    child.stdin.write(masterPrompt);
    child.stdin.end();
  });
}
