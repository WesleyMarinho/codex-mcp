#!/usr/bin/env node

/**
 * Test script for the Prompt Engineer MCP Server
 * Demonstrates the refine_prompt tool functionality
 */

const { spawn } = require('child_process');
const path = require('path');

// Test cases
const testCases = [
  {
    name: "CSV to PostgreSQL Script",
    prompt: "Quero um script que leia CSV e grave no Postgres com validação",
    context: "Sistema de ETL para dados financeiros críticos",
    tags: ["etl", "postgres", "validação"]
  },
  {
    name: "Simple Python Function",
    prompt: "Criar uma função Python para calcular média",
    context: undefined,
    tags: ["python", "matemática"]
  },
  {
    name: "REST API Development",
    prompt: "Desenvolver API REST para gerenciar usuários",
    context: "Sistema web corporativo com autenticação JWT",
    tags: ["api", "rest", "usuários", "jwt"]
  }
];

async function runTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`Input prompt: "${testCase.prompt}"`);
  
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    server.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    server.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    server.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse MCP response
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          const response = lines[lines.length - 1];
          const result = JSON.parse(response);
          
          console.log('✅ Test successful');
          console.log(`📝 Improved prompt preview: "${result.content[0].text.substring(0, 100)}..."`);
          
          // Parse the actual refinement result
          const refinedData = JSON.parse(result.content[0].text);
          console.log(`🏷️  Tags: ${refinedData.tags?.join(', ') || 'N/A'}`);
          console.log(`⚠️  Risks identified: ${refinedData.risks?.length || 0}`);
          console.log(`📋 Checklist items: ${refinedData.metadata?.checklist?.length || 0}`);
          
          resolve(result);
        } catch (error) {
          console.log('❌ Failed to parse result:', error.message);
          console.log('Raw output:', stdout);
          reject(error);
        }
      } else {
        console.log('❌ Server failed with exit code:', code);
        console.log('Stderr:', stderr);
        reject(new Error(`Server failed with code ${code}`));
      }
    });

    server.on('error', (error) => {
      console.log('❌ Failed to start server:', error.message);
      reject(error);
    });

    // Send MCP request
    const mcpRequest = {
      method: "tools/call",
      params: {
        name: "refine_prompt",
        arguments: {
          prompt: testCase.prompt,
          ...(testCase.context && { context: testCase.context }),
          ...(testCase.tags && { tags: testCase.tags })
        }
      }
    };

    server.stdin.write(JSON.stringify(mcpRequest) + '\n');
    server.stdin.end();

    // Set timeout
    setTimeout(() => {
      server.kill('SIGTERM');
      reject(new Error('Test timed out'));
    }, 10000);
  });
}

async function runAllTests() {
  console.log('🚀 Starting Prompt Engineer MCP Server Tests');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      await runTest(testCase);
      passed++;
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('✨ Prompt Engineer MCP Server testing complete!');
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Check if server is built
const fs = require('fs');
const serverPath = path.join(__dirname, '..', 'dist', 'server.js');

if (!fs.existsSync(serverPath)) {
  console.log('❌ Server not built. Run "npm run build" first.');
  process.exit(1);
}

runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});