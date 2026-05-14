
import React, { useState } from 'react';
import { FilterState, Metric } from '../types';
import { CUSTOMER_OPTIONS, FN_OPTIONS, TYPE_OPTIONS, MONTH_OPTIONS } from '../constants';
import { Search, Mic, CalendarDays, Filter } from 'lucide-react';


interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalRecords: number;
  onMetricSelect: (metric: Metric) => void;
}

const FilterSelect: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
  label: string;
  count: number;
  placeholder?: string;
}> = ({ value, onChange, options, label, count, placeholder }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1 px-1">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-900/20 px-1.5 rounded">{count}</span>
    </div>
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full bg-slate-800/80 border border-slate-600 text-slate-200 text-xs rounded-md px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer hover:border-slate-500 shadow-inner"
      >
        <option value="" disabled>Select {label.toLowerCase()}...</option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-slate-800 text-slate-200">{opt}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  </div>
);

export const FilterPanel: React.FC<Props> = ({ filters, setFilters, totalRecords, onMetricSelect }) => {

  return (
    <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        


        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          <FilterSelect 
            label="Customer"
            count={873}
            value={filters.customer}
            onChange={(val) => setFilters(prev => ({...prev, customer: val}))}
            options={CUSTOMER_OPTIONS}
          />
          <FilterSelect 
            label="Field Notice"
            count={483}
            value={filters.fieldNotice}
            onChange={(val) => setFilters(prev => ({...prev, fieldNotice: val}))}
            options={FN_OPTIONS}
          />
          <FilterSelect 
            label="FN Type"
            count={2}
            value={filters.fnType}
            onChange={(val) => setFilters(prev => ({...prev, fnType: val}))}
            options={TYPE_OPTIONS}
          />
          <FilterSelect 
            label="Time Period"
            count={5}
            value={filters.month}
            onChange={(val) => setFilters(prev => ({...prev, month: val}))}
            options={MONTH_OPTIONS}
          />
        </div>

      </div>

    </div>
  );
};
