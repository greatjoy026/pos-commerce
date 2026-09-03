import React from 'react';
import { 
  Calendar, Building2, Download, Printer, Filter, 
  Sparkles, RefreshCw, BarChart2, TrendingUp, Layers
} from 'lucide-react';
import { ReportDatePreset, BranchLocation, StaffMember } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';

interface ReportsHeaderProps {
  activeCategory: 'inventory' | 'sales' | 'financial';
  datePreset: ReportDatePreset;
  onDatePresetChange: (preset: ReportDatePreset) => void;
  customStartDate: string;
  onCustomStartDateChange: (date: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (date: string) => void;
  selectedBranchId: string;
  onSelectBranchId: (branchId: string) => void;
  branches: BranchLocation[];
  onExportCSV: () => void;
  onOpenExecutiveModal: () => void;
  activeStaff: StaffMember;
}

export default function ReportsHeader({
  activeCategory,
  datePreset,
  onDatePresetChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  selectedBranchId,
  onSelectBranchId,
  branches,
  onExportCSV,
  onOpenExecutiveModal,
  activeStaff
}: ReportsHeaderProps) {
  const { currentCurrency } = useCurrency();

  const presets: { id: ReportDatePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_quarter', label: 'This Quarter' },
    { id: 'year_to_date', label: 'YTD' },
    { id: 'all_time', label: 'All Time' },
    { id: 'custom', label: 'Custom Range' }
  ];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4" id="reports-analytics-header">
      
      {/* Title & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                Reports & Analytics
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                27 BI Modules
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Multi-channel telemetry, inventory velocity, audited ledgers & financial health
            </p>
          </div>
        </div>

        {/* Global Export & Print Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={onOpenExecutiveModal}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer"
            id="open-executive-summary-btn"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Executive Sheet</span>
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
            id="export-active-report-csv-btn"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon: Date Range Selector & Branch Selector */}
      <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        
        {/* Date Presets Carousel - Smooth Mobile Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1 text-slate-400 mr-1 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] hidden xs:inline">Period:</span>
          </div>
          {presets.map(p => {
            const isActive = datePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onDatePresetChange(p.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Branch / Store Location & Currency Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[11px]">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
              />
              <span className="text-slate-400 text-[10px]">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 outline-none cursor-pointer"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-500 text-[11px] hidden xs:inline">Scope:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => onSelectBranchId(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs font-bold text-slate-800 outline-none cursor-pointer max-w-[140px] sm:max-w-none truncate"
              id="report-branch-select"
            >
              <option value="all">All Branches & Hubs</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          <div className="px-2.5 py-1.5 bg-slate-100 rounded-xl text-[11px] font-mono font-bold text-slate-600 shrink-0">
            {currentCurrency.flag} {currentCurrency.code}
          </div>
        </div>

      </div>

    </div>
  );
}
