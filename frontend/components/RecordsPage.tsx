import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Search, Plus, Download, Upload, Filter, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, Shield, ShieldAlert, Database,
  ArrowUpDown, ArrowUp, ArrowDown, X, FileText,
  Loader2, RefreshCw, Eye, Edit, Trash2, MoreHorizontal
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

// Record interface matching backend data
interface FieldNoticeRecord {
  id: string;
  fieldNoticeId: string;
  cpyKey: string;
  customerName: string;
  potVuln: number;
  notVuln: number;
  totVuln: number;
  fnType: string;
  fnTitle: string;
  month: string;
  dateImported: string;
}

interface RecordsResponse {
  records: FieldNoticeRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    secureCount: number;
    potentiallyVulnerableCount: number;
    highRiskCount: number;
    totalPotVuln: number;
    totalNotVuln: number;
    totalTotVuln: number;
  };
  filters: {
    customers: string[];
    fieldNotices: string[];
    fnTypes: string[];
  };
}

interface RecordsPageProps {
  onBack: () => void;
}

type SortField = 'fieldNoticeId' | 'cpyKey' | 'customerName' | 'potVuln' | 'notVuln' | 'totVuln';
type SortDirection = 'asc' | 'desc';

export function RecordsPage({ onBack }: RecordsPageProps) {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFieldNotice, setSelectedFieldNotice] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedFnType, setSelectedFnType] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('fieldNoticeId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FieldNoticeRecord | null>(null);

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('pageSize', pageSize.toString());
    params.set('sortField', sortField);
    params.set('sortDirection', sortDirection);
    
    if (searchQuery) params.set('search', searchQuery);
    if (selectedFieldNotice) params.set('fieldNotice', selectedFieldNotice);
    if (selectedCustomer) params.set('customer', selectedCustomer);
    if (selectedFnType) params.set('fnType', selectedFnType);
    
    return params.toString();
  }, [currentPage, pageSize, sortField, sortDirection, searchQuery, selectedFieldNotice, selectedCustomer, selectedFnType]);

  // Fetch records from API
  const [data, setData] = useState<RecordsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchRecords = useCallback(async () => {
    setIsFetching(true);
    setIsError(false);
    
    try {
      const response = await fetch(`/api/records?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch records');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('[RecordsPage] Error fetching records:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }, [sortField]);

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-slate-500" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="text-cyan-400" />
      : <ArrowDown size={14} className="text-cyan-400" />;
  };

  // Handle search with debounce
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFieldNotice('');
    setSelectedCustomer('');
    setSelectedFnType('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedFieldNotice || selectedCustomer || selectedFnType;

  // Format numbers with commas
  const formatNumber = (num: number) => num.toLocaleString();

  // Get vulnerability status color
  const getVulnStatusColor = (potVuln: number, notVuln: number) => {
    if (potVuln === 0 && notVuln > 0) return 'emerald';
    if (potVuln > notVuln) return 'rose';
    if (potVuln > 0) return 'amber';
    return 'slate';
  };

  // Pagination helpers
  const totalPages = data?.totalPages || 1;
  const startRecord = ((currentPage - 1) * pageSize) + 1;
  const endRecord = Math.min(currentPage * pageSize, data?.totalCount || 0);

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,rgba(20,40,80,0.4),rgba(15,23,42,0.9))] text-slate-300">
      
      {/* Header */}
      <header className="ds-page-header">
        <div className="ds-page-header-inner">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="ds-back-btn"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <h1 className="ds-page-title flex items-center gap-3">
                <Database className="text-cyan-400" size={24} />
                Field Notice Records
              </h1>
              <p className="ds-page-subtitle">
                Manage and view Cisco field notice records with vulnerability assessments
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <button 
              onClick={() => fetchRecords()}
              disabled={isFetching}
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-all"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              <span className="text-xs uppercase tracking-wider font-bold">Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-all">
              <Download size={16} />
              <span className="text-xs uppercase tracking-wider font-bold">Export</span>
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Plus size={16} />
              <span>Add Record</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 max-w-[1920px] mx-auto space-y-6">
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <FileText className="text-cyan-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Records</p>
                <p className="text-2xl font-bold text-white">{formatNumber(data?.totalCount || 0)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Shield className="text-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Secure Records</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatNumber(data?.stats?.secureCount || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatNumber(data?.stats?.totalNotVuln || 0)} assets
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <AlertTriangle className="text-amber-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Potentially Vulnerable</p>
                <p className="text-2xl font-bold text-amber-400">
                  {formatNumber(data?.stats?.potentiallyVulnerableCount || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatNumber(data?.stats?.totalPotVuln || 0)} assets
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <ShieldAlert className="text-rose-400" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">High Risk</p>
                <p className="text-2xl font-bold text-rose-400">
                  {formatNumber(data?.stats?.highRiskCount || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatNumber(data?.stats?.totalTotVuln || 0)} vulnerable assets
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by Field Notice ID, CPY Key, or Customer Name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedFieldNotice}
                onChange={(e) => { setSelectedFieldNotice(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 min-w-[160px]"
              >
                <option value="">All Field Notices</option>
                {data?.filters.fieldNotices.slice(0, 50).map(fn => (
                  <option key={fn} value={fn}>{fn}</option>
                ))}
              </select>
              
              <select
                value={selectedCustomer}
                onChange={(e) => { setSelectedCustomer(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 min-w-[160px]"
              >
                <option value="">All Customers</option>
                {data?.filters.customers.slice(0, 50).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              
              <select
                value={selectedFnType}
                onChange={(e) => { setSelectedFnType(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 min-w-[140px]"
              >
                <option value="">All Types</option>
                {data?.filters.fnTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 rounded-lg transition-all"
                >
                  <X size={16} />
                  <span className="text-sm font-bold">Clear Filters</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-700/50">
              <span className="text-xs text-slate-400 uppercase tracking-wider py-1">Active Filters:</span>
              {searchQuery && (
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-medium flex items-center gap-2">
                  Search: "{searchQuery}"
                  <button onClick={() => handleSearch('')} className="hover:text-white"><X size={12} /></button>
                </span>
              )}
              {selectedFieldNotice && (
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium flex items-center gap-2">
                  {selectedFieldNotice}
                  <button onClick={() => setSelectedFieldNotice('')} className="hover:text-white"><X size={12} /></button>
                </span>
              )}
              {selectedCustomer && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium flex items-center gap-2">
                  {selectedCustomer}
                  <button onClick={() => setSelectedCustomer('')} className="hover:text-white"><X size={12} /></button>
                </span>
              )}
              {selectedFnType && (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium flex items-center gap-2">
                  {selectedFnType}
                  <button onClick={() => setSelectedFnType('')} className="hover:text-white"><X size={12} /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Records Table */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/80">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Records</h2>
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs font-bold">
                {formatNumber(data?.totalCount || 0)}
              </span>
              <span className="text-xs text-slate-400">
                Unique records by Field Notice ID, CPY Key, and Customer Name
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mr-3" />
              <span className="text-slate-400 uppercase tracking-widest text-sm">Loading Records...</span>
            </div>
          )}
          
          {/* Error State */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-rose-400">
              <AlertTriangle size={48} className="mb-4" />
              <p className="text-lg font-bold uppercase tracking-wider">Failed to Load Records</p>
              <button 
                onClick={() => fetchRecords()}
                className="mt-4 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-sm"
              >
                Try Again
              </button>
            </div>
          )}
          
          {/* Table */}
          {!isLoading && !isError && data && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input type="checkbox" className="rounded bg-slate-700 border-slate-600" />
                    </th>
                    <th 
                      onClick={() => handleSort('fieldNoticeId')}
                      className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Field Notice ID
                        {renderSortIcon('fieldNoticeId')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('cpyKey')}
                      className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        CPY Key
                        {renderSortIcon('cpyKey')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('customerName')}
                      className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Customer Name
                        {renderSortIcon('customerName')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      FN Type
                    </th>
                    <th 
                      onClick={() => handleSort('potVuln')}
                      className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-2">
                        POT_VULN
                        {renderSortIcon('potVuln')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('notVuln')}
                      className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center justify-end gap-2">
                        NOT_VULN
                        {renderSortIcon('notVuln')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {data.records.map((record, idx) => {
                    const statusColor = getVulnStatusColor(record.potVuln, record.notVuln);
                    return (
                      <tr 
                        key={record.id || idx}
                        className="hover:bg-slate-700/30 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded bg-slate-700 border-slate-600" />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-cyan-400 font-bold">{record.fieldNoticeId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-slate-300">{record.cpyKey}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white font-medium">{record.customerName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            record.fnType === 'Hardware' 
                              ? 'bg-indigo-500/20 text-indigo-300' 
                              : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {record.fnType || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${
                            record.potVuln > 0 ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            {formatNumber(record.potVuln)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${
                            record.notVuln > 0 ? 'text-emerald-400' : 'text-slate-500'
                          }`}>
                            {formatNumber(record.notVuln)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                            statusColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-300' :
                            statusColor === 'amber' ? 'bg-amber-500/20 text-amber-300' :
                            statusColor === 'rose' ? 'bg-rose-500/20 text-rose-300' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {statusColor === 'emerald' && <Shield size={12} />}
                            {statusColor === 'amber' && <AlertTriangle size={12} />}
                            {statusColor === 'rose' && <ShieldAlert size={12} />}
                            {statusColor === 'emerald' ? 'Secure' : 
                             statusColor === 'amber' ? 'At Risk' : 
                             statusColor === 'rose' ? 'Critical' : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setSelectedRecord(record)}
                              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-all"
                              title="Edit Record"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {!isLoading && data && data.totalCount > 0 && (
            <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between bg-slate-800/80">
              <div className="text-sm text-slate-400">
                Showing <span className="font-bold text-white">{formatNumber(startRecord)}</span> to{' '}
                <span className="font-bold text-white">{formatNumber(endRecord)}</span> of{' '}
                <span className="font-bold text-white">{formatNumber(data.totalCount)}</span> records
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronsLeft size={18} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center gap-1 px-2">
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
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
                        className={`w-8 h-8 rounded text-sm font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-cyan-500 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoading && data && data.records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Database size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-bold uppercase tracking-wider">No Records Found</p>
              <p className="text-sm mt-2">Try adjusting your search or filters</p>
              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-sm font-bold"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Record Details</h3>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Field Notice ID</p>
                  <p className="text-xl font-mono font-bold text-cyan-400">{selectedRecord.fieldNoticeId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">CPY Key</p>
                  <p className="text-xl font-mono text-white">{selectedRecord.cpyKey}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Customer Name</p>
                <p className="text-lg font-bold text-white">{selectedRecord.customerName}</p>
              </div>
              {selectedRecord.fnTitle && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Field Notice Title</p>
                  <p className="text-sm text-slate-300">{selectedRecord.fnTitle}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                  <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">Potentially Vulnerable</p>
                  <p className="text-2xl font-bold text-amber-400">{formatNumber(selectedRecord.potVuln)}</p>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-4 text-center">
                  <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Not Vulnerable</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatNumber(selectedRecord.notVuln)}</p>
                </div>
                <div className="bg-rose-500/10 rounded-lg p-4 text-center">
                  <p className="text-xs text-rose-400 uppercase tracking-wider mb-1">Total Vulnerable</p>
                  <p className="text-2xl font-bold text-rose-400">{formatNumber(selectedRecord.totVuln)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">FN Type</p>
                  <span className={`px-3 py-1 rounded text-sm font-bold inline-block ${
                    selectedRecord.fnType === 'Hardware' 
                      ? 'bg-indigo-500/20 text-indigo-300' 
                      : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {selectedRecord.fnType || 'N/A'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Month</p>
                  <p className="text-sm text-slate-300">{selectedRecord.month || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg font-bold text-sm uppercase tracking-wider transition-all"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-sm uppercase tracking-wider transition-all">
                Edit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Add New Record</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Field Notice ID</label>
                <input 
                  type="text" 
                  placeholder="FN72290"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">CPY Key</label>
                <input 
                  type="text" 
                  placeholder="55078"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Customer Name</label>
                <input 
                  type="text" 
                  placeholder="Enter customer name"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">POT_VULN</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">NOT_VULN</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg font-bold text-sm uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-sm uppercase tracking-wider transition-all">
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
