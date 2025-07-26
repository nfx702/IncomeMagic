/**
 * Monitoring and Alerting Service
 * Real-time monitoring of market data, system health, and trading opportunities
 */

import { EventEmitter } from 'events';
import { MarketDataService, MarketDataUpdate } from './marketDataService';
import { RiskManagementService, RiskAlert, PortfolioRisk } from './riskManagement';
import { EnhancedRecommendation } from './enhancedRecommendationEngine';

export interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  apiResponseTimes: Map<string, number>;
  errorRate: number;
  uptime: number;
  activeConnections: number;
  cacheHitRate: number;
  databaseResponseTime: number;
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'price' | 'volume' | 'volatility' | 'system' | 'risk';
  condition: 'greater_than' | 'less_than' | 'equals' | 'change_percent';
  threshold: number;
  symbol?: string;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface MonitoringStats {
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  acknowledgedAlerts: number;
  systemUptime: number;
  dataFreshness: number;
  avgResponseTime: number;
  errorRate: number;
}

export class MonitoringService extends EventEmitter {
  private static instance: MonitoringService;
  
  private marketDataService: MarketDataService;
  private riskService: RiskManagementService;
  
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private metrics: SystemHealthMetrics;
  
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  
  private startTime = Date.now();
  private lastHealthCheck = Date.now();
  private responseTimeHistory: number[] = [];
  private errorCount = 0;
  private totalRequests = 0;

  private constructor() {
    super();
    this.marketDataService = MarketDataService.getInstance();
    this.riskService = RiskManagementService.getInstance();
    
    this.metrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkLatency: 0,
      apiResponseTimes: new Map(),
      errorRate: 0,
      uptime: 0,
      activeConnections: 0,
      cacheHitRate: 0,
      databaseResponseTime: 0
    };
    
