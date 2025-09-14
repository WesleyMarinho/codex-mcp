import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

/**
 * Template and rule management for prompt engineering
 */

export interface PromptRules {
  system_prompts: {
    main_refiner: string;
  };
  templates: {
    [key: string]: {
      prompt_prefix: string;
      sections: string[];
    };
  };
  risk_categories: string[];
  common_tags: string[];
}

export interface PromptMetadata {
  sections: string[];
  acceptanceCriteria: string[];
  checklist: string[];
}

export interface RefinedPromptOutput {
  improvedPrompt: string;
  rationale: string;
  risks: string[];
  tags: string[];
  metadata: PromptMetadata;
}

class TemplateManager {
  private rules: PromptRules = this.getDefaultRules();

  constructor() {
    this.loadRules();
  }

  private loadRules(): void {
    try {
      const rulesPath = join(__dirname, '..', 'rules', 'prompt_rules.yaml');
      const rulesContent = readFileSync(rulesPath, 'utf8');
      this.rules = YAML.parse(rulesContent);
    } catch (error) {
      console.error('Failed to load prompt rules:', error);
      this.rules = this.getDefaultRules();
    }
  }

  private getDefaultRules(): PromptRules {
    return {
      system_prompts: {
        main_refiner: `You are an expert prompt engineer. Analyze and improve the given prompt with structured output in JSON format.`
      },
      templates: {
        software_development: {
          prompt_prefix: "Como um desenvolvedor sênior experiente, ",
          sections: ["Análise de Requisitos", "Arquitetura Proposta", "Implementação", "Testes", "Documentação"]
        }
      },
      risk_categories: ["Segurança", "Performance", "Escalabilidade"],
      common_tags: ["desenvolvimento", "automação", "dados"]
    };
  }

  /**
   * Gets the main system prompt for prompt refinement
   */
  getSystemPrompt(): string {
    return this.rules.system_prompts.main_refiner;
  }

  /**
   * Detects the most appropriate template based on prompt content
   */
  detectTemplate(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // Simple keyword-based detection
    if (lowerPrompt.includes('script') || lowerPrompt.includes('código') || 
        lowerPrompt.includes('desenvolv') || lowerPrompt.includes('program')) {
      return 'software_development';
    }
    
    if (lowerPrompt.includes('dados') || lowerPrompt.includes('csv') || 
        lowerPrompt.includes('database') || lowerPrompt.includes('postgres')) {
      return 'data_processing';
    }
    
    return 'software_development'; // Default template
  }

  /**
   * Gets template-specific metadata and structure
   */
  getTemplateMetadata(templateName: string): PromptMetadata {
    const template = this.rules.templates[templateName];
    
    if (!template) {
      return {
        sections: ["Plan", "Risks", "Next actions", "Tests"],
        acceptanceCriteria: ["Funcionalidade implementada corretamente", "Testes passando", "Documentação atualizada"],
        checklist: ["Revisar código", "Executar testes", "Validar requisitos"]
      };
    }

    return {
      sections: template.sections || ["Plan", "Risks", "Next actions", "Tests"],
      acceptanceCriteria: [
        "Solução atende aos requisitos especificados",
        "Código segue padrões de qualidade",
        "Testes validam funcionalidade"
      ],
      checklist: [
        "Implementar solução proposta",
        "Criar testes unitários",
        "Validar com dados de teste",
        "Documentar implementação"
      ]
    };
  }

  /**
   * Suggests relevant tags based on prompt content
   */
  suggestTags(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase();
    const suggestedTags: string[] = [];
    
    for (const tag of this.rules.common_tags) {
      const tagLower = tag.toLowerCase();
      if (lowerPrompt.includes(tagLower) || 
          lowerPrompt.includes(tagLower.replace('ã', 'a')) ||
          lowerPrompt.includes(tagLower.replace('ç', 'c'))) {
        suggestedTags.push(tag);
      }
    }
    
    // Add specific tags based on keywords
    if (lowerPrompt.includes('api') || lowerPrompt.includes('rest') || lowerPrompt.includes('endpoint')) {
      suggestedTags.push('api');
    }
    if (lowerPrompt.includes('test') || lowerPrompt.includes('unit') || lowerPrompt.includes('integration')) {
      suggestedTags.push('testes');
    }
    if (lowerPrompt.includes('performance') || lowerPrompt.includes('otimiz') || lowerPrompt.includes('speed')) {
      suggestedTags.push('performance');
    }
    if (lowerPrompt.includes('script') || lowerPrompt.includes('automat')) {
      suggestedTags.push('automação');
    }
    if (lowerPrompt.includes('csv') || lowerPrompt.includes('postgres') || lowerPrompt.includes('database')) {
      suggestedTags.push('dados');
    }
    if (lowerPrompt.includes('desenvolv') || lowerPrompt.includes('criar') || lowerPrompt.includes('implement')) {
      suggestedTags.push('desenvolvimento');
    }
    
    return [...new Set(suggestedTags)]; // Remove duplicates
  }

  /**
   * Identifies potential risks based on prompt content
   */
  identifyRisks(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase();
    const risks: string[] = [];
    
    // Security risks
    if (lowerPrompt.includes('password') || lowerPrompt.includes('secret') || 
        lowerPrompt.includes('token') || lowerPrompt.includes('auth') || 
        lowerPrompt.includes('login') || lowerPrompt.includes('senha')) {
      risks.push('Dados sensíveis podem estar expostos');
    }
    
    // Performance risks
    if (lowerPrompt.includes('loop') || lowerPrompt.includes('recursão') || 
        lowerPrompt.includes('grande volume') || lowerPrompt.includes('many') ||
        lowerPrompt.includes('milhões') || lowerPrompt.includes('lote')) {
      risks.push('Possível impacto na performance com grandes volumes');
    }
    
    // Data risks
    if (lowerPrompt.includes('database') || lowerPrompt.includes('sql') || 
        lowerPrompt.includes('dados') || lowerPrompt.includes('csv') ||
        lowerPrompt.includes('postgres') || lowerPrompt.includes('validação')) {
      risks.push('Validação de dados de entrada necessária');
    }
    
    // External dependency risks
    if (lowerPrompt.includes('api') || lowerPrompt.includes('external') || 
        lowerPrompt.includes('terceiro') || lowerPrompt.includes('http') ||
        lowerPrompt.includes('rest') || lowerPrompt.includes('endpoint')) {
      risks.push('Dependência de serviços externos pode falhar');
    }
    
    // File system risks
    if (lowerPrompt.includes('arquivo') || lowerPrompt.includes('file') ||
        lowerPrompt.includes('salvar') || lowerPrompt.includes('gravar')) {
      risks.push('Verificar permissões de acesso a arquivos');
    }
    
    // Backup and recovery risks
    if (lowerPrompt.includes('backup') || lowerPrompt.includes('recovery') ||
        lowerPrompt.includes('restore') || lowerPrompt.includes('recuper')) {
      risks.push('Implementar estratégia de recuperação em caso de falha');
    }
    
    return risks.length > 0 ? risks : ['Verificar implementação cuidadosamente'];
  }

  /**
   * Formats the system prompt with context
   */
  formatSystemPrompt(context?: string): string {
    let systemPrompt = this.getSystemPrompt();
    
    if (context) {
      systemPrompt += `\n\nCONTEXT:\n${context}`;
    }
    
    return systemPrompt;
  }
}

export const templateManager = new TemplateManager();