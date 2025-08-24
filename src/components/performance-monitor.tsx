/**
 * Performance Monitor Component
 * Displays performance metrics and statistics
 */

import React, { useState, useEffect } from 'react';

interface PerformanceMetrics {
  requestCount: number;
  cacheHitCount: number;
  averageResponseTime: number;
  errorCount: number;
  lastRequestTime: number;
  cacheHitRate: number;
  errorRate: number;
  totalRequests: number;
}

interface PerformanceMonitorProps {
  getMetrics: () => PerformanceMetrics;
  onClearCache?: () => void;
  onResetMetrics?: () => void;
  refreshInterval?: number;
  compact?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  getMetrics,
  onClearCache,
  onResetMetrics,
  refreshInterval = 5000,
  compact = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(getMetrics());
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [getMetrics, refreshInterval]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (rate: number, isError: boolean = false): string => {
    if (isError) {
      if (rate > 0.1) return 'text-red-600';
      if (rate > 0.05) return 'text-yellow-600';
      return 'text-green-600';
    } else {
      if (rate > 0.8) return 'text-green-600';
      if (rate > 0.5) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  if (compact && !isExpanded) {
    return (
      <div 
        className="bg-gray-100 rounded-lg p-2 cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Performance</span>
          <div className="flex items-center space-x-2">
            <span className={getStatusColor(metrics.cacheHitRate)}>
              {formatPercentage(metrics.cacheHitRate)} cache
            </span>
            <span className={getStatusColor(metrics.errorRate, true)}>
              {formatPercentage(metrics.errorRate)} errors
            </span>
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        <div className="flex items-center space-x-2">
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {onResetMetrics && (
            <button
              onClick={onResetMetrics}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset
            </button>
          )}
          {onClearCache && (
            <button
              onClick={onClearCache}
              className="text-sm text-orange-600 hover:text-orange-800"
            >
              Clear Cache
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">
            {metrics.totalRequests}
          </div>
          <div className="text-sm text-blue-800">Total Requests</div>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-green-50 rounded-lg p-3">
          <div className={`text-2xl font-bold ${getStatusColor(metrics.cacheHitRate)}`}>
            {formatPercentage(metrics.cacheHitRate)}
          </div>
          <div className="text-sm text-green-800">Cache Hit Rate</div>
        </div>

        {/* Average Response Time */}
        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-600">
            {formatTime(metrics.averageResponseTime)}
          </div>
          <div className="text-sm text-yellow-800">Avg Response Time</div>
        </div>

        {/* Error Rate */}
        <div className="bg-red-50 rounded-lg p-3">
          <div className={`text-2xl font-bold ${getStatusColor(metrics.errorRate, true)}`}>
            {formatPercentage(metrics.errorRate)}
          </div>
          <div className="text-sm text-red-800">Error Rate</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Cache Hits:</span>
          <span className="ml-2 text-gray-900">{metrics.cacheHitCount}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Errors:</span>
          <span className="ml-2 text-gray-900">{metrics.errorCount}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Last Request:</span>
          <span className="ml-2 text-gray-900">{formatDate(metrics.lastRequestTime)}</span>
        </div>
      </div>

      {/* Performance Status Indicator */}
      <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Overall Performance:</span>
        <div className="flex items-center space-x-2">
          {metrics.cacheHitRate > 0.8 && metrics.errorRate < 0.05 && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600 font-medium">Excellent</span>
            </>
          )}
          {metrics.cacheHitRate > 0.5 && metrics.errorRate < 0.1 && metrics.cacheHitRate <= 0.8 && (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-yellow-600 font-medium">Good</span>
            </>
          )}
          {(metrics.cacheHitRate <= 0.5 || metrics.errorRate >= 0.1) && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-red-600 font-medium">Needs Improvement</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Simple Performance Badge Component
 */
interface PerformanceBadgeProps {
  cacheHitRate: number;
  errorRate: number;
  size?: 'small' | 'medium';
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  cacheHitRate,
  errorRate,
  size = 'small'
}) => {
  const getStatus = () => {
    if (cacheHitRate > 0.8 && errorRate < 0.05) return { label: 'Excellent', color: 'green' };
    if (cacheHitRate > 0.5 && errorRate < 0.1) return { label: 'Good', color: 'yellow' };
    return { label: 'Poor', color: 'red' };
  };

  const status = getStatus();
  const sizeClasses = size === 'small' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${colorClasses[status.color]}`}>
      <div className={`w-1.5 h-1.5 bg-${status.color}-500 rounded-full mr-1`}></div>
      {status.label}
    </span>
  );
};