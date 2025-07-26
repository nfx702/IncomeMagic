/**
 * /sc:workflow Implementation - Workflow Generator for Income Magic
 * Transforms feature specifications into actionable implementation workflows
 */

export interface WorkflowConfig {
  strategy: 'systematic' | 'agile' | 'mvp';
  persona?: 'frontend' | 'backend' | 'architect' | 'security' | 'devops' | 'fullstack';
  output: 'roadmap' | 'tasks' | 'detailed';
  estimate?: boolean;
  dependencies?: boolean;
  risks?: boolean;
  parallel?: boolean;
  milestones?: boolean;
  mcpServers?: {
    context7?: boolean;
    sequential?: boolean;
    magic?: boolean;
    allMcp?: boolean;
  };
}

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  persona: string;
  estimatedHours?: number;
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  acceptanceCriteria: string[];
  risks?: string[];
  parallelizable: boolean;
  phase: number;
  milestone?: string;
}

export interface WorkflowPhase {
  phase: number;
  title: string;
  description: string;
  duration: string;
  tasks: WorkflowTask[];
  deliverables: string[];
  riskMitigation?: string[];
}

export interface WorkflowOutput {
  title: string;
  description: string;
  strategy: string;
  estimatedDuration: string;
  complexity: 'low' | 'medium' | 'high';
  phases: WorkflowPhase[];
  dependencies: {
    internal: string[];
    external: string[];
    technical: string[];
    team: string[];
  };
  risks: {
    technical: string[];
    timeline: string[];
    security: string[];
    business: string[];
  };
  parallelWorkStreams: string[][];
  milestones: {
    name: string;
    phase: number;
    criteria: string[];
  }[];
}

export class WorkflowGenerator {
  private config: WorkflowConfig;
  
  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  /**
   * Generate workflow from feature description
   */
  public generateWorkflow(
    featureDescription: string,
    context?: {
      existingCodebase?: string[];
      currentArchitecture?: string;
      teamSize?: number;
      timeline?: string;
    }
  ): WorkflowOutput {
    // Analyze feature and determine primary persona
    const primaryPersona = this.detectPersona(featureDescription);
    const complexity = this.assessComplexity(featureDescription);
    
    // Generate workflow based on strategy
    switch (this.config.strategy) {
      case 'systematic':
        return this.generateSystematicWorkflow(featureDescription, primaryPersona, complexity, context);
      case 'agile':
        return this.generateAgileWorkflow(featureDescription, primaryPersona, complexity, context);
      case 'mvp':
        return this.generateMVPWorkflow(featureDescription, primaryPersona, complexity, context);
      default:
        return this.generateSystematicWorkflow(featureDescription, primaryPersona, complexity, context);
    }
  }

  /**
   * Detect primary persona based on feature description
   */
  private detectPersona(description: string): string {
    if (this.config.persona) return this.config.persona;

    const keywords = {
      frontend: ['ui', 'component', 'interface', 'design', 'user experience', 'responsive', 'css', 'react', 'vue'],
      backend: ['api', 'database', 'server', 'authentication', 'service', 'endpoint', 'integration'],
      architect: ['architecture', 'system', 'scalability', 'microservices', 'design patterns', 'infrastructure'],
      security: ['security', 'authentication', 'authorization', 'encryption', 'vulnerability', 'compliance'],
      devops: ['deployment', 'ci/cd', 'infrastructure', 'monitoring', 'docker', 'kubernetes', 'cloud']
    };

    const lowerDesc = description.toLowerCase();
    let maxScore = 0;
    let detectedPersona = 'fullstack';

    for (const [persona, terms] of Object.entries(keywords)) {
      const score = terms.reduce((count, term) => 
        count + (lowerDesc.includes(term) ? 1 : 0), 0
      );
      if (score > maxScore) {
        maxScore = score;
        detectedPersona = persona;
      }
    }

    return detectedPersona;
  }

