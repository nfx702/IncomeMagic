#!/usr/bin/env ts-node

/**
 * /sc:workflow CLI Interface
 * Command-line interface for generating implementation workflows
 * 
 * Usage:
 * npm run workflow "feature description" --strategy systematic --output detailed
 */

import { WorkflowGenerator, WorkflowFormatter, WorkflowConfig } from '../src/utils/workflowGenerator';

interface CLIArgs {
  feature: string;
  strategy: 'systematic' | 'agile' | 'mvp';
  persona?: 'frontend' | 'backend' | 'architect' | 'security' | 'devops' | 'fullstack';
  output: 'roadmap' | 'tasks' | 'detailed';
  estimate: boolean;
  dependencies: boolean;
  risks: boolean;
  parallel: boolean;
  milestones: boolean;
  c7: boolean;
  sequential: boolean;
  magic: boolean;
  allMcp: boolean;
}

class WorkflowCLI {
  private parseArgs(): CLIArgs {
    const args = process.argv.slice(2);
    
    // First argument is the feature description
    const feature = args.find(arg => !arg.startsWith('--')) || '';
    
    // Parse flags
    const hasFlag = (flag: string) => args.includes(`--${flag}`);
    const getFlagValue = (flag: string, defaultValue: string = '') => {
      const flagIndex = args.findIndex(arg => arg === `--${flag}`);
      return flagIndex !== -1 && args[flagIndex + 1] ? args[flagIndex + 1] : defaultValue;
    };

    return {
      feature,
      strategy: (getFlagValue('strategy', 'systematic') as 'systematic' | 'agile' | 'mvp'),
      persona: getFlagValue('persona') as any,
      output: (getFlagValue('output', 'roadmap') as 'roadmap' | 'tasks' | 'detailed'),
      estimate: hasFlag('estimate'),
      dependencies: hasFlag('dependencies'),
      risks: hasFlag('risks'),
      parallel: hasFlag('parallel'),
      milestones: hasFlag('milestones'),
      c7: hasFlag('c7') || hasFlag('context7'),
      sequential: hasFlag('sequential'),
      magic: hasFlag('magic'),
      allMcp: hasFlag('all-mcp')
    };
  }

  private printHelp() {
    console.log(`
/sc:workflow - Implementation Workflow Generator

Usage:
  npm run workflow "feature description" [options]

Arguments:
  feature-description    Description of the feature to implement

Options:
  --strategy <type>      Workflow strategy: systematic|agile|mvp (default: systematic)
  --persona <type>       Force specific persona: frontend|backend|architect|security|devops
  --output <format>      Output format: roadmap|tasks|detailed (default: roadmap)
  --estimate             Include time and complexity estimates
  --dependencies         Include dependency analysis
  --risks                Include risk assessment
  --parallel             Identify parallel work streams
  --milestones           Create milestone-based phases

MCP Integration:
  --c7, --context7       Enable Context7 for framework patterns
  --sequential           Enable Sequential for complex analysis
  --magic                Enable Magic for UI component planning
  --all-mcp              Enable all MCP servers

Examples:
  npm run workflow "User authentication system" --strategy systematic --dependencies --risks
  npm run workflow "Real-time analytics dashboard" --persona frontend --output detailed --magic
  npm run workflow "ML-based income forecasting" --strategy mvp --estimate --sequential
  npm run workflow "Analog watch component" --persona frontend --magic --output tasks

Income Magic Specific Examples:
  npm run workflow "Patek Philippe analog watch component" --persona frontend --magic --output detailed
  npm run workflow "ARIMA/LSTM forecasting models" --persona backend --sequential --estimate --risks
  npm run workflow "Real-time options trading alerts" --strategy agile --all-mcp --parallel
`);
  }

