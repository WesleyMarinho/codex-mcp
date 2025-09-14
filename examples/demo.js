#!/usr/bin/env node

/**
 * Demonstration script showing the Prompt Engineer MCP Server output
 * This script shows what the refined prompts look like
 */

const { runCodexCLI } = require('../dist/codex.js');

const examples = [
  {
    title: "CSV to PostgreSQL ETL Script",
    input: {
      prompt: "Quero um script que leia CSV e grave no Postgres com validação",
      context: "Sistema de ETL para dados financeiros críticos",
      tags: ["etl", "postgres"]
    }
  },
  {
    title: "React Dashboard Development", 
    input: {
      prompt: "Criar um dashboard em React para mostrar métricas",
      context: "Aplicação web para monitoramento de vendas",
      tags: ["react", "frontend"]
    }
  },
  {
    title: "REST API for User Management",
    input: {
      prompt: "Desenvolver API REST para gerenciar usuários com autenticação",
      context: "Sistema corporativo com JWT e roles",
      tags: ["api", "jwt", "security"]
    }
  }
];

async function demonstratePromptRefinement() {
  console.log('🎯 Prompt Engineer MCP Server - Demonstration');
  console.log('=' .repeat(80));
  console.log('This demonstrates how the server refines prompts with structured output.\n');

  for (const example of examples) {
    console.log(`📋 ${example.title}`);
    console.log('-' .repeat(50));
    console.log(`💭 Original Prompt: "${example.input.prompt}"`);
    
    if (example.input.context) {
      console.log(`🔍 Context: ${example.input.context}`);
    }
    
    if (example.input.tags) {
      console.log(`🏷️  Input Tags: ${example.input.tags.join(', ')}`);
    }
    
    try {
      const result = await runCodexCLI(example.input);
      
      console.log('\n✨ REFINED OUTPUT:');
      console.log(`📝 Improved Prompt:\n   "${result.improvedPrompt}"\n`);
      console.log(`💡 Rationale:\n   ${result.rationale}\n`);
      console.log(`⚠️  Identified Risks:`);
      result.risks.forEach(risk => console.log(`   • ${risk}`));
      
      console.log(`\n🏷️  Suggested Tags: ${result.tags.join(', ')}`);
      
      console.log(`\n📊 Structured Metadata:`);
      console.log(`   📋 Sections: ${result.metadata.sections.join(' → ')}`);
      console.log(`   ✅ Acceptance Criteria:`);
      result.metadata.acceptanceCriteria.forEach(criteria => {
        console.log(`      • ${criteria}`);
      });
      console.log(`   📝 Implementation Checklist:`);
      result.metadata.checklist.forEach(item => {
        console.log(`      • ${item}`);
      });
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '=' .repeat(80) + '\n');
  }
  
  console.log('🎊 Demonstration complete!');
  console.log('\n💡 Key Features Demonstrated:');
  console.log('   • Prompt enhancement with structured output');
  console.log('   • Risk identification and mitigation suggestions');
  console.log('   • Automatic tag generation based on content');
  console.log('   • Template-based metadata with acceptance criteria');
  console.log('   • Implementation checklists for actionable next steps');
  console.log('   • Graceful fallback when external LLM unavailable');
  
  console.log('\n🔧 Ready for Integration:');
  console.log('   • Works with VSCode, Trae, Cursor, and Claude Desktop');
  console.log('   • Stdio-based MCP protocol for seamless IDE integration');
  console.log('   • Portuguese user responses, English code/comments');
  console.log('   • Modular architecture for easy extensibility');
}

demonstratePromptRefinement().catch(console.error);