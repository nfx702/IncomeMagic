#!/usr/bin/env ts-node

/**
 * /sc:spawn CLI Interface
 * Task orchestration command-line interface for complex task decomposition and execution
 * 
 * Usage:
 * npm run spawn "complex task description" --parallel --validate
 */

import { TaskOrchestrator, OrchestrationConfig } from '../src/utils/taskOrchestrator';

interface CLIArgs {
  task: string;
  sequential: boolean;
  parallel: boolean;
  validate: boolean;
  dryRun: boolean;
  maxParallel: number;
  timeout: number;
  continueOnError: boolean;
  verbose: boolean;
}

class SpawnCLI {
  private parseArgs(): CLIArgs {
    const args = process.argv.slice(2);
    
    // First argument is the task description
    const task = args.find(arg => !arg.startsWith('--')) || '';
    
    // Parse flags
    const hasFlag = (flag: string) => args.includes(`--${flag}`);
    const getFlagValue = (flag: string, defaultValue: string | number) => {
      const flagIndex = args.findIndex(arg => arg === `--${flag}`);
      if (flagIndex !== -1 && args[flagIndex + 1] && !args[flagIndex + 1].startsWith('--')) {
        const value = args[flagIndex + 1];
        return typeof defaultValue === 'number' ? parseInt(value) : value;
      }
      return defaultValue;
    };

    return {
      task,
      sequential: hasFlag('sequential'),
      parallel: hasFlag('parallel'),
      validate: hasFlag('validate'),
      dryRun: hasFlag('dry-run'),
      maxParallel: getFlagValue('max-parallel', 3) as number,
      timeout: getFlagValue('timeout', 60) as number,
      continueOnError: hasFlag('continue-on-error'),
      verbose: hasFlag('verbose') || hasFlag('v')
    };
  }

  private printHelp() {
    console.log(`
/sc:spawn - Task Orchestration System

Usage:
  npm run spawn "complex task description" [options]

Arguments:
  task-description       Complex task or project to orchestrate

Options:
  --sequential          Execute tasks in dependency order (default)
  --parallel            Execute independent tasks concurrently
  --validate            Enable quality checkpoints between tasks
  --dry-run             Show execution plan without running tasks
  --max-parallel <n>    Maximum parallel tasks (default: 3)
  --timeout <min>       Task timeout in minutes (default: 60)
  --continue-on-error   Continue execution even if tasks fail
  --verbose, -v         Detailed execution logging

Execution Strategies:
  sequential            Tasks executed in strict dependency order
  parallel              All independent tasks run simultaneously
  hybrid               Parallel clusters, sequential within clusters (auto-selected)

Examples:
  npm run spawn "Implement ML forecasting models with ARIMA, LSTM, and Prophet" --validate
  npm run spawn "Refactor dashboard components for better performance" --parallel --dry-run
  npm run spawn "Create comprehensive analytics dashboard" --validate --verbose
  npm run spawn "Implement real-time trading alerts system" --sequential --timeout 120

Income Magic Specific Examples:
  npm run spawn "Complete ML-based income forecasting implementation" --validate
  npm run spawn "Enhance all dashboard widgets with real-time data" --parallel
  npm run spawn "Implement comprehensive testing suite for all services" --sequential
  npm run spawn "Create advanced portfolio analytics with risk metrics" --validate --verbose
`);
  }

  private validateArgs(args: CLIArgs): string[] {
    const errors: string[] = [];

    if (!args.task.trim()) {
      errors.push('Task description is required');
    }

    if (args.parallel && args.sequential) {
      errors.push('Cannot specify both --parallel and --sequential');
    }

    if (args.maxParallel < 1 || args.maxParallel > 10) {
      errors.push('Max parallel tasks must be between 1 and 10');
    }

    if (args.timeout < 1 || args.timeout > 480) {
      errors.push('Timeout must be between 1 and 480 minutes');
    }

    return errors;
  }

  private createConfig(args: CLIArgs): OrchestrationConfig {
    let strategy: 'sequential' | 'parallel' | 'hybrid' = 'hybrid';
    
    if (args.sequential) {
      strategy = 'sequential';
    } else if (args.parallel) {
      strategy = 'parallel';
    }

    return {
      strategy,
      validate: args.validate,
      maxParallelTasks: args.maxParallel,
      timeoutMinutes: args.timeout,
      continueOnError: args.continueOnError,
      dryRun: args.dryRun
    };
  }

