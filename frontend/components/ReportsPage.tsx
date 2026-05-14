import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Download, FileText, BarChart3, Users, Shield, 
  AlertTriangle, ShieldAlert, Calendar, Filter, RefreshCw,
  Loader2, ChevronDown, TrendingUp, Building2, Database
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface FieldNoticeReport {
  rank: number;
  fieldNoticeId: string;
  fnTitle: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
  fnType: string;
}

interface CustomerReport {
  rank: number;
  customerName: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
  recordCount: number;
}

interface ReportsResponse {
  fieldNotices: FieldNoticeReport[];
  customers: CustomerReport[];
  summary: {
    totalVulnerable: number;
    totalPotentiallyVulnerable: number;
    totalNotVulnerable: number;
    totalRecords: number;
    uniqueFieldNotices: number;
    uniqueCustomers: number;
  };
  lastUpdated: string;
  year: number;
}

interface ReportsPageProps {
  onBack: () => void;
  onViewRecords?: () => void;
}

type ReportType = 'year-wide' | 'monthly' | 'quarterly';

export function ReportsPage({ onBack, onViewRecords }: ReportsPageProps) {
  const [reportType, setReportType] = useState<ReportType>('year-wide');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [topN, setTopN] = useState(50);

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('year', selectedYear.toString());
    params.set('reportType', reportType);
    params.set('topN', topN.toString());
    return params.toString();
  }, [selectedYear, reportType, topN]);

  // Fetch reports data
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsFetching(true);
    setIsError(false);
    
    try {
      const response = await fetch(`/api/reports/kpi?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('[ReportsPage] Error fetching reports:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Format numbers with commas
  const formatNumber = (num: number) => num?.toLocaleString() || '0';

  // Export to CSV
  const exportFieldNoticesToCSV = () => {
    if (!data?.fieldNotices) return;
    
    const headers = ['Rank', 'Field Notice ID', 'Title', 'Total Vulnerable', 'Potentially Vulnerable', 'Not Vulnerable'];
    const rows = data.fieldNotices.map(fn => [
      fn.rank,
      fn.fieldNoticeId,
      `"${fn.fnTitle.replace(/"/g, '""')}"`,
      fn.totVuln,
      fn.potVuln,
      fn.notVuln
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `field-notices-report-${selectedYear}.csv`;
    a.click();
  };

  const exportCustomersToCSV = () => {
    if (!data?.customers) return;
    
    const headers = ['Rank', 'Customer Name', 'Total Vulnerable', 'Potentially Vulnerable', 'Not Vulnerable', 'Records'];
    const rows = data.customers.map(c => [
      c.rank,
      `"${c.customerName.replace(/"/g, '""')}"`,
      c.totVuln,
      c.potVuln,
      c.notVuln,
      c.recordCount
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-report-${selectedYear}.csv`;
    a.click();
  };

  // Calculate totals for field notices table
  const fnTotals = useMemo(() => {
    if (!data?.fieldNotices) return { totVuln: 0, potVuln: 0, notVuln: 0 };
    return data.fieldNotices.reduce((acc, fn) => ({
      totVuln: acc.totVuln + fn.totVuln,
      potVuln: acc.potVuln + fn.potVuln,
      notVuln: acc.notVuln + fn.notVuln,
    }), { totVuln: 0, potVuln: 0, notVuln: 0 });
  }, [data?.fieldNotices]);

  // Calculate totals for customers table
  const customerTotals = useMemo(() => {
    if (!data?.customers) return { totVuln: 0, potVuln: 0, notVuln: 0 };
    return data.customers.reduce((acc, c) => ({
      totVuln: acc.totVuln + c.totVuln,
      potVuln: acc.potVuln + c.potVuln,
      notVuln: acc.notVuln + c.notVuln,
    }), { totVuln: 0, potVuln: 0, notVuln: 0 });
  }, [data?.customers]);

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,rgba(20,40,80,0.4),rgba(15,23,42,0.9))] text-slate-300 pb-20">
      
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
                <BarChart3 className="text-indigo-400" size={24} />
                KPI Reports
              </h1>
              <p className="ds-page-subtitle">
                Comprehensive vulnerability metrics and key performance indicators
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            <button 
              onClick={() => fetchReports()}
              disabled={isFetching}
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-all"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              <span className="text-xs uppercase tracking-wider font-bold">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 max-w-[1920px] mx-auto space-y-6">
        
        {/* Report Controls */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-slate-400" size={18} />
              <span className="text-sm text-slate-400 font-medium">Report Period</span>
            </div>
            
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="year-wide">Year-wide Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="quarterly">Quarterly Report</option>
            </select>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-slate-400">Show Top</span>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mr-3" />
            <span className="text-slate-400 uppercase tracking-widest text-sm">Generating Reports...</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 text-rose-400">
            <AlertTriangle size={48} className="mb-4" />
            <p className="text-lg font-bold uppercase tracking-wider">Failed to Generate Reports</p>
            <button 
              onClick={() => fetchReports()}
              className="mt-4 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Reports Content */}
        {!isLoading && !isError && data && (
          <>
            {/* Field Notices Report */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/80">
                <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-3">
                    <FileText className="text-indigo-400" size={20} />
                    Top {topN} Field Notices by Vulnerability Count
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Data for {selectedYear} - Last updated {new Date(data.lastUpdated).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={exportFieldNoticesToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 border-b border-slate-700/50 bg-slate-900/30">
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Vulnerable</p>
                  <p className="text-2xl font-bold text-rose-400">{formatNumber(fnTotals.totVuln)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Potentially Vulnerable</p>
                  <p className="text-2xl font-bold text-amber-400">{formatNumber(fnTotals.potVuln)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Not Vulnerable</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatNumber(fnTotals.notVuln)}</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-28">Field Notice ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Total Vulnerable</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-36">Potentially Vulnerable</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Not Vulnerable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.fieldNotices.map((fn, idx) => (
                      <tr key={`${fn.fieldNoticeId}-${idx}`} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-slate-500 font-mono">{fn.rank}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-cyan-400 font-bold">{fn.fieldNoticeId}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 max-w-md">
                          <span className="line-clamp-2">{fn.fnTitle}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${fn.totVuln > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {formatNumber(fn.totVuln)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${fn.potVuln > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                            {formatNumber(fn.potVuln)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${fn.notVuln > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {formatNumber(fn.notVuln)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customers Report */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/80">
                <div>
                  <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-3">
                    <Building2 className="text-cyan-400" size={20} />
                    Top {topN} Customers by Vulnerability Count
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Data for {selectedYear} - Last updated {new Date(data.lastUpdated).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={exportCustomersToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 border-b border-slate-700/50 bg-slate-900/30">
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Vulnerable</p>
                  <p className="text-2xl font-bold text-rose-400">{formatNumber(customerTotals.totVuln)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Potentially Vulnerable</p>
                  <p className="text-2xl font-bold text-amber-400">{formatNumber(customerTotals.potVuln)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Not Vulnerable</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatNumber(customerTotals.notVuln)}</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Name</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Total Vulnerable</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-36">Potentially Vulnerable</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Not Vulnerable</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Records</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.customers.map((customer, idx) => (
                      <tr key={`${customer.customerName}-${idx}`} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-slate-500 font-mono">{customer.rank}</td>
                        <td className="px-4 py-3">
                          <span className="text-white font-medium">{customer.customerName}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${customer.totVuln > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {formatNumber(customer.totVuln)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${customer.potVuln > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                            {formatNumber(customer.potVuln)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono font-bold ${customer.notVuln > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {formatNumber(customer.notVuln)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-slate-400">{formatNumber(customer.recordCount)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg font-bold text-sm uppercase tracking-wider transition-all"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </button>
              {onViewRecords && (
                <button
                  onClick={onViewRecords}
                  className="flex items-center gap-2 px-6 py-3 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Database size={16} />
                  View Records
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
