import React from 'react';
import { 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  PhoneOff, 
  XCircle, 
  CalendarCheck, 
  Users,
  TrendingUp
} from 'lucide-react';
import { CallMetrics } from '../types';

interface MetricCardsProps {
  metrics: CallMetrics;
  roleName: string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  // Compute percentages for visual progress bars
  const callPercentage = metrics.totalLeads > 0 
    ? Math.round((metrics.totalCalled / metrics.totalLeads) * 100) 
    : 0;

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Top Telemetry Header */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-0.5 sm:px-1">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-[11px] sm:text-xs font-bold text-slate-800 tracking-tight">
          Live Calls Velocity
        </span>
      </div>

      {/* Modern 7-Column Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3 lg:gap-3.5">
        {/* 1. Total Leads (hidden on mobile view) */}
        <div 
          id="metric-total-leads" 
          className="hidden sm:flex bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-5.5 shadow-2xs sm:shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex-col justify-between min-h-[125px] sm:min-h-[145px]"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-300"></div>
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-1.5">
              <span className="text-[8.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate">Total Leads</span>
              <div className="p-1 sm:p-2 rounded-md sm:rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-slate-900 tracking-tight mt-0.5">
              {metrics.totalLeads}
            </div>
          </div>
          <div>
            <div className="mt-1 sm:mt-2 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-500">
              <span className="truncate">{metrics.uncalledCount} pending</span>
              <span className="font-semibold text-slate-700 shrink-0 ml-1">{100 - callPercentage}%</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-slate-400 rounded-full" style={{ width: `${100 - callPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* 2. Total Called (Deduplicated Unique Calls) */}
        <div 
          id="metric-total-called" 
          className="bg-white border border-blue-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-5.5 shadow-2xs sm:shadow-xs hover:shadow-md transition-all relative overflow-hidden group bg-gradient-to-b from-blue-50/30 to-white flex flex-col justify-between min-h-[125px] sm:min-h-[145px]"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
          <div>
            <div className="flex items-center justify-between text-blue-700 mb-1 sm:mb-1.5">
              <span className="text-[8.5px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Total Called</span>
              <div className="p-1 sm:p-2 rounded-md sm:rounded-xl bg-blue-100 text-blue-700 group-hover:bg-blue-200 transition-colors shrink-0">
                <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-blue-950 tracking-tight mt-0.5">
              {metrics.totalCalled}
            </div>
          </div>
          <div>
            <div className="mt-1 sm:mt-2 flex items-center justify-between text-[8px] sm:text-[10px] text-blue-700 font-medium">
              <span className="truncate">Reached</span>
              <span className="font-bold shrink-0 ml-1">{callPercentage}%</span>
            </div>
            <div className="w-full h-1 bg-blue-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${callPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* 3. Total Success */}
        <div 
          id="metric-total-success" 
          className="bg-white border border-emerald-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-5.5 shadow-2xs sm:shadow-xs hover:shadow-md transition-all relative overflow-hidden group bg-gradient-to-b from-emerald-50/30 to-white flex flex-col justify-between min-h-[125px] sm:min-h-[145px]"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
          <div>
            <div className="flex items-center justify-between text-emerald-700 mb-1 sm:mb-1.5">
              <span className="text-[8.5px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Success</span>
              <div className="p-1 sm:p-2 rounded-md sm:rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 transition-colors shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-emerald-950 tracking-tight mt-0.5">
              {metrics.totalSuccess}
            </div>
          </div>
          <div>
            <div className="mt-1 sm:mt-2 flex items-center justify-between text-[8px] sm:text-[10px] text-emerald-700 font-medium">
              <span className="flex items-center gap-0.5 truncate">
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Conv.
              </span>
              <span className="font-bold shrink-0 ml-1">{metrics.conversionRate}%</span>
            </div>
            <div className="w-full h-1 bg-emerald-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${metrics.conversionRate}%` }} />
            </div>
          </div>
        </div>

