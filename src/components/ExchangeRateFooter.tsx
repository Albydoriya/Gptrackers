import React from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useExchangeRate } from '../hooks/useExchangeRate';

export const ExchangeRateFooter: React.FC = () => {
  const { rate, loading, error, trend, refetch } = useExchangeRate('AUD', 'JPY');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return diffMins === 0 ? 'just now' : `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-600" />;
      default:
        return <Minus className="w-3 h-3 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-4 py-2 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Loading exchange rate...</span>
          </div>
        </div>
      </footer>
    );
  }

  if (error || !rate) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-4 py-2 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <span>Exchange Rate: Unavailable</span>
            <button
              onClick={refetch}
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </footer>
    );
  }

  const rateValue = parseFloat(rate.rate.toString());

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 px-4 py-2 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Exchange Rate:</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                1 {rate.base_currency} = {rateValue.toFixed(2)} {rate.target_currency}
              </span>
              {getTrendIcon()}
            </div>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Updated: {formatDate(rate.fetched_at)}</span>
          </div>
        </div>
        <button
          onClick={refetch}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh rate"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
