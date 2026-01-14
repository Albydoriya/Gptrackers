import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Package,
  TrendingUp,
  AlertTriangle,
  Edit,
  Archive,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FolderOpen
} from 'lucide-react';
import { Part } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { partsService, CategoryWithCount } from '../services/partsService';
import AddPart from './AddPart';
import EditPart from './EditPart';
import Categories from './Categories';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;

function Parts() {
  const { hasPermission } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState(() => {
    return localStorage.getItem('parts_active_sub_tab') || 'parts-list';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(() => {
    return localStorage.getItem('parts_category_filter') || 'all';
  });
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('parts_page_size');
    return saved ? parseInt(saved) : DEFAULT_PAGE_SIZE;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'part_number' | 'current_stock' | 'price'>(() => {
    return (localStorage.getItem('parts_sort_by') as any) || 'name';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    return (localStorage.getItem('parts_sort_order') as any) || 'asc';
  });

  const [parts, setParts] = useState<Part[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryTime, setQueryTime] = useState<number | null>(null);

  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isEditPartOpen, setIsEditPartOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchParts = useCallback(async () => {
    const isInitialLoad = parts.length === 0;

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsSearching(true);
    }

    setError(null);

    try {
      const result = await partsService.searchParts({
        searchTerm: debouncedSearchTerm,
        category: categoryFilter,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder
      });

      setParts(result.parts);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      setQueryTime(result.queryTime || null);
    } catch (err: any) {
      console.error('Error fetching parts:', err);
      setError(err.message || 'Failed to fetch parts');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [debouncedSearchTerm, categoryFilter, currentPage, pageSize, sortBy, sortOrder]);

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesData = await partsService.getCategories();
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    localStorage.setItem('parts_category_filter', categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    localStorage.setItem('parts_page_size', pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    localStorage.setItem('parts_sort_by', sortBy);
    localStorage.setItem('parts_sort_order', sortOrder);
  }, [sortBy, sortOrder]);

  useEffect(() => {
    localStorage.setItem('parts_active_sub_tab', activeSubTab);
  }, [activeSubTab]);

  const handlePartAdded = () => {
    fetchParts();
    fetchCategories();
  };

  const handlePartUpdated = () => {
    fetchParts();
    fetchCategories();
    setIsEditPartOpen(false);
    setEditingPart(null);
  };

  const handleEditPart = (part: Part) => {
    setEditingPart(part);
    setIsEditPartOpen(true);
  };

  const handleViewDetails = async (part: Part) => {
    try {
      const fullPart = await partsService.getPartDetails(part.id);
      if (fullPart) {
        setSelectedPart(fullPart);
      }
    } catch (err: any) {
      console.error('Error loading part details:', err);
      setError('Failed to load part details');
    }
  };

  const handleArchivePart = async (partId: string, partName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to archive "${partName}"?\n\nThis will hide the part from the active catalog but preserve all data and history.`
    );

    if (!confirmed) return;

    setError(null);

    try {
      const { error: archiveError } = await supabase
        .from('parts')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', partId);

      if (archiveError) throw archiveError;

      await fetchParts();
      await fetchCategories();
    } catch (err: any) {
      console.error('Error archiving part:', err);
      setError(`Failed to archive part: ${err.message}`);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setCurrentPage(1);
  };

  const getStockStatus = (part: Part) => {
    if (part.currentStock <= part.minStock) {
      return { status: 'low', color: 'text-red-600 bg-red-50', label: 'Low Stock' };
    } else if (part.currentStock <= part.minStock * 1.5) {
      return { status: 'medium', color: 'text-yellow-600 bg-yellow-50', label: 'Medium Stock' };
    }
    return { status: 'good', color: 'text-green-600 bg-green-50', label: 'Good Stock' };
  };

  const getCurrentPrice = (part: Part) => {
    if (part.priceHistory && part.priceHistory.length === 0) return 0;
    return part.retailPrice || 0;
  };

  const activeFiltersCount = (searchTerm ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0);
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Parts Catalog</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveSubTab('parts-list')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSubTab === 'parts-list'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Parts List</span>
            </button>
            <button
              onClick={() => setActiveSubTab('category-management')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSubTab === 'category-management'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              <span>Category Management</span>
            </button>
          </nav>
        </div>
      </div>

      {activeSubTab === 'parts-list' && (
        <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Manage Parts</h2>
          <button
            onClick={() => {
              fetchParts();
              fetchCategories();
            }}
            disabled={isLoading || isSearching}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh parts"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isSearching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        {hasPermission('parts', 'create') && (
          <button
            onClick={() => setIsAddPartOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Part</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchParts}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by part number or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(({ category, count }) => (
                  <option key={category} value={category}>
                    {category} ({count})
                  </option>
                ))}
              </select>
            </div>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="part_number-asc">Part Number A-Z</option>
              <option value="part_number-desc">Part Number Z-A</option>
              <option value="current_stock-asc">Stock Low to High</option>
              <option value="current_stock-desc">Stock High to Low</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  Category: {categoryFilter}
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear all filters
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {totalCount > 0 ? (
                <>
                  Showing {startIndex}-{endIndex} of {totalCount} parts
                  {queryTime && <span className="ml-2 text-gray-400">({queryTime.toFixed(0)}ms)</span>}
                </>
              ) : (
                'No parts found'
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: pageSize > 25 ? 12 : 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start space-x-3 mb-4">
                <div className="p-2 bg-gray-200 rounded-lg w-12 h-12"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : parts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
          <p className="text-gray-600 mb-4">
            {activeFiltersCount > 0
              ? 'No parts match your current search criteria'
              : 'No parts have been added to the catalog yet'
            }
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parts.map((part) => {
              const stockStatus = getStockStatus(part);
              const currentPrice = getCurrentPrice(part);

              return (
                <div key={part.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{part.name}</h3>
                          <p className="text-sm text-gray-600">{part.partNumber}</p>
                        </div>
                      </div>

                      <div className="relative group">
                        <button className="flex items-center space-x-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                          <span className="text-sm font-medium">Actions</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="py-2">
                            <button
                              onClick={() => handleViewDetails(part)}
                              className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <BarChart3 className="h-4 w-4 text-blue-600" />
                              <span>View Details</span>
                            </button>

                            {hasPermission('parts', 'update') && (
                              <button
                                onClick={() => handleEditPart(part)}
                                className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="h-4 w-4 text-green-600" />
                                <span>Edit Part</span>
                              </button>
                            )}

                            {hasPermission('parts', 'delete') && (
                              <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={() => handleArchivePart(part.id, part.name)}
                                  className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{part.description}</p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Category</span>
                        <span className="text-sm font-medium text-gray-900">{part.category}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Retail Price</span>
                        <span className="text-sm font-medium text-gray-900">${currentPrice.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Stock Level</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {part.currentStock} / {part.minStock}
                          </span>
                          {stockStatus.status === 'low' && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>

                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm border rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedPart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedPart.name} - Details
                </h3>
                <button
                  onClick={() => setSelectedPart(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Part Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Part Number:</span>
                      <span className="font-medium text-gray-900">{selectedPart.partNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium text-gray-900">{selectedPart.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Stock:</span>
                      <span className="font-medium text-gray-900">{selectedPart.currentStock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minimum Stock:</span>
                      <span className="font-medium text-gray-900">{selectedPart.minStock}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Specifications</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedPart.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Pricing Tiers (With GST)</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Internal Usage:</span>
                    <span className="font-medium text-gray-900">
                      ${selectedPart.internalUsagePrice?.toFixed(2)} ({selectedPart.internalUsageMarkupPercentage?.toFixed()}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wholesale:</span>
                    <span className="font-medium text-gray-900">
                      ${selectedPart.wholesalePrice?.toFixed(2)} ({selectedPart.wholesaleMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trade:</span>
                    <span className="font-medium text-gray-900">
                      ${selectedPart.tradePrice?.toFixed(2)} ({selectedPart.tradeMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retail:</span>
                    <span className="font-medium text-gray-900">
                      ${selectedPart.retailPrice?.toFixed(2)} ({selectedPart.retailMarkupPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {(selectedPart.actualWeightKg || selectedPart.lengthCm || selectedPart.widthCm || selectedPart.heightCm) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Weight & Dimensions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPart.actualWeightKg && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual Weight:</span>
                        <span className="font-medium text-gray-900">{selectedPart.actualWeightKg.toFixed(3)} kg</span>
                      </div>
                    )}
                    {selectedPart.volumetricWeightKg && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Volumetric Weight:</span>
                        <span className="font-medium text-gray-900">{selectedPart.volumetricWeightKg.toFixed(3)} kg</span>
                      </div>
                    )}
                    {selectedPart.chargeableWeightKg && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Chargeable Weight:</span>
                        <span className="font-semibold text-green-600">{selectedPart.chargeableWeightKg.toFixed(3)} kg</span>
                      </div>
                    )}
                    {(selectedPart.lengthCm && selectedPart.widthCm && selectedPart.heightCm) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions (L×W×H):</span>
                        <span className="font-medium text-gray-900">
                          {selectedPart.lengthCm} × {selectedPart.widthCm} × {selectedPart.heightCm} cm
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedPart.priceHistory && selectedPart.priceHistory.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Price History</h4>
                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {selectedPart.priceHistory.map((history, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(history.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              ${history.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {history.supplier}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {history.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {activeSubTab === 'category-management' && (
        <Categories onRefresh={fetchCategories} />
      )}

      <AddPart
        isOpen={isAddPartOpen}
        onClose={() => setIsAddPartOpen(false)}
        onPartAdded={handlePartAdded}
      />

      <EditPart
        isOpen={isEditPartOpen}
        onClose={() => {
          setIsEditPartOpen(false);
          setEditingPart(null);
        }}
        onPartUpdated={handlePartUpdated}
        part={editingPart}
      />
    </div>
  );
}

export default Parts;