  /**
   * Assess feature complexity
   */
  private assessComplexity(description: string): 'low' | 'medium' | 'high' {
    const complexityIndicators = {
      high: ['ml', 'machine learning', 'ai', 'real-time', 'microservices', 'distributed', 'analytics', 'forecasting'],
      medium: ['api', 'database', 'authentication', 'integration', 'dashboard', 'chart', 'component'],
      low: ['button', 'form', 'text', 'styling', 'layout', 'simple']
    };

    const lowerDesc = description.toLowerCase();
    
    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => lowerDesc.includes(indicator))) {
        return level as 'low' | 'medium' | 'high';
      }
    }

    return 'medium'; // Default
  }

  /**
   * Generate systematic workflow (waterfall-like approach)
   */
  private generateSystematicWorkflow(
    description: string,
    persona: string,
    complexity: 'low' | 'medium' | 'high',
    context?: any
  ): WorkflowOutput {
    const phases: WorkflowPhase[] = [
      {
        phase: 1,
        title: 'Analysis & Planning',
        description: 'Requirements analysis, architecture design, and planning',
        duration: complexity === 'high' ? '1-2 weeks' : complexity === 'medium' ? '3-5 days' : '1-2 days',
        tasks: this.generateAnalysisTasks(description, persona, complexity),
        deliverables: [
          'Technical specification document',
          'Architecture design',
          'Implementation plan',
          'Risk assessment'
        ]
      },
      {
        phase: 2,
        title: 'Foundation & Setup',
        description: 'Core infrastructure, database setup, and basic structure',
        duration: complexity === 'high' ? '1-2 weeks' : complexity === 'medium' ? '3-5 days' : '1-2 days',
        tasks: this.generateFoundationTasks(description, persona, complexity),
        deliverables: [
          'Project structure',
          'Database schema',
          'Basic CI/CD pipeline',
          'Development environment'
        ]
      },
      {
        phase: 3,
        title: 'Core Implementation',
        description: 'Primary feature development and core functionality',
        duration: complexity === 'high' ? '3-4 weeks' : complexity === 'medium' ? '1-2 weeks' : '3-5 days',
        tasks: this.generateImplementationTasks(description, persona, complexity),
        deliverables: [
          'Core feature functionality',
          'API endpoints (if applicable)',
          'User interface components',
          'Integration points'
        ]
      },
      {
        phase: 4,
        title: 'Testing & Optimization',
        description: 'Testing, performance optimization, and quality assurance',
        duration: complexity === 'high' ? '1-2 weeks' : complexity === 'medium' ? '3-5 days' : '1-2 days',
        tasks: this.generateTestingTasks(description, persona, complexity),
        deliverables: [
          'Test suite',
          'Performance benchmarks',
          'Security validation',
          'Documentation'
        ]
      },
      {
        phase: 5,
        title: 'Deployment & Monitoring',
        description: 'Production deployment, monitoring setup, and launch',
        duration: '2-3 days',
        tasks: this.generateDeploymentTasks(description, persona, complexity),
        deliverables: [
          'Production deployment',
          'Monitoring dashboard',
          'Launch checklist',
          'Post-launch support plan'
        ]
      }
    ];

    return {
      title: this.extractFeatureTitle(description),
      description,
      strategy: 'systematic',
      estimatedDuration: this.calculateTotalDuration(phases),
      complexity,
      phases,
      dependencies: this.analyzeDependencies(description, persona),
      risks: this.assessRisks(description, complexity),
      parallelWorkStreams: this.identifyParallelStreams(phases),
      milestones: this.createMilestones(phases)
    };
  }

  /**
   * Generate agile workflow (sprint-based approach)
   */
  private generateAgileWorkflow(
    description: string,
    persona: string,
    complexity: 'low' | 'medium' | 'high',
    context?: any
  ): WorkflowOutput {
    // Similar structure but organized as sprints
    const phases: WorkflowPhase[] = [
      {
        phase: 1,
        title: 'Sprint 0 - Setup & Planning',
        description: 'Project setup, backlog creation, and sprint planning',
        duration: '1 week',
        tasks: this.generateSprintZeroTasks(description, persona, complexity),
        deliverables: ['Product backlog', 'Sprint plan', 'Definition of done']
      },
      {
        phase: 2,
        title: 'Sprint 1 - Foundation',
        description: 'Core infrastructure and basic feature skeleton',
        duration: '2 weeks',
        tasks: this.generateSprint1Tasks(description, persona, complexity),
        deliverables: ['Working skeleton', 'Basic CI/CD', 'Initial documentation']
      },
      {
        phase: 3,
        title: 'Sprint 2 - Core Features',
        description: 'Primary feature development and MVP functionality',
        duration: '2 weeks',
        tasks: this.generateSprint2Tasks(description, persona, complexity),
        deliverables: ['MVP features', 'Basic testing', 'User feedback integration']
      },
      {
        phase: 4,
        title: 'Sprint 3 - Enhancement & Polish',
        description: 'Feature enhancement, optimization, and production readiness',
        duration: '2 weeks',
        tasks: this.generateSprint3Tasks(description, persona, complexity),
        deliverables: ['Enhanced features', 'Performance optimization', 'Production deployment']
      }
    ];

    return {
      title: this.extractFeatureTitle(description),
      description,
      strategy: 'agile',
      estimatedDuration: this.calculateTotalDuration(phases),
      complexity,
      phases,
      dependencies: this.analyzeDependencies(description, persona),
      risks: this.assessRisks(description, complexity),
      parallelWorkStreams: this.identifyParallelStreams(phases),
      milestones: this.createMilestones(phases)
    };
  }

  /**
   * Generate MVP workflow (minimum viable product approach)
   */
  private generateMVPWorkflow(
    description: string,
    persona: string,
    complexity: 'low' | 'medium' | 'high',
    context?: any
  ): WorkflowOutput {
    const phases: WorkflowPhase[] = [
      {
        phase: 1,
        title: 'MVP Definition',
        description: 'Define minimum viable product scope and core requirements',
        duration: '2-3 days',
        tasks: this.generateMVPDefinitionTasks(description, persona, complexity),
        deliverables: ['MVP scope document', 'Core user stories', 'Success metrics']
      },
      {
        phase: 2,
        title: 'Rapid Prototyping',
        description: 'Quick implementation of core MVP features',
        duration: complexity === 'high' ? '1-2 weeks' : '3-5 days',
        tasks: this.generateRapidPrototypingTasks(description, persona, complexity),
        deliverables: ['Working prototype', 'Basic functionality', 'User testing setup']
      },
      {
        phase: 3,
        title: 'Validation & Iteration',
        description: 'User testing, feedback collection, and rapid iteration',
        duration: '1 week',
        tasks: this.generateValidationTasks(description, persona, complexity),
        deliverables: ['User feedback', 'Iteration plan', 'Validated learning']
      },
      {
        phase: 4,
        title: 'MVP Launch',
        description: 'Final MVP preparation and launch',
        duration: '2-3 days',
        tasks: this.generateMVPLaunchTasks(description, persona, complexity),
        deliverables: ['Launched MVP', 'Analytics setup', 'Post-MVP roadmap']
      }
    ];

    return {
      title: this.extractFeatureTitle(description),
      description,
      strategy: 'mvp',
      estimatedDuration: this.calculateTotalDuration(phases),
      complexity,
      phases,
      dependencies: this.analyzeDependencies(description, persona),
      risks: this.assessRisks(description, complexity),
      parallelWorkStreams: this.identifyParallelStreams(phases),
      milestones: this.createMilestones(phases)
    };
  }

  // Helper methods for task generation
  private generateAnalysisTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return [
      {
        id: 'analysis-1',
        title: 'Requirements Analysis',
        description: 'Analyze feature requirements and define acceptance criteria',
        persona: 'architect',
        estimatedHours: complexity === 'high' ? 16 : complexity === 'medium' ? 8 : 4,
        complexity,
        dependencies: [],
        acceptanceCriteria: [
          'All requirements documented',
          'Acceptance criteria defined',
          'Edge cases identified'
        ],
        parallelizable: false,
        phase: 1
      },
      {
        id: 'analysis-2',
        title: 'Technical Architecture Design',
        description: 'Design system architecture and component structure',
        persona: 'architect',
        estimatedHours: complexity === 'high' ? 24 : complexity === 'medium' ? 12 : 6,
        complexity,
        dependencies: ['analysis-1'],
        acceptanceCriteria: [
          'Architecture diagram created',
          'Component relationships defined',
          'Technology stack selected'
        ],
        parallelizable: false,
        phase: 1
      }
    ];
  }

  private generateFoundationTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    const tasks: WorkflowTask[] = [
      {
        id: 'foundation-1',
        title: 'Project Structure Setup',
        description: 'Create project structure and configure development environment',
        persona: 'devops',
        estimatedHours: 4,
        complexity: 'low',
        dependencies: ['analysis-2'],
        acceptanceCriteria: [
          'Project structure created',
          'Development environment configured',
          'Version control setup'
        ],
        parallelizable: false,
        phase: 2
      }
    ];

    if (description.toLowerCase().includes('database') || description.toLowerCase().includes('data')) {
      tasks.push({
        id: 'foundation-2',
        title: 'Database Schema Design',
        description: 'Design and implement database schema',
        persona: 'backend',
        estimatedHours: complexity === 'high' ? 16 : complexity === 'medium' ? 8 : 4,
        complexity,
        dependencies: ['analysis-2'],
        acceptanceCriteria: [
          'Database schema designed',
          'Migration scripts created',
          'Data relationships defined'
        ],
        parallelizable: true,
        phase: 2
      });
    }

    return tasks;
  }

  private generateImplementationTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    const tasks: WorkflowTask[] = [];

    if (persona === 'frontend' || persona === 'fullstack') {
      tasks.push({
        id: 'impl-ui-1',
        title: 'UI Components Development',
        description: 'Develop user interface components',
        persona: 'frontend',
        estimatedHours: complexity === 'high' ? 32 : complexity === 'medium' ? 16 : 8,
        complexity,
        dependencies: ['foundation-1'],
        acceptanceCriteria: [
          'Components are responsive',
          'Accessibility standards met',
          'Design system compliance'
        ],
        parallelizable: true,
        phase: 3
      });
    }

    if (persona === 'backend' || persona === 'fullstack') {
      tasks.push({
        id: 'impl-api-1',
        title: 'API Development',
        description: 'Develop backend API endpoints',
        persona: 'backend',
        estimatedHours: complexity === 'high' ? 40 : complexity === 'medium' ? 20 : 10,
        complexity,
        dependencies: ['foundation-2'],
        acceptanceCriteria: [
          'API endpoints functional',
          'Data validation implemented',
          'Error handling in place'
        ],
        parallelizable: true,
        phase: 3
      });
    }

    return tasks;
  }

  private generateTestingTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return [
      {
        id: 'test-1',
        title: 'Unit Testing',
        description: 'Implement comprehensive unit tests',
        persona: 'qa',
        estimatedHours: complexity === 'high' ? 24 : complexity === 'medium' ? 12 : 6,
        complexity,
        dependencies: ['impl-ui-1', 'impl-api-1'],
        acceptanceCriteria: [
          'Unit test coverage >80%',
          'All critical paths tested',
          'Edge cases covered'
        ],
        parallelizable: true,
        phase: 4
      },
      {
        id: 'test-2',
        title: 'Integration Testing',
        description: 'Test integration between components',
        persona: 'qa',
        estimatedHours: complexity === 'high' ? 16 : complexity === 'medium' ? 8 : 4,
        complexity,
        dependencies: ['test-1'],
        acceptanceCriteria: [
          'Integration tests pass',
          'Data flow validated',
          'API contracts verified'
        ],
        parallelizable: false,
        phase: 4
      }
    ];
  }

  private generateDeploymentTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return [
      {
        id: 'deploy-1',
        title: 'Production Deployment',
        description: 'Deploy feature to production environment',
        persona: 'devops',
        estimatedHours: 8,
        complexity: 'medium',
        dependencies: ['test-2'],
        acceptanceCriteria: [
          'Successful production deployment',
          'Rollback plan tested',
          'Monitoring alerts configured'
        ],
        parallelizable: false,
        phase: 5
      }
    ];
  }

  // Placeholder methods for other task generation
  private generateSprintZeroTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return this.generateAnalysisTasks(description, persona, complexity);
  }

  private generateSprint1Tasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return this.generateFoundationTasks(description, persona, complexity);
  }

  private generateSprint2Tasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return this.generateImplementationTasks(description, persona, complexity);
  }

  private generateSprint3Tasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return [...this.generateTestingTasks(description, persona, complexity), ...this.generateDeploymentTasks(description, persona, complexity)];
  }

  private generateMVPDefinitionTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return [
      {
        id: 'mvp-def-1',
        title: 'Core Feature Identification',
        description: 'Identify minimum viable features for MVP',
        persona: 'architect',
        estimatedHours: 4,
        complexity: 'low',
        dependencies: [],
        acceptanceCriteria: [
          'Core features identified',
          'Non-essential features deferred',
          'Success metrics defined'
        ],
        parallelizable: false,
        phase: 1
      }
    ];
  }

  private generateRapidPrototypingTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return [
      {
        id: 'proto-1',
        title: 'MVP Prototype Development',
        description: 'Rapidly develop MVP prototype',
        persona,
        estimatedHours: complexity === 'high' ? 40 : complexity === 'medium' ? 20 : 10,
        complexity,
        dependencies: ['mvp-def-1'],
        acceptanceCriteria: [
          'Working prototype created',
          'Core functionality demonstrated',
          'User testing ready'
        ],
        parallelizable: false,
        phase: 2
      }
    ];
  }

  private generateValidationTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return [
      {
        id: 'valid-1',
        title: 'User Testing & Feedback',
        description: 'Conduct user testing and collect feedback',
        persona: 'qa',
        estimatedHours: 16,
        complexity: 'medium',
        dependencies: ['proto-1'],
        acceptanceCriteria: [
          'User testing completed',
          'Feedback analyzed',
          'Improvement priorities identified'
        ],
        parallelizable: false,
        phase: 3
      }
    ];
  }

  private generateMVPLaunchTasks(description: string, persona: string, complexity: 'low' | 'medium' | 'high'): WorkflowTask[] {
    return [
      {
        id: 'launch-1',
        title: 'MVP Launch Preparation',
        description: 'Prepare and launch MVP',
        persona: 'devops',
        estimatedHours: 8,
        complexity: 'medium',
        dependencies: ['valid-1'],
        acceptanceCriteria: [
          'MVP successfully launched',
          'Analytics tracking active',
          'User feedback channels open'
        ],
        parallelizable: false,
        phase: 4
      }
    ];
  }

  // Utility methods
  private extractFeatureTitle(description: string): string {
    const words = description.split(' ').slice(0, 5).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  private calculateTotalDuration(phases: WorkflowPhase[]): string {
    // Simple duration calculation - would be more sophisticated in real implementation
    const totalWeeks = phases.length * 1.5;
    return totalWeeks > 4 ? `${Math.ceil(totalWeeks)} weeks` : `${Math.ceil(totalWeeks * 7)} days`;
  }

  private analyzeDependencies(description: string, persona: string) {
    return {
      internal: ['existing codebase', 'component library'],
      external: ['third-party APIs', 'external services'],
      technical: ['framework versions', 'database compatibility'],
      team: ['design team', 'QA team']
    };
  }

  private assessRisks(description: string, complexity: 'low' | 'medium' | 'high') {
    const baseRisks = {
      technical: ['integration complexity', 'performance bottlenecks'],
      timeline: ['scope creep', 'dependency delays'],
      security: ['data protection', 'access control'],
      business: ['changing requirements', 'market feedback']
    };

    if (complexity === 'high') {
      baseRisks.technical.push('architectural complexity', 'scalability challenges');
      baseRisks.timeline.push('underestimation', 'technical debt');
    }

    return baseRisks;
  }

  private identifyParallelStreams(phases: WorkflowPhase[]): string[][] {
    const parallelStreams: string[][] = [];
    
    phases.forEach(phase => {
      const parallelTasks = phase.tasks
        .filter(task => task.parallelizable)
        .map(task => task.id);
      
      if (parallelTasks.length > 1) {
        parallelStreams.push(parallelTasks);
      }
    });

    return parallelStreams;
  }

  private createMilestones(phases: WorkflowPhase[]) {
    return phases.map((phase, index) => ({
      name: `${phase.title} Complete`,
      phase: phase.phase,
      criteria: phase.deliverables
    }));
  }
}

