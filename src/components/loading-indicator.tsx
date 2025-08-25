/**
 * Loading Indicator Component
 * Displays loading states with progress and messages
 */

import React from 'react';

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  error?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'dots' | 'pulse';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  isLoading,
  message,
  progress,
  error,
  size = 'medium',
  variant = 'spinner'
}) => {
  if (!isLoading && !error) {
    return null;
  }

  const sizeClasses = {
    small: 'tw-w-4 tw-h-4',
    medium: 'tw-w-6 tw-h-6',
    large: 'tw-w-8 tw-h-8'
  };

  const textSizeClasses = {
    small: 'tw-text-xs',
    medium: 'tw-text-sm',
    large: 'tw-text-base'
  };

  if (error) {
    return (
      <div className="tw-flex tw-items-center tw-space-x-2 tw-text-red-600">
        <svg className={`${sizeClasses[size]} tw-flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className={textSizeClasses[size]}>{error}</span>
      </div>
    );
  }

  return (
    <div className="tw-flex tw-items-center tw-space-x-2 tw-text-blue-600">
      {variant === 'spinner' && (
        <svg 
          className={`${sizeClasses[size]} animate-spin flex-shrink-0`} 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {variant === 'dots' && (
        <div className="tw-flex tw-space-x-1">
          <div className={`${sizeClasses[size]} tw-bg-current tw-rounded-full tw-animate-pulse`} style={{ animationDelay: '0ms' }} />
          <div className={`${sizeClasses[size]} tw-bg-current tw-rounded-full tw-animate-pulse`} style={{ animationDelay: '150ms' }} />
          <div className={`${sizeClasses[size]} tw-bg-current tw-rounded-full tw-animate-pulse`} style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {variant === 'pulse' && (
        <div className={`${sizeClasses[size]} bg-current rounded-full animate-pulse flex-shrink-0`} />
      )}

      {message && (
        <span className={textSizeClasses[size]}>{message}</span>
      )}

      {progress !== undefined && (
        <div className="tw-flex tw-items-center tw-space-x-2">
          <div className="tw-w-16 tw-bg-gray-200 tw-rounded-full tw-h-2">
            <div 
              className="tw-bg-blue-600 tw-h-2 tw-rounded-full tw-transition-all tw-duration-300" 
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          <span className={`${textSizeClasses[size]} text-gray-600`}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Loading Overlay Component
 * Full-screen or container overlay with loading indicator
 */
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  error?: string;
  fullScreen?: boolean;
  backdrop?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  progress,
  error,
  fullScreen = false,
  backdrop = true
}) => {
  if (!isLoading && !error) {
    return null;
  }

  const overlayClasses = fullScreen 
    ? 'fixed inset-0 z-50' 
    : 'absolute inset-0 z-10';

  const backdropClasses = backdrop 
    ? 'bg-black bg-opacity-50' 
    : 'bg-transparent';

  return (
    <div className={`${overlayClasses} ${backdropClasses} tw-flex tw-items-center tw-justify-center`}>
      <div className="tw-bg-white tw-rounded-lg tw-p-6 tw-shadow-lg tw-max-w-sm tw-w-full tw-mx-4">
        <LoadingIndicator
          isLoading={isLoading}
          message={message}
          progress={progress}
          error={error}
          size="large"
          variant="spinner"
        />
      </div>
    </div>
  );
};

/**
 * Inline Loading Component
 * Small loading indicator for inline use
 */
interface InlineLoadingProps {
  isLoading: boolean;
  text?: string;
  size?: 'small' | 'medium';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isLoading,
  text = 'Loading...',
  size = 'small'
}) => {
  if (!isLoading) {
    return null;
  }

  return (
    <LoadingIndicator
      isLoading={isLoading}
      message={text}
      size={size}
      variant="dots"
    />
  );
};

/**
 * Button Loading State Component
 * Loading state for buttons
 */
interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  isLoading,
  children,
  disabled,
  className = '',
  onClick
}) => {
  return (
    <button
      className={`relative ${className} ${isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={isLoading || disabled}
      onClick={onClick}
    >
      {isLoading && (
        <div className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center">
          <LoadingIndicator
            isLoading={true}
            size="small"
            variant="spinner"
          />
        </div>
      )}
      <span className={isLoading ? 'invisible' : 'visible'}>
        {children}
      </span>
    </button>
  );
};