import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useExchangeRate } from '../hooks/useExchangeRate';

export const ExchangeRateFooter: React.FC = () => {
  const jpyRate = useExchangeRate('AUD', 'JPY');
  const usdRate = useExchangeRate('AUD', 'USD');

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

  if (jpyRate.loading || usdRate.loading) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Loading exchange rates...</span>
          </div>
        </div>
      </footer>
    );
  }

  const renderRate = (rate: typeof jpyRate['rate'], trend: string) => {
    if (!rate) return <span className="text-xs text-red-500 dark:text-red-400">Unavailable</span>;
    const rateValue = parseFloat(rate.rate.toString());
    return (
      <div className="flex items-center space-x-1.5">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
          1 {rate.base_currency} = {rateValue.toFixed(2)} {rate.target_currency}
        </span>
        {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />}
        {trend === 'stable' && <Minus className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
      </div>
    );
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 lg:gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exchange Rates:</span>
            {renderRate(jpyRate.rate, jpyRate.trend)}
            <div className="hidden lg:block h-4 w-px bg-gray-300 dark:bg-gray-600" />
            {renderRate(usdRate.rate, usdRate.trend)}
            <div className="hidden lg:block h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span>
                Updated: {jpyRate.rate ? formatDate(jpyRate.rate.fetched_at) : 'N/A'}
              </span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="text-gray-400 dark:text-gray-500 italic">
                Auto-updates daily at 9:00 AM AEST
              </span>
            </div>
            <button
              onClick={() => {
                jpyRate.refetch();
                usdRate.refetch();
              }}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Refresh rates"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-400">&copy; 2026 GoParts</span>
            <Link
              to="/privacy-policy"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
