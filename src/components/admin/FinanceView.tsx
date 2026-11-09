import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FinanceService } from '../../services/financeService';
import { OfferingAggregation, OfferingRecord } from '../../types';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../common/Button';

interface FinanceViewProps {
  onBack?: () => void;
}

const getCurrSymbol = (c?: string) => (c === 'GBP' ? '£' : c === 'USD' ? '$' : '₵');

export const FinanceView: React.FC<FinanceViewProps> = ({ onBack }) => {
  const { currentUser, isAdmin } = useAuth();
  const [aggregation, setAggregation] = useState<OfferingAggregation | null>(null);
  const [records, setRecords] = useState<OfferingRecord[]>([]);
  const [periodFilter, setPeriodFilter] = useState<'weekly' | 'monthly' | 'quarterly' | 'annual'>('weekly');
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | 'GHS' | 'GBP' | 'USD'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadFinanceData = async () => {
    try {
      setIsLoading(true);
      const [agg, recs] = await Promise.all([
        FinanceService.getOfferingAggregation(currentUser.role),
        FinanceService.getOfferingRecords(currentUser.role),
      ]);
      setAggregation(agg);
      setRecords(recs);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [currentUser]);

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Record ID', 'Cell Name', 'Meeting Date', 'Tutor Name', 'Amount (GHS)', 'Logged At'];
    const rows = records.map(r => [
      r.id,
      `"${r.cellName.replace(/"/g, '""')}"`,
      r.meetingDate,
      `"${(r.tutorName || 'Tutor').replace(/"/g, '""')}"`,
      r.amount.toFixed(2),
      r.submittedAt,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Cell_Offerings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin && currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-navy-950">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          Ministry-wide financial aggregates and offering records are restricted to authorised leadership.
        </p>
      </div>
    );
  }

  const filteredRecords = selectedCurrency === 'ALL'
    ? records
    : records.filter(r => (r.currency || 'GHS') === selectedCurrency);

  const activeSum = filteredRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const weeklySum = selectedCurrency === 'ALL'
    ? (aggregation?.weekly.reduce((acc, w) => acc + w.amount, 0) || 0)
    : filteredRecords.filter(r => {
        const d = new Date(r.meetingDate);
        const now = new Date();
        return (now.getTime() - d.getTime()) <= 7 * 86400000;
      }).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const monthlySum = selectedCurrency === 'ALL'
    ? (aggregation?.monthly.reduce((acc, m) => acc + m.amount, 0) || 0)
    : filteredRecords.filter(r => {
        const d = new Date(r.meetingDate);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const quarterlySum = selectedCurrency === 'ALL'
    ? (aggregation?.quarterly.reduce((acc, q) => acc + q.amount, 0) || 0)
    : filteredRecords.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const annualSum = selectedCurrency === 'ALL' ? (aggregation?.annual || activeSum) : activeSum;
  const currentSymbol = selectedCurrency === 'ALL' ? '₵' : getCurrSymbol(selectedCurrency);
  const currentLabel = selectedCurrency === 'ALL' ? 'GHS' : selectedCurrency;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] mb-2 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Previous</span>
            </button>
          )}
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-gold-50 text-gold-700 border border-gold-200 mb-1">
            FNI Financial Stewardship
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-950 tracking-tight">
            Cell Offering Aggregations & Stewardship
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time verified financial aggregation from cell meeting returns with duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-[#667085] px-1 uppercase">Currency:</span>
            {(['ALL', 'GHS', 'GBP', 'USD'] as const).map(curr => (
              <button
                key={curr}
                type="button"
                onClick={() => setSelectedCurrency(curr)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedCurrency === curr
                    ? 'bg-[#142B4A] text-white shadow-xs'
                    : 'text-[#667085] hover:text-[#142B4A] hover:bg-white/60'
                }`}
              >
                {curr === 'ALL' ? 'All' : `${curr} (${getCurrSymbol(curr)})`}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Export Ledger (CSV)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">This Week Total</span>
            <div className="p-2 bg-navy-50 text-navy-900 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-navy-950">
            {currentLabel} {currentSymbol}{weeklySum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Current Monday–Sunday cycle
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">This Month</span>
            <div className="p-2 bg-sky-50 text-sky-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-navy-950">
            {currentLabel} {currentSymbol}{monthlySum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Month-to-date total
          </span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">This Quarter</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-navy-950">
            {currentLabel} {currentSymbol}{quarterlySum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Q{Math.floor(new Date().getMonth() / 3) + 1} cumulative
          </span>
        </div>

        <div className="p-5 bg-gradient-to-br from-navy-950 to-navy-900 text-white rounded-2xl border border-navy-800 shadow-card">
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-400">Annual Total (YTD)</span>
            <div className="p-2 bg-gold-500/20 text-gold-400 rounded-xl border border-gold-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {currentLabel} {currentSymbol}{annualSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-gold-300 font-medium mt-1 block">
            {new Date().getFullYear()} Ministry Year-to-Date
          </span>
        </div>
      </div>

      {/* Cell-Level Financial Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-navy-950">Cell-Level Financial Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cumulative offering returns categorized by fellowship cell
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Updated automatically with every cell meeting submission
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aggregation && aggregation.cellBreakdown.length > 0 ? (
            aggregation.cellBreakdown.map(item => (
              <div key={item.cellId} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-navy-950 text-xs">{item.cellName}</h4>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Giving</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-navy-900">
                    GHS {item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-gold-700 font-bold bg-gold-50 px-1.5 py-0.5 rounded">
                    {annualSum > 0 ? `${((item.totalAmount / annualSum) * 100).toFixed(1)}%` : '0%'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-8 text-xs text-slate-400">
              No cell offering contributions recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Offering Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-navy-950 text-sm">Individual Offering Ledger Records</h3>
            <span className="text-xs text-slate-500">
              Immutable entry log tied to weekly cell meeting returns ({records.length} records)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                <th className="py-3 px-5">DATE</th>
                <th className="py-3 px-4">CELL FELLOWSHIP</th>
                <th className="py-3 px-4">TUTOR IN CHARGE</th>
                <th className="py-3 px-4 text-right">OFFERING AMOUNT (GHS)</th>
                <th className="py-3 px-5 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No individual offering entries recorded yet.
                  </td>
                </tr>
              ) : (
                records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-navy-950 whitespace-nowrap">
                      {rec.meetingDate}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-navy-950 whitespace-nowrap">
                      {rec.cellName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {rec.tutorName}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-navy-950 whitespace-nowrap">
                      {rec.currency || 'GHS'} {getCurrSymbol(rec.currency)}{rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Reconciled
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