/**
 * Output formatters for different workflow formats
 */
export class WorkflowFormatter {
  static formatAsRoadmap(workflow: WorkflowOutput): string {
    let output = `# ${workflow.title} Implementation Roadmap\n\n`;
    output += `**Strategy**: ${workflow.strategy}\n`;
    output += `**Estimated Duration**: ${workflow.estimatedDuration}\n`;
    output += `**Complexity**: ${workflow.complexity}\n\n`;

    workflow.phases.forEach(phase => {
      output += `## Phase ${phase.phase}: ${phase.title} (${phase.duration})\n`;
      output += `${phase.description}\n\n`;
      
      phase.tasks.forEach(task => {
        output += `- [ ] ${task.title}`;
        if (task.estimatedHours) {
          output += ` (${task.estimatedHours}h)`;
        }
        output += `\n`;
      });
      
      output += `\n**Deliverables**: ${phase.deliverables.join(', ')}\n\n`;
    });

    return output;
  }

  static formatAsTasks(workflow: WorkflowOutput): string {
    let output = `# ${workflow.title} Implementation Tasks\n\n`;

    workflow.phases.forEach(phase => {
      output += `## ${phase.title}\n`;
      
      phase.tasks.forEach(task => {
        output += `### ${task.title}\n`;
        output += `**Persona**: ${task.persona}\n`;
        output += `**Complexity**: ${task.complexity}\n`;
        if (task.estimatedHours) {
          output += `**Estimated**: ${task.estimatedHours} hours\n`;
        }
        output += `**Dependencies**: ${task.dependencies.join(', ') || 'None'}\n\n`;
        
        output += `**Acceptance Criteria**:\n`;
        task.acceptanceCriteria.forEach(criteria => {
          output += `- [ ] ${criteria}\n`;
        });
        output += `\n`;
      });
    });

    return output;
  }

