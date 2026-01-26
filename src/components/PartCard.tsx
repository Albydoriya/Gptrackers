import React, { useState } from 'react';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Edit,
  Archive,
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { Part } from '../types';
import { getCategoryColor } from '../utils/categoryColors';

interface PartCardProps {
  part: Part;
  onViewDetails: (part: Part) => void;
  onEditPart: (part: Part) => void;
  onArchivePart: (partId: string, partName: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

function PartCard({ part, onViewDetails, onEditPart, onArchivePart, canEdit, canDelete }: PartCardProps) {
  const [showAllPrices, setShowAllPrices] = useState(false);
  const categoryColor = getCategoryColor(part.category);

  const getStockStatus = () => {
    if (part.currentStock <= part.minStock) {
      return {
        status: 'low',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        label: 'Low Stock',
        percentage: (part.currentStock / part.minStock) * 100
      };
    } else if (part.currentStock <= part.minStock * 1.5) {
      return {
        status: 'medium',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        label: 'Medium Stock',
        percentage: (part.currentStock / (part.minStock * 1.5)) * 100
      };
    }
    return {
      status: 'good',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      label: 'Good Stock',
      percentage: Math.min(100, (part.currentStock / (part.minStock * 2)) * 100)
    };
  };

  const stockStatus = getStockStatus();
  const retailPrice = part.retailPrice || 0;

  const getPriceTrend = () => {
    if (part.priceHistory && part.priceHistory.length >= 2) {
      const latest = part.priceHistory[part.priceHistory.length - 1].price;
      const previous = part.priceHistory[part.priceHistory.length - 2].price;
      const change = ((latest - previous) / previous) * 100;

      if (Math.abs(change) < 0.1) return null;

      return {
        direction: change > 0 ? 'up' : 'down',
        percentage: Math.abs(change).toFixed(1)
      };
    }
    return null;
  };

  const priceTrend = getPriceTrend();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group">
      <div className={`relative h-40 bg-gradient-to-br ${categoryColor.gradient} flex items-center justify-center`}>
        <div className={`absolute top-3 left-3 px-3 py-1 ${categoryColor.badge} text-white text-xs font-semibold rounded-full shadow-lg`}>
          {part.category}
        </div>
        <Package className="h-16 w-16 text-white opacity-90" />
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 min-h-[3.5rem]">
            {part.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{part.partNumber}</p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Retail Price</span>
              {priceTrend && (
                <div className={`flex items-center space-x-1 text-xs ${priceTrend.direction === 'up' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {priceTrend.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{priceTrend.percentage}%</span>
                </div>
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                ${retailPrice.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                +{part.retailMarkupPercentage?.toFixed(0)}%
              </span>
            </div>
            {part.priceHistory && part.priceHistory.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Updated {new Date(part.priceHistory[part.priceHistory.length - 1].date).toLocaleDateString()}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowAllPrices(!showAllPrices)}
            className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
          >
            <span>View all pricing tiers</span>
            {showAllPrices ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showAllPrices && (
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Internal Usage:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ${part.internalUsagePrice?.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                    +{part.internalUsageMarkupPercentage?.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Wholesale:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ${part.wholesalePrice?.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">
                    +{part.wholesaleMarkupPercentage?.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Trade:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    ${part.tradePrice?.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                    +{part.tradeMarkupPercentage?.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock Level</span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-semibold ${stockStatus.textColor} dark:text-gray-300`}>
                {part.currentStock} / {part.minStock}
              </span>
              {stockStatus.status === 'low' && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full ${stockStatus.color} transition-all duration-300 rounded-full`}
              style={{ width: `${Math.min(100, stockStatus.percentage)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stockStatus.label}</p>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <button
            onClick={() => onViewDetails(part)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Details</span>
          </button>

          <div className="relative group/actions">
            <button className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all duration-200 z-10">
              <div className="py-2">
                {canEdit && (
                  <button
                    onClick={() => onEditPart(part)}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4 text-green-600" />
                    <span>Edit Part</span>
                  </button>
                )}

                {canDelete && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    <button
                      onClick={() => onArchivePart(part.id, part.name)}
                      className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Archive className="h-4 w-4" />
                      <span>Archive Part</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartCard;