  private formatDuration(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  private printExecutionPlan(orchestrator: TaskOrchestrator, plan: any) {
    console.log('📋 Execution Plan:');
    console.log(`   Strategy: ${plan.executionStrategy}`);
    console.log(`   Complexity: ${plan.complexity}`);
    console.log(`   Total Duration: ${Math.round(plan.totalEstimatedDuration / 60)} hours`);
    console.log(`   Clusters: ${plan.clusters.length}`);
    console.log(`   Total Tasks: ${plan.clusters.reduce((sum: number, c: any) => sum + c.tasks.length, 0)}`);
    
    if (plan.riskFactors.length > 0) {
      console.log(`   Risk Factors: ${plan.riskFactors.length}`);
    }
    
    console.log('');

    // Show clusters and tasks
    plan.clusters.forEach((cluster: any, index: number) => {
      const parallelIcon = cluster.parallelizable ? '⚡' : '➡️';
      const criticalIcon = cluster.criticalPath ? '🔥' : '';
      
      console.log(`${parallelIcon} Cluster ${index + 1}: ${cluster.title} ${criticalIcon}`);
      console.log(`   ${cluster.description}`);
      
      cluster.tasks.forEach((task: any, taskIndex: number) => {
        const duration = Math.round(task.estimatedDuration / 60 * 10) / 10; // Round to 1 decimal
        const deps = task.dependencies.length > 0 ? ` (deps: ${task.dependencies.length})` : '';
        
        console.log(`   ${taskIndex + 1}. ${task.title} - ${duration}h${deps}`);
        
        if (task.requirements.length > 0) {
          console.log(`      Requirements: ${task.requirements.join(', ')}`);
        }
      });
      console.log('');
    });

    // Show critical path
    if (plan.criticalPath.length > 0) {
      console.log(`🔥 Critical Path: ${plan.criticalPath.length} tasks`);
      console.log('');
    }

    // Show risk factors
    if (plan.riskFactors.length > 0) {
      console.log('⚠️  Risk Factors:');
      plan.riskFactors.forEach((risk: string) => {
        console.log(`   • ${risk}`);
      });
      console.log('');
    }
  }

  private printExecutionResults(results: Map<string, any>, summary: any) {
    console.log('📊 Execution Results:');
    console.log(`   Total Tasks: ${summary.totalTasks}`);
    console.log(`   Completed: ${summary.completed} ✅`);
    
    if (summary.failed > 0) {
      console.log(`   Failed: ${summary.failed} ❌`);
    }
    
    console.log(`   Duration: ${this.formatDuration(summary.duration)}`);
    console.log(`   Success Rate: ${Math.round((summary.completed / summary.totalTasks) * 100)}%`);
    console.log('');

    // Show failed tasks if any
    const failedResults = Array.from(results.values()).filter((r: any) => !r.success);
    if (failedResults.length > 0) {
      console.log('❌ Failed Tasks:');
      failedResults.forEach((result: any) => {
        console.log(`   • ${result.taskId}: ${result.errors.join(', ')}`);
      });
      console.log('');
    }

    // Show performance summary
    const durations = Array.from(results.values()).map((r: any) => r.duration);
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`⚡ Average Task Duration: ${this.formatDuration(avgDuration)}`);
    }
  }

  public async run() {
    const args = this.parseArgs();

    // Show help if no arguments
    if (process.argv.length <= 2 || args.task.includes('help') || args.task.includes('--help')) {
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

    // Create orchestrator
    const config = this.createConfig(args);
    const orchestrator = new TaskOrchestrator(config);

    console.log('🚀 Starting task orchestration...');
    console.log(`📋 Task: ${args.task}`);
    console.log(`🎯 Strategy: ${config.strategy}`);
    console.log(`🔍 Validation: ${config.validate ? 'enabled' : 'disabled'}`);
    
    if (config.dryRun) {
      console.log('🏃‍♂️ Mode: Dry run (simulation only)');
    }
    
    console.log('');

    try {
      // Execute orchestration
      const result = await orchestrator.orchestrate(args.task);
      
      // Show execution plan
      if (args.verbose || config.dryRun) {
        this.printExecutionPlan(orchestrator, result.plan);
      }
      
      // Show results
      this.printExecutionResults(result.results, result.summary);
      
      // Success message
      if (result.summary.success) {
        console.log('🎉 Task orchestration completed successfully!');
      } else {
        console.log('⚠️  Task orchestration completed with some failures');
      }
      
      // Next steps
      console.log('\n🎯 Next Steps:');
      if (config.dryRun) {
        console.log('1. Review the execution plan');
        console.log('2. Run without --dry-run to execute tasks');
        console.log('3. Monitor progress and validate results');
      } else {
        console.log('1. Review execution results');
        console.log('2. Address any failed tasks if needed');
        console.log('3. Validate final outcomes');
        
        if (result.summary.failed > 0) {
          console.log('4. Re-run failed tasks with adjusted configuration');
        }
      }
      
    } catch (error) {
      console.error('❌ Orchestration failed:', error);
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new SpawnCLI();
  cli.run().catch(error => {
    console.error('❌ CLI error:', error);
    process.exit(1);
  });
}

export { SpawnCLI };