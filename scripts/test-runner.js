#!/usr/bin/env node

/**
 * Test Runner Script
 * Orchestrates comprehensive testing pipeline for Income Magic dashboard
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      errorHandling: null,
      performance: null,
      browser: null,
      coverage: null
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      performance: '⚡'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  async runTestSuite(name, command, description) {
    this.log(`Starting ${name} tests: ${description}`, 'info');
    const start = Date.now();

    try {
      await this.runCommand('npm', ['run', command]);
      const duration = Date.now() - start;
      this.results[name] = { status: 'passed', duration };
      this.log(`${name} tests completed in ${duration}ms`, 'success');
      return true;
    } catch (error) {
      const duration = Date.now() - start;
      this.results[name] = { status: 'failed', duration, error: error.message };
      this.log(`${name} tests failed after ${duration}ms: ${error.message}`, 'error');
      return false;
    }
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...', 'info');

    // Check if Node.js version is compatible
    const nodeVersion = process.version;
    this.log(`Node.js version: ${nodeVersion}`, 'info');

    // Check if dependencies are installed
    if (!fs.existsSync('node_modules')) {
      this.log('Installing dependencies...', 'info');
      await this.runCommand('npm', ['ci']);
    }

    // Check if development server is running
    try {
      await new Promise((resolve, reject) => {
        const req = require('http').get('http://localhost:3000', (res) => {
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(1000, () => reject(new Error('Timeout')));
      });
      this.log('Development server is running', 'success');
    } catch (error) {
      this.log('Development server not running - some tests may require it', 'warning');
    }

    this.log('Prerequisites checked', 'success');
  }

  async runUnitTests() {
    return await this.runTestSuite(
      'unit',
      'test:unit',
      'Individual service and utility function validation'
    );
  }

  async runIntegrationTests() {
    return await this.runTestSuite(
      'integration',
      'test:integration',
      'End-to-end data flow between IB and Alpaca services'
    );
  }

  async runErrorHandlingTests() {
    return await this.runTestSuite(
      'errorHandling',
      'test:error-handling',
      'Error resilience and fallback mechanism validation'
    );
  }

  async runPerformanceTests() {
    return await this.runTestSuite(
      'performance',
      'test:performance',
      'Caching, scalability, and performance benchmarks'
    );
  }

  async runBrowserTests() {
    this.log('Starting browser tests: UI functionality and error-free operation', 'info');
    const start = Date.now();

    try {
      // Check if browser test suite exists
      if (!fs.existsSync('browser-test-suite.js')) {
        this.log('Browser test suite not found, skipping', 'warning');
        return true;
      }

      await this.runCommand('npm', ['run', 'test:browser']);
      const duration = Date.now() - start;
      this.results.browser = { status: 'passed', duration };
      this.log(`Browser tests completed in ${duration}ms`, 'success');
      return true;
    } catch (error) {
      const duration = Date.now() - start;
      this.results.browser = { status: 'failed', duration, error: error.message };
      this.log(`Browser tests failed after ${duration}ms: ${error.message}`, 'error');
      return false;
    }
  }

  async generateCoverageReport() {
    this.log('Generating comprehensive coverage report...', 'info');
    const start = Date.now();

    try {
      await this.runCommand('npm', ['run', 'test:coverage']);
      const duration = Date.now() - start;
      this.results.coverage = { status: 'generated', duration };
      this.log(`Coverage report generated in ${duration}ms`, 'success');

      // Parse coverage summary if available
      const summaryPath = path.join('coverage', 'coverage-summary.json');
      if (fs.existsSync(summaryPath)) {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        const total = summary.total;
        
        this.log('Coverage Summary:', 'info');
        this.log(`  Lines: ${total.lines.pct}%`, 'info');
        this.log(`  Functions: ${total.functions.pct}%`, 'info');
        this.log(`  Branches: ${total.branches.pct}%`, 'info');
        this.log(`  Statements: ${total.statements.pct}%`, 'info');

        // Check if coverage meets thresholds
        const meetsThreshold = 
          total.lines.pct >= 75 &&
          total.functions.pct >= 75 &&
          total.branches.pct >= 70 &&
          total.statements.pct >= 75;

        if (meetsThreshold) {
          this.log('Coverage thresholds met!', 'success');
        } else {
          this.log('Coverage thresholds not met', 'warning');
        }
      }

      return true;
    } catch (error) {
      const duration = Date.now() - start;
      this.results.coverage = { status: 'failed', duration, error: error.message };
      this.log(`Coverage generation failed after ${duration}ms: ${error.message}`, 'error');
      return false;
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = Object.values(this.results).filter(r => r && r.status === 'passed').length;
    const failed = Object.values(this.results).filter(r => r && r.status === 'failed').length;

    this.log('═'.repeat(80), 'info');
    this.log('TEST EXECUTION SUMMARY', 'info');
    this.log('═'.repeat(80), 'info');
    
    Object.entries(this.results).forEach(([suite, result]) => {
      if (result) {
        const status = result.status === 'passed' ? '✅' : 
                     result.status === 'failed' ? '❌' : '📊';
        const duration = result.duration ? `(${result.duration}ms)` : '';
        this.log(`${status} ${suite.toUpperCase()}: ${result.status} ${duration}`, 'info');
      }
    });

    this.log('─'.repeat(80), 'info');
    this.log(`Total Duration: ${totalDuration}ms`, 'performance');
    this.log(`Passed: ${passed} | Failed: ${failed}`, 'info');
    
    if (failed === 0) {
      this.log('🎉 ALL TESTS PASSED! Ready for deployment.', 'success');
    } else {
      this.log(`⚠️  ${failed} test suite(s) failed. Review and fix issues.`, 'error');
    }

    this.log('═'.repeat(80), 'info');

    // Write results to file
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      results: this.results,
      summary: { passed, failed, total: passed + failed }
    };

    fs.writeFileSync('test-results.json', JSON.stringify(report, null, 2));
    this.log('Test results saved to test-results.json', 'info');

    return failed === 0;
  }

  async run(options = {}) {
    try {
      this.log('🚀 Starting Income Magic Test Suite', 'info');
      this.log(`Options: ${JSON.stringify(options)}`, 'info');

      // Prerequisites
      await this.checkPrerequisites();

      // Test execution based on options
      if (options.unit !== false) {
        await this.runUnitTests();
      }

      if (options.integration !== false) {
        await this.runIntegrationTests();
      }

      if (options.errorHandling !== false) {
        await this.runErrorHandlingTests();
      }

      if (options.performance !== false) {
        await this.runPerformanceTests();
      }

      if (options.browser !== false) {
        await this.runBrowserTests();
      }

      if (options.coverage !== false) {
        await this.generateCoverageReport();
      }

      return this.generateReport();

    } catch (error) {
      this.log(`Critical error: ${error.message}`, 'error');
      return false;
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  args.forEach(arg => {
    if (arg.startsWith('--no-')) {
      const suite = arg.replace('--no-', '');
      options[suite] = false;
    } else if (arg.startsWith('--only-')) {
      const suite = arg.replace('--only-', '');
      // Disable all except specified
      ['unit', 'integration', 'errorHandling', 'performance', 'browser', 'coverage'].forEach(s => {
        options[s] = s === suite;
      });
    }
  });

  const runner = new TestRunner();
  runner.run(options).then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;