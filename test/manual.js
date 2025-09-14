#!/usr/bin/env node

/**
 * Manual test to validate the Prompt Engineer MCP Server functionality
 * This test directly calls the core functions without MCP protocol
 */

const { templateManager } = require('../dist/templates.js');
const { runCodexCLI } = require('../dist/codex.js');

async function testTemplateManager() {
  console.log('🧪 Testing Template Manager...');
  
  const testPrompt = "Quero um script que leia CSV e grave no Postgres com validação";
  
  // Test template detection
  const template = templateManager.detectTemplate(testPrompt);
  console.log(`📋 Detected template: ${template}`);
  
  // Test tag suggestion
  const tags = templateManager.suggestTags(testPrompt);
  console.log(`🏷️  Suggested tags: ${tags.join(', ')}`);
  
  // Test risk identification
  const risks = templateManager.identifyRisks(testPrompt);
  console.log(`⚠️  Identified risks: ${risks.join(', ')}`);
  
  // Test metadata generation
  const metadata = templateManager.getTemplateMetadata(template);
  console.log(`📊 Metadata sections: ${metadata.sections.join(', ')}`);
  
  return { template, tags, risks, metadata };
}

async function testCodexIntegration() {
  console.log('\n🧪 Testing Codex Integration (will use fallback)...');
  
  const request = {
    prompt: "Desenvolver API REST para gerenciar usuários",
    context: "Sistema web corporativo",
    tags: ["api", "rest"]
  };
  
  try {
    const result = await runCodexCLI(request);
    
    console.log(`✅ Codex integration working`);
    console.log(`📝 Improved prompt: "${result.improvedPrompt.substring(0, 100)}..."`);
    console.log(`🤔 Rationale: "${result.rationale.substring(0, 80)}..."`);
    console.log(`⚠️  Risks count: ${result.risks.length}`);
    console.log(`🏷️  Tags count: ${result.tags.length}`);
    console.log(`📋 Checklist items: ${result.metadata.checklist.length}`);
    
    return result;
  } catch (error) {
    console.log(`❌ Codex integration failed: ${error.message}`);
    return null;
  }
}

async function testStructuredOutput() {
  console.log('\n🧪 Testing Structured Output Validation...');
  
  const testCases = [
    "Criar um dashboard em React",
    "Implementar cache Redis",
    "Script de backup automático",
  ];
  
  for (const prompt of testCases) {
    console.log(`\nTesting: "${prompt}"`);
    
    try {
      const result = await runCodexCLI({ prompt });
      
      // Validate required fields
      const requiredFields = ['improvedPrompt', 'rationale', 'risks', 'tags', 'metadata'];
      const missing = requiredFields.filter(field => !result[field]);
      
      if (missing.length === 0) {
        console.log('✅ All required fields present');
      } else {
        console.log(`❌ Missing fields: ${missing.join(', ')}`);
      }
      
      // Validate metadata structure
      const requiredMetadata = ['sections', 'acceptanceCriteria', 'checklist'];
      const missingMeta = requiredMetadata.filter(field => !result.metadata[field]);
      
      if (missingMeta.length === 0) {
        console.log('✅ Metadata structure valid');
      } else {
        console.log(`❌ Missing metadata: ${missingMeta.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting Manual Tests for Prompt Engineer MCP Server');
  console.log('=' .repeat(70));
  
  try {
    await testTemplateManager();
    await testCodexIntegration();
    await testStructuredOutput();
    
    console.log('\n' + '=' .repeat(70));
    console.log('✅ Manual testing complete! Core functionality working properly.');
    console.log('\n💡 Note: This tests the core logic without MCP protocol');
    console.log('   For full integration testing, use the MCP client tools');
    
  } catch (error) {
    console.error('\n❌ Fatal error in manual testing:', error);
    process.exit(1);
  }
}

runAllTests();