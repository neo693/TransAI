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
      if (rate > 0.1) return 'tw-text-red-600';
      if (rate > 0.05) return 'tw-text-yellow-600';
      return 'tw-text-green-600';
    } else {
      if (rate > 0.8) return 'tw-text-green-600';
      if (rate > 0.5) return 'tw-text-yellow-600';
      return 'tw-text-red-600';
    }
  };

  if (compact && !isExpanded) {
    return (
      <div 
        className="tw-bg-gray-100 tw-rounded-lg tw-p-2 tw-cursor-pointer hover:tw-bg-gray-200 tw-transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <div className="tw-flex tw-items-center tw-justify-between tw-text-sm">
          <span className="tw-font-medium">Performance</span>
          <div className="tw-flex tw-items-center tw-space-x-2">
            <span className={getStatusColor(metrics.cacheHitRate)}>
              {formatPercentage(metrics.cacheHitRate)} cache
            </span>
            <span className={getStatusColor(metrics.errorRate, true)}>
              {formatPercentage(metrics.errorRate)} errors
            </span>
            <svg className="tw-w-4 tw-h-4 tw-text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-bg-white tw-border tw-border-gray-200 tw-rounded-lg tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
        <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900">Performance Metrics</h3>
        <div className="tw-flex tw-items-center tw-space-x-2">
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="tw-text-gray-500 hover:tw-text-gray-700"
            >
              <svg className="tw-w-4 tw-h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {onResetMetrics && (
            <button
              onClick={onResetMetrics}
              className="tw-text-sm tw-text-blue-600 hover:tw-text-blue-800"
            >
              Reset
            </button>
          )}
          {onClearCache && (
            <button
              onClick={onClearCache}
              className="tw-text-sm tw-text-orange-600 hover:tw-text-orange-800"
            >
              Clear Cache
            </button>
          )}
        </div>
      </div>

      <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-4 tw-gap-4">
        {/* Total Requests */}
        <div className="tw-bg-blue-50 tw-rounded-lg tw-p-3">
          <div className="tw-text-2xl tw-font-bold tw-text-blue-600">
            {metrics.totalRequests}
          </div>
          <div className="tw-text-sm tw-text-blue-800">Total Requests</div>
        </div>

        {/* Cache Hit Rate */}
        <div className="tw-bg-green-50 tw-rounded-lg tw-p-3">
          <div className={`tw-text-2xl tw-font-bold ${getStatusColor(metrics.cacheHitRate)}`}>
            {formatPercentage(metrics.cacheHitRate)}
          </div>
          <div className="tw-text-sm tw-text-green-800">Cache Hit Rate</div>
        </div>

        {/* Average Response Time */}
        <div className="tw-bg-yellow-50 tw-rounded-lg tw-p-3">
          <div className="tw-text-2xl tw-font-bold tw-text-yellow-600">
            {formatTime(metrics.averageResponseTime)}
          </div>
          <div className="tw-text-sm tw-text-yellow-800">Avg Response Time</div>
        </div>

        {/* Error Rate */}
        <div className="tw-bg-red-50 tw-rounded-lg tw-p-3">
          <div className={`tw-text-2xl tw-font-bold ${getStatusColor(metrics.errorRate, true)}`}>
            {formatPercentage(metrics.errorRate)}
          </div>
          <div className="tw-text-sm tw-text-red-800">Error Rate</div>
        </div>
      </div>

      <div className="tw-mt-4 tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-text-sm">
        <div>
          <span className="tw-font-medium tw-text-gray-700">Cache Hits:</span>
          <span className="tw-ml-2 tw-text-gray-900">{metrics.cacheHitCount}</span>
        </div>
        <div>
          <span className="tw-font-medium tw-text-gray-700">Errors:</span>
          <span className="tw-ml-2 tw-text-gray-900">{metrics.errorCount}</span>
        </div>
        <div>
          <span className="tw-font-medium tw-text-gray-700">Last Request:</span>
          <span className="tw-ml-2 tw-text-gray-900">{formatDate(metrics.lastRequestTime)}</span>
        </div>
      </div>

      {/* Performance Status Indicator */}
      <div className="tw-mt-4 tw-flex tw-items-center tw-justify-between tw-p-3 tw-bg-gray-50 tw-rounded-lg">
        <span className="tw-text-sm tw-font-medium tw-text-gray-700">Overall Performance:</span>
        <div className="tw-flex tw-items-center tw-space-x-2">
          {metrics.cacheHitRate > 0.8 && metrics.errorRate < 0.05 && (
            <>
              <div className="tw-w-2 tw-h-2 tw-bg-green-500 tw-rounded-full"></div>
              <span className="tw-text-sm tw-text-green-600 tw-font-medium">Excellent</span>
            </>
          )}
          {metrics.cacheHitRate > 0.5 && metrics.errorRate < 0.1 && metrics.cacheHitRate <= 0.8 && (
            <>
              <div className="tw-w-2 tw-h-2 tw-bg-yellow-500 tw-rounded-full"></div>
              <span className="tw-text-sm tw-text-yellow-600 tw-font-medium">Good</span>
            </>
          )}
          {(metrics.cacheHitRate <= 0.5 || metrics.errorRate >= 0.1) && (
            <>
              <div className="tw-w-2 tw-h-2 tw-bg-red-500 tw-rounded-full"></div>
              <span className="tw-text-sm tw-text-red-600 tw-font-medium">Needs Improvement</span>
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