  private validateArgs(args: CLIArgs): string[] {
    const errors: string[] = [];

    if (!args.feature.trim()) {
      errors.push('Feature description is required');
    }

    if (!['systematic', 'agile', 'mvp'].includes(args.strategy)) {
      errors.push('Strategy must be one of: systematic, agile, mvp');
    }

    if (!['roadmap', 'tasks', 'detailed'].includes(args.output)) {
      errors.push('Output format must be one of: roadmap, tasks, detailed');
    }

    if (args.persona && !['frontend', 'backend', 'architect', 'security', 'devops', 'fullstack'].includes(args.persona)) {
      errors.push('Persona must be one of: frontend, backend, architect, security, devops, fullstack');
    }

    return errors;
  }

  private createConfig(args: CLIArgs): WorkflowConfig {
    return {
      strategy: args.strategy,
      persona: args.persona,
      output: args.output,
      estimate: args.estimate,
      dependencies: args.dependencies,
      risks: args.risks,
      parallel: args.parallel,
      milestones: args.milestones,
      mcpServers: {
        context7: args.c7,
        sequential: args.sequential,
        magic: args.magic,
        allMcp: args.allMcp
      }
    };
  }

  private async generateWorkflow(feature: string, config: WorkflowConfig): Promise<string> {
    // Simulate MCP server integration
    if (config.mcpServers?.context7) {
      console.log('🔗 Integrating with Context7 for framework patterns...');
    }
    if (config.mcpServers?.sequential) {
      console.log('🧠 Enabling Sequential thinking for complex analysis...');
    }
    if (config.mcpServers?.magic) {
      console.log('✨ Activating Magic for UI component planning...');
    }

    const generator = new WorkflowGenerator(config);
    
    // Add context specific to Income Magic application
    const context = {
      existingCodebase: [
        'Next.js 15.4.3 with TypeScript',
        'Tailwind CSS with glassmorphic design system',
        'AlpacaService for market data',
        'Interactive Brokers XML data parsing',
        'Wheel strategy analytics engine',
        'ML forecasting framework'
      ],
      currentArchitecture: 'Next.js app with service-oriented backend, real-time data integration',
      teamSize: 1,
      timeline: 'flexible'
    };

    const workflow = generator.generateWorkflow(feature, context);

    // Format output based on requested format
    switch (config.output) {
      case 'roadmap':
        return WorkflowFormatter.formatAsRoadmap(workflow);
      case 'tasks':
        return WorkflowFormatter.formatAsTasks(workflow);
      case 'detailed':
        return WorkflowFormatter.formatAsDetailed(workflow);
      default:
        return WorkflowFormatter.formatAsRoadmap(workflow);
    }
  }

  public async run() {
    const args = this.parseArgs();

    // Show help if no arguments
    if (process.argv.length <= 2 || args.feature.includes('help') || args.feature.includes('--help')) {
      this.printHelp();
      return;
    }

    // Validate arguments
    const errors = this.validateArgs(args);
    if (errors.length > 0) {
      console.error('❌ Validation errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      console.error('\nUse --help for usage information');
      process.exit(1);
    }

    // Generate workflow
    console.log('🚀 Generating implementation workflow...');
    console.log(`📋 Feature: ${args.feature}`);
    console.log(`🎯 Strategy: ${args.strategy}`);
    console.log(`👤 Persona: ${args.persona || 'auto-detected'}`);
    console.log(`📄 Output: ${args.output}`);
    console.log('');

    try {
      const config = this.createConfig(args);
      const workflow = await this.generateWorkflow(args.feature, config);
      
      console.log('✅ Workflow generated successfully!\n');
      console.log('='.repeat(80));
      console.log(workflow);
      console.log('='.repeat(80));
      
      // Suggest next steps
      console.log('\n🎯 Suggested next steps:');
      console.log('1. Review the generated workflow and adjust as needed');
      console.log('2. Create tasks in your project management tool');
      console.log('3. Set up the development environment');
      console.log('4. Begin with the first phase tasks');
      
      if (config.mcpServers?.context7) {
        console.log('5. Consult Context7 for framework-specific implementation patterns');
      }
      
    } catch (error) {
      console.error('❌ Error generating workflow:', error);
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new WorkflowCLI();
  cli.run().catch(error => {
    console.error('❌ CLI error:', error);
    process.exit(1);
  });
}

export { WorkflowCLI };