    this.setupDefaultAlertRules();
    this.setupEventHandlers();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'vix_spike',
        name: 'VIX Spike Alert',
        type: 'volatility',
        condition: 'greater_than',
        threshold: 30,
        symbol: '^VIX',
        enabled: true,
        cooldownMinutes: 60
      },
      {
        id: 'spy_drop',
        name: 'SPY Drop Alert',
        type: 'price',
        condition: 'change_percent',
        threshold: -2,
        symbol: 'SPY',
        enabled: true,
        cooldownMinutes: 30
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        type: 'system',
        condition: 'greater_than',
        threshold: 0.05, // 5%
        enabled: true,
        cooldownMinutes: 15
      },
      {
        id: 'slow_response',
        name: 'Slow API Response',
        type: 'system',
        condition: 'greater_than',
        threshold: 5000, // 5 seconds
        enabled: true,
        cooldownMinutes: 10
      },
      {
        id: 'memory_usage',
        name: 'High Memory Usage',
        type: 'system',
        condition: 'greater_than',
        threshold: 80, // 80%
        enabled: true,
        cooldownMinutes: 30
      }
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }
  }

  private setupEventHandlers(): void {
    // Market data event handlers
    this.marketDataService.on('priceUpdate', (update: MarketDataUpdate) => {
      this.checkPriceAlerts(update);
    });

    this.marketDataService.on('error', (error: Error) => {
      this.createAlert('system_error', 'critical', 'Market Data Error', error.message, { error });
    });

    // System error handlers
    process.on('uncaughtException', (error: Error) => {
      this.createAlert('uncaught_exception', 'critical', 'Uncaught Exception', error.message, { error });
    });

    process.on('unhandledRejection', (reason: any) => {
      this.createAlert('unhandled_rejection', 'critical', 'Unhandled Promise Rejection', String(reason), { reason });
    });
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Monitoring service started');
    
    // Check alerts every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkSystemHealth();
      this.checkAlertRules();
    }, 30000);
    
    // Update metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 10000);
    
    this.emit('monitoringStarted');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    console.log('Monitoring service stopped');
    this.emit('monitoringStopped');
  }

  private checkPriceAlerts(update: MarketDataUpdate): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.type !== 'price' || rule.symbol !== update.symbol) {
        continue;
      }
      
      if (this.isInCooldown(rule)) continue;
      
      let triggered = false;
      let message = '';
      
      switch (rule.condition) {
        case 'greater_than':
          if (update.price > rule.threshold) {
            triggered = true;
            message = `${update.symbol} price $${update.price} exceeded threshold $${rule.threshold}`;
          }
          break;
          
        case 'less_than':
          if (update.price < rule.threshold) {
            triggered = true;
            message = `${update.symbol} price $${update.price} fell below threshold $${rule.threshold}`;
          }
          break;
          
        case 'change_percent':
          if (update.changePercent < rule.threshold) {
            triggered = true;
            message = `${update.symbol} dropped ${update.changePercent.toFixed(2)}% (threshold: ${rule.threshold}%)`;
          }
          break;
      }
      
      if (triggered) {
        this.createAlert(
          rule.id,
          'warning',
          rule.name,
          message,
          { update, rule }
        );
        
        rule.lastTriggered = new Date();
      }
    }
  }

  private checkSystemHealth(): void {
    const now = Date.now();
    const uptimeHours = (now - this.startTime) / (1000 * 60 * 60);
    
    // Check error rate
    const errorRate = this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0;
    
    // Check response time
    const avgResponseTime = this.responseTimeHistory.length > 0 
      ? this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length
      : 0;
    
    // Check for system alerts
    const errorRateRule = this.alertRules.get('high_error_rate');
    if (errorRateRule && errorRateRule.enabled && errorRate > errorRateRule.threshold && !this.isInCooldown(errorRateRule)) {
      this.createAlert(
        'high_error_rate',
        'critical',
        'High Error Rate Detected',
        `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(errorRateRule.threshold * 100).toFixed(2)}%`,
        { errorRate, threshold: errorRateRule.threshold }
      );
      errorRateRule.lastTriggered = new Date();
    }
    
    const responseRule = this.alertRules.get('slow_response');
    if (responseRule && responseRule.enabled && avgResponseTime > responseRule.threshold && !this.isInCooldown(responseRule)) {
      this.createAlert(
        'slow_response',
        'warning',
        'Slow API Response Detected',
        `Average response time ${avgResponseTime.toFixed(0)}ms exceeds threshold ${responseRule.threshold}ms`,
        { avgResponseTime, threshold: responseRule.threshold }
      );
      responseRule.lastTriggered = new Date();
    }
    
    this.lastHealthCheck = now;
  }

  private checkAlertRules(): void {
    // Check volatility rules
    const vixRule = this.alertRules.get('vix_spike');
    if (vixRule && vixRule.enabled) {
      this.checkVolatilityRule(vixRule);
    }
  }

  private async checkVolatilityRule(rule: AlertRule): Promise<void> {
    if (this.isInCooldown(rule)) return;
    
    try {
      const marketIndicators = await this.marketDataService.getMarketIndicators();
      
      if (marketIndicators.vix > rule.threshold) {
        this.createAlert(
          rule.id,
          'warning',
          rule.name,
          `VIX spike detected: ${marketIndicators.vix.toFixed(2)} (threshold: ${rule.threshold})`,
          { vix: marketIndicators.vix, threshold: rule.threshold }
        );
        
        rule.lastTriggered = new Date();
      }
    } catch (error) {
      console.error('Error checking volatility rule:', error);
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    
    // Update uptime
    this.metrics.uptime = (now - this.startTime) / 1000;
    
    // Update error rate
    this.metrics.errorRate = this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0;
    
    // Calculate cache hit rate (simplified)
    this.metrics.cacheHitRate = Math.random() * 0.3 + 0.7; // 70-100% mock
    
    // Simulate system metrics (in production, use actual system monitoring)
    this.metrics.cpuUsage = Math.random() * 30 + 20; // 20-50%
    this.metrics.memoryUsage = Math.random() * 40 + 30; // 30-70%
    this.metrics.diskUsage = Math.random() * 20 + 40; // 40-60%
    this.metrics.networkLatency = Math.random() * 50 + 10; // 10-60ms
    this.metrics.activeConnections = Math.floor(Math.random() * 20 + 5); // 5-25
    this.metrics.databaseResponseTime = Math.random() * 100 + 50; // 50-150ms
    
    // Trim response time history
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory = this.responseTimeHistory.slice(-50);
    }
  }

  private createAlert(
    ruleId: string,
    level: 'info' | 'warning' | 'critical',
    title: string,
    message: string,
    data: any
  ): void {
    const alert: Alert = {
      id: `${ruleId}_${Date.now()}`,
      ruleId,
      level,
      title,
      message,
      data,
      timestamp: new Date(),
      acknowledged: false
    };
    
    this.alerts.set(alert.id, alert);
    
    console.log(`[${level.toUpperCase()}] ${title}: ${message}`);
    this.emit('alert', alert);
    
    // Auto-acknowledge info alerts after 5 minutes
    if (level === 'info') {
      setTimeout(() => {
        this.acknowledgeAlert(alert.id, 'system');
      }, 5 * 60 * 1000);
    }
  }

  private isInCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return false;
    
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    return Date.now() - rule.lastTriggered.getTime() < cooldownMs;
  }

  // Public methods
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`Alert rule added: ${rule.name}`);
  }

  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      console.log(`Alert rule removed: ${ruleId}`);
    }
    return removed;
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;
    
    Object.assign(rule, updates);
    console.log(`Alert rule updated: ${ruleId}`);
    return true;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.acknowledged) return false;
    
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    
    console.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    this.emit('alertAcknowledged', alert);
    return true;
  }

  getAlerts(filter?: {
    level?: 'info' | 'warning' | 'critical';
    acknowledged?: boolean;
    since?: Date;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());
    
    if (filter) {
      if (filter.level) {
        alerts = alerts.filter(alert => alert.level === filter.level);
      }
      
      if (filter.acknowledged !== undefined) {
        alerts = alerts.filter(alert => alert.acknowledged === filter.acknowledged);
      }
      
      if (filter.since) {
        alerts = alerts.filter(alert => alert.timestamp >= filter.since!);
      }
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  getMetrics(): SystemHealthMetrics {
    return { ...this.metrics };
  }

  getStats(): MonitoringStats {
    const alerts = Array.from(this.alerts.values());
    
    return {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.level === 'critical').length,
      warningAlerts: alerts.filter(a => a.level === 'warning').length,
      infoAlerts: alerts.filter(a => a.level === 'info').length,
      acknowledgedAlerts: alerts.filter(a => a.acknowledged).length,
      systemUptime: this.metrics.uptime,
      dataFreshness: 0, // Would calculate based on last data update
      avgResponseTime: this.responseTimeHistory.length > 0 
        ? this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length
        : 0,
      errorRate: this.metrics.errorRate
    };
  }

  recordApiCall(responseTime: number, success: boolean): void {
    this.totalRequests++;
    this.responseTimeHistory.push(responseTime);
    
    if (!success) {
      this.errorCount++;
    }
    
    // Store response time by API endpoint (simplified)
    this.metrics.apiResponseTimes.set('average', responseTime);
  }

  clearOldAlerts(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    for (const [id, alert] of this.alerts) {
      if (alert.timestamp.getTime() < cutoff && alert.acknowledged) {
        this.alerts.delete(id);
      }
    }
    
    console.log(`Cleared alerts older than ${olderThanHours} hours`);
  }

  generateHealthReport(): string {
    const metrics = this.getMetrics();
    const stats = this.getStats();
    
    const report = [
      `System Health Report`,
      `===================`,
      `Uptime: ${(metrics.uptime / 3600).toFixed(1)} hours`,
      `CPU Usage: ${metrics.cpuUsage.toFixed(1)}%`,
      `Memory Usage: ${metrics.memoryUsage.toFixed(1)}%`,
      `Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
      `Avg Response Time: ${stats.avgResponseTime.toFixed(0)}ms`,
      `Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
      `Active Connections: ${metrics.activeConnections}`,
      ``,
      `Alert Summary:`,
      `- Total Alerts: ${stats.totalAlerts}`,
      `- Critical: ${stats.criticalAlerts}`,
      `- Warning: ${stats.warningAlerts}`,
      `- Info: ${stats.infoAlerts}`,
      `- Acknowledged: ${stats.acknowledgedAlerts}`,
      ``
    ];

    const recentAlerts = this.getAlerts({ 
      acknowledged: false,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000) 
    });

    if (recentAlerts.length > 0) {
      report.push(`Recent Unacknowledged Alerts:`);
      for (const alert of recentAlerts.slice(0, 5)) {
        report.push(`- [${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`);
      }
    } else {
      report.push(`No recent unacknowledged alerts.`);
    }

    return report.join('\n');
  }
}