        {/* 4. Total In-Progress */}
        <div 
          id="metric-total-in-progress" 
          className="bg-white border border-amber-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-5.5 shadow-2xs sm:shadow-xs hover:shadow-md transition-all relative overflow-hidden group bg-gradient-to-b from-amber-50/30 to-white flex flex-col justify-between min-h-[125px] sm:min-h-[145px]"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          <div>
            <div className="flex items-center justify-between text-amber-700 mb-1 sm:mb-1.5">
              <span className="text-[8.5px] sm:text-[11px] font-bold uppercase tracking-wider truncate">In-Prog</span>
              <div className="p-1 sm:p-2 rounded-md sm:rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-200 transition-colors shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-amber-950 tracking-tight mt-0.5">
              {metrics.totalInProgress}
            </div>
          </div>
          <div>
            <div className="mt-1 sm:mt-2 flex items-center justify-between text-[8px] sm:text-[10px] text-amber-700">
              <span className="truncate">Negotiating</span>
              <span className="font-semibold shrink-0 ml-1">{metrics.totalCalled > 0 ? Math.round((metrics.totalInProgress / metrics.totalCalled) * 100) : 0}%</span>
            </div>
            <div className="w-full h-1 bg-amber-100 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full" 
                style={{ width: `${metrics.totalCalled > 0 ? (metrics.totalInProgress / metrics.totalCalled) * 100 : 0}%` }} 
              />
            </div>
          </div>
        </div>

        {/* 5. Total Not Available */}
        <div 
          id="metric-total-not-available" 
          className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-5.5 shadow-2xs sm:shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between min-h-[125px] sm:min-h-[145px]"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400"></div>
          <div>
            <div className="flex items-center justify-between text-slate-600 mb-1 sm:mb-1.5">
              <span className="text-[8.5px] sm:text-[11px] font-bold uppercase tracking-wider truncate">No Answer</span>
              <div className="p-1 sm:p-2 rounded-md sm:rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors shrink-0">
                <PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-slate-800 tracking-tight mt-0.5">
              {metrics.totalNotAvailable}
            </div>
          </div>
          <div>
            <div className="mt-1 sm:mt-2 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-500">
              <span className="truncate">Unreached</span>
              <span className="font-semibold shrink-0 ml-1">{metrics.totalCalled > 0 ? Math.round((metrics.totalNotAvailable / metrics.totalCalled) * 100) : 0}%</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-slate-400 rounded-full" 
                style={{ width: `${metrics.totalCalled > 0 ? (metrics.totalNotAvailable / metrics.totalCalled) * 100 : 0}%` }} 
              />
            </div>
          </div>
        </div>

        {/* 6. Total Rejected */}
        <div 
          id="metric-total-rejected" 
          className="bg-white border border-rose-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-5.5 shadow-2xs sm:shadow-xs hover:shadow-md transition-all relative overflow-hidden group bg-gradient-to-b from-rose-50/30 to-white flex flex-col justify-between min-h-[125px] sm:min-h-[145px]"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
          <div>
            <div className="flex items-center justify-between text-rose-700 mb-1 sm:mb-1.5">
              <span className="text-[8.5px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Rejected</span>
              <div className="p-1 sm:p-2 rounded-md sm:rounded-xl bg-rose-100 text-rose-700 group-hover:bg-rose-200 transition-colors shrink-0">
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-rose-950 tracking-tight mt-0.5">
              {metrics.totalRejected}
            </div>
          </div>
          <div>
            <div className="mt-1 sm:mt-2 flex items-center justify-between text-[8px] sm:text-[10px] text-rose-600">
              <span className="truncate">Declined</span>
              <span className="font-semibold shrink-0 ml-1">{metrics.totalCalled > 0 ? Math.round((metrics.totalRejected / metrics.totalCalled) * 100) : 0}%</span>
            </div>
            <div className="w-full h-1 bg-rose-100 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full" 
                style={{ width: `${metrics.totalCalled > 0 ? (metrics.totalRejected / metrics.totalCalled) * 100 : 0}%` }} 
              />
            </div>
          </div>
        </div>

        {/* 7. Appointments */}
        <div 
          id="metric-total-appointments" 
          className="bg-white border border-red-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 md:p-5.5 shadow-2xs sm:shadow-xs hover:shadow-md transition-all relative overflow-hidden group bg-gradient-to-b from-red-50/30 to-white flex flex-col justify-between min-h-[125px] sm:min-h-[145px]"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
          <div>
            <div className="flex items-center justify-between text-red-700 mb-1 sm:mb-1.5">
              <span className="text-[8.5px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Appoint.</span>
              <div className="p-1 sm:p-2 rounded-md sm:rounded-xl bg-red-100 text-red-700 group-hover:bg-red-200 transition-colors shrink-0">
                <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl lg:text-4xl font-black text-red-950 tracking-tight mt-0.5">
              {metrics.totalAppointments}
            </div>
          </div>
          <div>
            <div className="mt-1 sm:mt-2 flex items-center justify-between text-[8px] sm:text-[10px] text-red-700">
              <span className="truncate">Booked</span>
              <span className="font-bold shrink-0 ml-1">Active</span>
            </div>
            <div className="w-full h-1 bg-red-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-red-600 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
