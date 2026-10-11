import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  ShieldAlert, 
  X, 
  Building2, 
  User as UserIcon,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { User, BranchInfo, CustomerRecord, isRecordAssignedBySupervisor } from '../types';

interface SetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  targetAgent?: User | null;
  targetBranch?: BranchInfo | null;
  allUsers: User[];
  records: CustomerRecord[];
  onSaveAgentTarget: (agentId: string, weeklyTarget: number, monthlyTarget: number) => void;
  onSaveBranchTarget: (
    branchId: string, 
    baseWeeklyPerAgent: number, 
    baseMonthlyPerAgent: number, 
    totalWeekly: number, 
    totalMonthly: number
  ) => void;
}

export const SetTargetModal: React.FC<SetTargetModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetAgent,
  targetBranch,
  allUsers,
  records,
  onSaveAgentTarget,
  onSaveBranchTarget
}) => {
  const isHQAdmin = currentUser.role === 'HQ_ADMIN';
  const isBranchMode = !!targetBranch;

  // Agent target state
  const [agentWeekly, setAgentWeekly] = useState<number>(50);
  const [agentMonthly, setAgentMonthly] = useState<number>(200);

  // Branch target state
  const [baseWeeklyPerAgent, setBaseWeeklyPerAgent] = useState<number>(50);
  const [baseMonthlyPerAgent, setBaseMonthlyPerAgent] = useState<number>(200);
  const [isCustomTotal, setIsCustomTotal] = useState<boolean>(false);
  const [customTotalWeekly, setCustomTotalWeekly] = useState<number>(200);
  const [customTotalMonthly, setCustomTotalMonthly] = useState<number>(800);

  // Active agents in target branch
  const branchActiveAgents = targetBranch 
    ? allUsers.filter(u => u.branch === targetBranch.name && u.role === 'TEAM_MEMBER' && u.active !== false)
    : [];
  const activeAgentCount = Math.max(1, branchActiveAgents.length);

  // Computed branch totals
  const computedBranchWeekly = isCustomTotal ? customTotalWeekly : baseWeeklyPerAgent * activeAgentCount;
  const computedBranchMonthly = isCustomTotal ? customTotalMonthly : baseMonthlyPerAgent * activeAgentCount;

  // Agent call stats
  const agentRecords = targetAgent ? records.filter(r => 
    (r.assignedAgentId === targetAgent.id || (r.assignedAgentName && r.assignedAgentName.trim().toLowerCase() === targetAgent.name.trim().toLowerCase())) &&
    !isRecordAssignedBySupervisor(r)
  ) : [];
  const agentCalledCount = agentRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;

  // Branch call stats
  const branchRecords = targetBranch ? records.filter(r => r.areaOfReg === targetBranch.name) : [];
  const branchCalledCount = branchRecords.filter(r => r.hasBeenCalled || (r.status && r.status !== 'Uncalled')).length;

  useEffect(() => {
    if (targetAgent) {
      setAgentWeekly(targetAgent.weeklyTarget || 50);
      setAgentMonthly(targetAgent.monthlyTarget || 200);
    }
  }, [targetAgent]);

  useEffect(() => {
    if (targetBranch) {
      const bWeekly = targetBranch.baseWeeklyTargetPerAgent || 50;
      const bMonthly = targetBranch.baseMonthlyTargetPerAgent || 200;
      setBaseWeeklyPerAgent(bWeekly);
      setBaseMonthlyPerAgent(bMonthly);
      
      const count = Math.max(1, allUsers.filter(u => u.branch === targetBranch.name && u.role === 'TEAM_MEMBER' && u.active !== false).length);
      setCustomTotalWeekly(targetBranch.targetCallsWeek || (bWeekly * count));
      setCustomTotalMonthly(targetBranch.targetCallsMonth || (bMonthly * count));
      setIsCustomTotal(false);
    }
  }, [targetBranch, allUsers]);

  if (!isOpen || (!targetAgent && !targetBranch)) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHQAdmin) return;

    if (isBranchMode && targetBranch) {
      onSaveBranchTarget(
        targetBranch.id,
        baseWeeklyPerAgent,
        baseMonthlyPerAgent,
        computedBranchWeekly,
        computedBranchMonthly
      );
      onClose();
    } else if (targetAgent) {
      onSaveAgentTarget(
        targetAgent.id,
        Math.max(1, agentWeekly),
        Math.max(1, agentMonthly)
      );
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {isBranchMode ? `Set Branch Target` : `Set Individual Agent Target`}
                </h3>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-sm text-[9px] sm:text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                  HQ Admin Only
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                {isBranchMode 
                  ? `Configure weekly and monthly targets for ${targetBranch?.name}`
                  : `Configure weekly and monthly targets for ${targetAgent?.name}`
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Check */}
        {!isHQAdmin ? (
          <div className="p-6 sm:p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h4>
            <p className="text-xs text-slate-600 max-w-md mb-6">
              Only HQ Admin users are authorized to set and edit weekly and monthly targets for agents and regional branches.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
            
            {/* Target Overview Card */}
            {isBranchMode && targetBranch ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 text-sm">{targetBranch.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    {targetBranch.region} Region
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[9.5px]">Active Agents</span>
                    <strong className="text-slate-900 text-xs sm:text-sm">{branchActiveAgents.length} Agents</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[9.5px]">Total Leads</span>
                    <strong className="text-slate-900 text-xs sm:text-sm">{branchRecords.length} Leads</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block text-[9.5px]">Calls Made</span>
                    <strong className="text-blue-700 text-xs sm:text-sm">{branchCalledCount} Calls</strong>
                  </div>
                </div>

                {/* Multiplier Info Box */}
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-amber-950 block">Multiplier Logic Active:</strong>
                    <span>Branch targets automatically scale by active agents ({activeAgentCount} active agent{activeAgentCount > 1 ? 's' : ''}).</span>
                  </div>
                </div>
              </div>
            ) : targetAgent ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {targetAgent.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{targetAgent.name}</span>
                      <span className="text-[10px] text-slate-500">{targetAgent.email}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                    {targetAgent.branch}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[9.5px]">Total Assigned Leads</span>
                    <strong className="text-slate-900 text-xs sm:text-sm">{agentRecords.length} Leads</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[9.5px]">Current Calls Made</span>
                    <strong className="text-blue-700 text-xs sm:text-sm">{agentCalledCount} Calls</strong>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Target Inputs Form */}
            {isBranchMode ? (
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Target Calculation Mode</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIsCustomTotal(false)}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        !isCustomTotal ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Multiplied per Agent (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomTotal(true)}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        isCustomTotal ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Direct Total Override
                    </button>
                  </div>
                </div>

                {!isCustomTotal ? (
                  <>
                    {/* Weekly Target Input */}
                    <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>Base Weekly Target per Agent:</span>
                        </label>
                        <span className="text-[11px] font-extrabold text-blue-700">
                          {baseWeeklyPerAgent} calls/agent/week
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={baseWeeklyPerAgent}
                          onChange={(e) => setBaseWeeklyPerAgent(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                        {[25, 40, 50, 75, 100].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBaseWeeklyPerAgent(val)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              baseWeeklyPerAgent === val 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>

                      {/* Calculation Preview */}
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span>Multiplied Branch Weekly Total:</span>
                        <span className="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">
                          {baseWeeklyPerAgent} × {activeAgentCount} agents = {computedBranchWeekly} calls/wk
                        </span>
                      </div>
                    </div>

                    {/* Monthly Target Input */}
                    <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Base Monthly Target per Agent:</span>
                        </label>
                        <span className="text-[11px] font-extrabold text-emerald-700">
                          {baseMonthlyPerAgent} calls/agent/month
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={50000}
                          value={baseMonthlyPerAgent}
                          onChange={(e) => setBaseMonthlyPerAgent(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                        {[100, 150, 200, 300, 400, 500].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBaseMonthlyPerAgent(val)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              baseMonthlyPerAgent === val 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>

                      {/* Calculation Preview */}
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span>Multiplied Branch Monthly Total:</span>
                        <span className="font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded text-xs">
                          {baseMonthlyPerAgent} × {activeAgentCount} agents = {computedBranchMonthly} calls/mo
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Direct Custom Totals */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">Total Branch Weekly Target</label>
                        <input
                          type="number"
                          min={1}
                          value={customTotalWeekly}
                          onChange={(e) => setCustomTotalWeekly(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">Total Branch Monthly Target</label>
                        <input
                          type="number"
                          min={1}
                          value={customTotalMonthly}
                          onChange={(e) => setCustomTotalMonthly(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Agent Mode Inputs */
              <div className="space-y-4">
                {/* Agent Weekly Target */}
                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Weekly Calling Target:</span>
                    </label>
                    <span className="text-[11px] font-extrabold text-blue-700">
                      {agentWeekly} calls / week
                    </span>
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={agentWeekly}
                    onChange={(e) => setAgentWeekly(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                    {[25, 40, 50, 75, 100, 150].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAgentWeekly(val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          agentWeekly === val 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-500 pt-1">
                    Daily average expectation: ~{Math.round(agentWeekly / 5)} calls/day (5-day work week)
                  </div>
                </div>

                {/* Agent Monthly Target */}
                <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Monthly Calling Target:</span>
                    </label>
                    <span className="text-[11px] font-extrabold text-emerald-700">
                      {agentMonthly} calls / month
                    </span>
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={20000}
                    value={agentMonthly}
                    onChange={(e) => setAgentMonthly(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                    {[100, 150, 200, 300, 400, 500].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAgentMonthly(val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          agentMonthly === val 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-500 pt-1">
                    Weekly average pace: ~{Math.round(agentMonthly / 4)} calls/week
                  </div>
                </div>
              </div>
            )}

            {/* Summary Action Bar */}
            <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="btn-submit-save-target"
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Save {isBranchMode ? 'Branch' : 'Agent'} Target</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
