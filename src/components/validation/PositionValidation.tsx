'use client';

import { useState, useEffect } from 'react';
import { Position } from '@/types/trade';
import { IBValidationService, ValidationReport, ValidationResult } from '@/services/ibValidationService';
import { 
  IconAlertTriangle, 
  IconCircleCheck, 
  IconExclamationCircle,
  IconInfoCircle,
  IconRefresh,
  IconBulb
} from '@tabler/icons-react';

interface PositionValidationProps {
  positions: Map<string, Position>;
  onAutoFix?: (fixes: Map<string, number>) => void;
}

export function PositionValidation({ positions, onAutoFix }: PositionValidationProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);

  const validatePositions = async () => {
    setIsValidating(true);
    try {
      const validationService = IBValidationService.getInstance();
      const report = await validationService.validateAllPositions(positions);
      setValidationReport(report);
      
      // Log critical errors
      if (report.criticalErrors > 0) {
        console.error('🚨 Critical position discrepancies found:', 
          report.results.filter(r => r.severity === 'critical')
        );
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAutoFix = async () => {
    if (!validationReport || !onAutoFix) return;
    
    const validationService = IBValidationService.getInstance();
    const fixes = await validationService.proposeAutoFix(validationReport);
    
    if (fixes.size > 0) {
      const confirmed = confirm(
        `This will update ${fixes.size} positions to match IB data. Continue?`
      );
      
      if (confirmed) {
        onAutoFix(fixes);
        // Re-validate after fix
        setTimeout(validatePositions, 1000);
      }
    }
  };

  const getSeverityIcon = (severity: ValidationResult['severity']) => {
    switch (severity) {
      case 'critical':
        return <IconExclamationCircle className="text-red-500" size={20} />;
      case 'warning':
        return <IconAlertTriangle className="text-yellow-500" size={20} />;
      case 'minor':
        return <IconInfoCircle className="text-blue-500" size={20} />;
      case 'ok':
        return <IconCircleCheck className="text-green-500" size={20} />;
    }
  };

  const getSeverityColor = (severity: ValidationResult['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'minor': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'ok': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
    }
  };

  useEffect(() => {
    // Auto-validate on component mount
    validatePositions();
  }, []);

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconCircleCheck className="text-accent-primary" size={24} />
            Position Validation
          </h3>
          <p className="text-sm text-secondary mt-1">
            Cross-check positions against Interactive Brokers API
          </p>
        </div>
        
        <button
          onClick={validatePositions}
          disabled={isValidating}
          className="btn-primary flex items-center gap-2"
        >
          <IconRefresh size={18} className={isValidating ? 'animate-spin' : ''} />
          {isValidating ? 'Validating...' : 'Validate Now'}
        </button>
      </div>

      {validationReport && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-bg rounded-lg p-3">
              <p className="text-xs text-secondary">Total Positions</p>
              <p className="text-lg font-semibold">{validationReport.totalPositions}</p>
            </div>
            <div className="glass-bg rounded-lg p-3">
              <p className="text-xs text-secondary">Valid</p>
              <p className="text-lg font-semibold text-green-500">
                {validationReport.validPositions}
              </p>
            </div>
            <div className="glass-bg rounded-lg p-3">
              <p className="text-xs text-secondary">Critical</p>
              <p className="text-lg font-semibold text-red-500">
                {validationReport.criticalErrors}
              </p>
            </div>
            <div className="glass-bg rounded-lg p-3">
              <p className="text-xs text-secondary">Warnings</p>
              <p className="text-lg font-semibold text-yellow-500">
                {validationReport.warnings}
              </p>
            </div>
          </div>

          {/* Auto-fix option */}
          {(validationReport.criticalErrors > 0 || validationReport.warnings > 0) && onAutoFix && (
            <div className="glass-bg rounded-lg p-4 border border-accent-primary/20">
              <div className="flex items-start gap-3">
                <IconBulb className="text-accent-primary mt-1" size={20} />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Auto-Fix Available</h4>
                  <p className="text-sm text-secondary mb-3">
                    We can automatically update positions to match IB data. This will correct
                    {' '}{validationReport.criticalErrors + validationReport.warnings} discrepancies.
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoFixEnabled}
                        onChange={(e) => setAutoFixEnabled(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">I understand this will override calculated positions</span>
                    </label>
                    <button
                      onClick={handleAutoFix}
                      disabled={!autoFixEnabled}
                      className="btn-primary text-sm"
                    >
                      Apply Auto-Fix
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Results */}
          <div className="space-y-2">
            {validationReport.results
              .filter(r => r.severity !== 'ok' || r.discrepancy > 0)
              .map((result) => (
              <div
                key={result.symbol}
                className={`rounded-lg p-3 border ${
                  result.severity === 'critical' 
                    ? 'border-red-500/50' 
                    : result.severity === 'warning'
                    ? 'border-yellow-500/50'
                    : 'border-gray-300/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(result.severity)}
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {result.symbol}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(result.severity)}`}>
                          {result.severity.toUpperCase()}
                        </span>
                      </h4>
                      <p className="text-sm text-secondary mt-1">{result.message}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>Calculated: <b>{result.calculatedQuantity}</b></span>
                        <span>IB Shows: <b>{result.ibQuantity}</b></span>
                        <span>Discrepancy: <b className="text-red-500">{result.discrepancy}</b></span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(showDetails === result.symbol ? null : result.symbol)}
                    className="text-secondary hover:text-primary"
                  >
                    {showDetails === result.symbol ? 'Hide' : 'Details'}
                  </button>
                </div>

                {showDetails === result.symbol && (
                  <div className="mt-3 pt-3 border-t border-glass-border">
                    <h5 className="text-sm font-medium mb-2">Suggestions:</h5>
                    <ul className="space-y-1">
                      {result.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm text-secondary flex items-start gap-2">
                          <span className="text-accent-primary">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                    
                    {result.severity !== 'ok' && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium mb-2">Reconciliation Steps:</h5>
                        <ul className="space-y-1">
                          {IBValidationService.getInstance()
                            .getReconciliationSteps(result)
                            .map((step, idx) => (
                              <li key={idx} className="text-sm text-secondary">
                                {step}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Last Updated */}
          <div className="text-xs text-secondary text-right">
            Last validated: {new Date(validationReport.timestamp).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}