  static formatAsDetailed(workflow: WorkflowOutput): string {
    let output = `# ${workflow.title} - Detailed Implementation Workflow\n\n`;
    output += `**Description**: ${workflow.description}\n`;
    output += `**Strategy**: ${workflow.strategy}\n`;
    output += `**Estimated Duration**: ${workflow.estimatedDuration}\n`;
    output += `**Complexity**: ${workflow.complexity}\n\n`;

    // Dependencies section
    output += `## Dependencies\n`;
    Object.entries(workflow.dependencies).forEach(([type, deps]) => {
      if (deps.length > 0) {
        output += `**${type.charAt(0).toUpperCase() + type.slice(1)}**: ${deps.join(', ')}\n`;
      }
    });
    output += `\n`;

    // Risks section
    output += `## Risk Assessment\n`;
    Object.entries(workflow.risks).forEach(([type, risks]) => {
      if (risks.length > 0) {
        output += `**${type.charAt(0).toUpperCase() + type.slice(1)} Risks**: ${risks.join(', ')}\n`;
      }
    });
    output += `\n`;

    // Detailed phases
    workflow.phases.forEach(phase => {
      output += `## Phase ${phase.phase}: ${phase.title}\n`;
      output += `**Duration**: ${phase.duration}\n`;
      output += `**Description**: ${phase.description}\n\n`;
      
      phase.tasks.forEach(task => {
        output += `### Task: ${task.title}\n`;
        output += `**Persona**: ${task.persona}\n`;
        output += `**Estimated Time**: ${task.estimatedHours || 'TBD'} hours\n`;
        output += `**Complexity**: ${task.complexity}\n`;
        output += `**Dependencies**: ${task.dependencies.join(', ') || 'None'}\n`;
        output += `**Parallelizable**: ${task.parallelizable ? 'Yes' : 'No'}\n\n`;
        
        output += `**Description**: ${task.description}\n\n`;
        
        output += `**Acceptance Criteria**:\n`;
        task.acceptanceCriteria.forEach(criteria => {
          output += `- [ ] ${criteria}\n`;
        });
        
        if (task.risks && task.risks.length > 0) {
          output += `\n**Risks**: ${task.risks.join(', ')}\n`;
        }
        
        output += `\n---\n\n`;
      });
      
      output += `**Phase Deliverables**: ${phase.deliverables.join(', ')}\n\n`;
    });

    // Milestones
    output += `## Milestones\n`;
    workflow.milestones.forEach(milestone => {
      output += `### ${milestone.name} (Phase ${milestone.phase})\n`;
      milestone.criteria.forEach(criteria => {
        output += `- [ ] ${criteria}\n`;
      });
      output += `\n`;
    });

    return output;
  }
}