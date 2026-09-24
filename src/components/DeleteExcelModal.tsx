import React, { useState, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  FileSpreadsheet, 
  ShieldAlert, 
  Search, 
  Users, 
  Database, 
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { User, CustomerRecord, DeleteExcelTarget } from '../types';

interface DeleteExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  records: CustomerRecord[];
  teamMembers: User[];
  initialTarget?: DeleteExcelTarget | null;
  onConfirmDelete: (target: DeleteExcelTarget) => Promise<boolean>;
}

export const DeleteExcelModal: React.FC<DeleteExcelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  records,
  teamMembers,
  initialTarget = null,
  onConfirmDelete
}) => {
  const isHQAdmin = currentUser.role === 'HQ_ADMIN';

  const [step, setStep] = useState<'select' | 'confirm'>(initialTarget ? 'confirm' : 'select');
  const [target, setTarget] = useState<DeleteExcelTarget | null>(initialTarget);
  const [activeTab, setActiveTab] = useState<'byAgent' | 'byBatch' | 'purgeAll'>('byAgent');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmedCheckbox, setIsConfirmedCheckbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync initialTarget changes
  React.useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget);
      setStep('confirm');
      setIsConfirmedCheckbox(false);
    } else {
      setStep('select');
      setTarget(null);
      setIsConfirmedCheckbox(false);
    }
  }, [initialTarget, isOpen]);

  // Aggregate records by Agent
  const agentRosters = useMemo(() => {
    const map = new Map<string, { agent: User; records: CustomerRecord[] }>();
    
    // Seed with all team members
    teamMembers.forEach(tm => {
      map.set(tm.id, { agent: tm, records: [] });
    });

    // Populate records
    records.forEach(r => {
      let agentId = r.assignedAgentId;
      if (!agentId && r.assignedAgentName) {
        const found = teamMembers.find(tm => tm.name.trim().toLowerCase() === r.assignedAgentName.trim().toLowerCase());
        if (found) agentId = found.id;
      }
      if (agentId && map.has(agentId)) {
        map.get(agentId)!.records.push(r);
      }
    });

    return Array.from(map.values())
      .filter(item => item.records.length > 0)
      .sort((a, b) => b.records.length - a.records.length);
  }, [teamMembers, records]);

  // Aggregate records by Batch
  const batchRosters = useMemo(() => {
    const map = new Map<string, CustomerRecord[]>();
    records.forEach(r => {
      const batchKey = r.importedBatchId || 'Initial/Standard Roster';
      if (!map.has(batchKey)) {
        map.set(batchKey, []);
      }
      map.get(batchKey)!.push(r);
    });

    return Array.from(map.entries()).map(([batchId, batchRecords]) => ({
      batchId,
      records: batchRecords,
      sampleDate: batchRecords[0]?.createdAt || batchRecords[0]?.callDate || 'Unknown Date'
    }));
  }, [records]);

  // Filtered agent rosters
  const filteredAgentRosters = useMemo(() => {
    if (!searchQuery.trim()) return agentRosters;
    const q = searchQuery.toLowerCase();
    return agentRosters.filter(r => 
      r.agent.name.toLowerCase().includes(q) ||
      r.agent.branch.toLowerCase().includes(q)
    );
  }, [agentRosters, searchQuery]);

  if (!isOpen) return null;

  const handleSelectAgent = (agent: User, agentRecords: CustomerRecord[]) => {
    setTarget({
      type: 'agent',
      id: agent.id,
      name: `${agent.name}'s Excel Roster`,
      recordCount: agentRecords.length,
      recordIds: agentRecords.map(r => r.id),
      batchDetails: `${agent.branch} Branch`
    });
    setIsConfirmedCheckbox(false);
    setStep('confirm');
  };

  const handleSelectBatch = (batchId: string, batchRecords: CustomerRecord[]) => {
    setTarget({
      type: 'batch',
      id: batchId,
      name: `Excel Import: ${batchId}`,
      recordCount: batchRecords.length,
      recordIds: batchRecords.map(r => r.id),
      batchDetails: `Imported ${batchRecords.length} records`
    });
    setIsConfirmedCheckbox(false);
    setStep('confirm');
  };

  const handleSelectPurgeAll = () => {
    setTarget({
      type: 'all',
      name: 'Entire Customer Records Database',
      recordCount: records.length,
      recordIds: records.map(r => r.id),
      batchDetails: 'All branches and all agents'
    });
    setIsConfirmedCheckbox(false);
    setStep('confirm');
  };

  const handleExecuteDelete = async () => {
    if (!target || isDeleting || !isHQAdmin) return;
    setIsDeleting(true);
    try {
      const success = await onConfirmDelete(target);
      if (success) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <h3 className="text-xs sm:text-base font-bold text-white truncate max-w-[190px] xs:max-w-xs sm:max-w-none">
                  Delete Excel / Customer Records
                </h3>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-sm text-[9px] sm:text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                  HQ Admin Only
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                Permanently purge Excel records from cloud database
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Guard Check */}
        {!isHQAdmin ? (
          <div className="p-6 sm:p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Access Denied</h4>
            <p className="text-xs text-slate-600 max-w-md mb-6">
              Only HQ Admin Users have administrative authorization to delete Excel customer records from the frontend and the remote Supabase database.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : step === 'select' ? (
          /* =========================================================================
             STAGE 1: Select which Excel to Delete
             ========================================================================= */
          <div className="p-4 sm:p-6 flex flex-col max-h-[80vh]">
            {/* Tab Selection */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('byAgent')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'byAgent' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Team Member Roster ({agentRosters.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('byBatch')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'byBatch' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Import Batch ({batchRosters.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('purgeAll')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
                  activeTab === 'purgeAll' ? 'bg-rose-50 text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                Purge All Records
              </button>
            </div>

            {/* TAB 1: By Agent */}
            {activeTab === 'byAgent' && (
              <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px]">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter agent or branch..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                {filteredAgentRosters.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No customer Excel rosters found matching your search.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAgentRosters.map(({ agent, records: agentRecs }) => (
                      <div 
                        key={agent.id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-rose-300 rounded-xl transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                            {agent.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {agent.name}'s Excel
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate">
                              Branch: <span className="font-semibold text-slate-700">{agent.branch}</span> • <strong className="text-rose-600">{agentRecs.length}</strong> customer records
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectAgent(agent, agentRecs)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          title={`Select ${agent.name}'s Excel to delete`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Excel</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: By Batch */}
            {activeTab === 'byBatch' && (
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[220px]">
                {batchRosters.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No imported batch records found.
                  </div>
                ) : (
                  batchRosters.map(({ batchId, records: batchRecs, sampleDate }) => (
                    <div 
                      key={batchId}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-rose-300 rounded-xl transition-all shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0" />
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {batchId}
                          </h4>
                        </div>
                        <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                          Created/Logged: {sampleDate.slice(0, 16)} • <strong className="text-rose-600">{batchRecs.length}</strong> records
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectBatch(batchId, batchRecs)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title={`Select batch ${batchId} to delete`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Batch</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: Purge All */}
            {activeTab === 'purgeAll' && (
              <div className="p-4 sm:p-5 bg-rose-50/70 border border-rose-200 rounded-xl text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                  <Database className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-rose-900 mb-1">
                  Purge Entire Customer Records Database
                </h4>
                <p className="text-xs text-rose-800 leading-relaxed max-w-md mb-4">
                  This will wipe all <strong>{records.length} customer records</strong> currently registered across all branches and team members from both the frontend application and the Supabase cloud database.
                </p>
                <button
                  type="button"
                  onClick={handleSelectPurgeAll}
                  disabled={records.length === 0}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Select Full Purge ({records.length} Records)</span>
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Total customer records active: <strong>{records.length}</strong></span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             STAGE 2: Confirmation Screen (Requires clicking 'Confirm')
             ========================================================================= */
          <div className="p-4 sm:p-6 flex flex-col space-y-4">
            {/* Back button if user started at selection stage */}
            {!initialTarget && (
              <button
                type="button"
                onClick={() => setStep('select')}
                disabled={isDeleting}
                className="self-start text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 mb-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Excel list</span>
              </button>
            )}

            {/* Danger Warning Banner */}
            <div className="p-3 sm:p-4 bg-rose-50 border sm:border-2 border-rose-300/80 rounded-xl flex items-start gap-2.5 sm:gap-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[11px] sm:text-xs text-rose-900 min-w-0 flex-1">
                <h4 className="font-bold text-xs sm:text-sm text-rose-950 mb-0.5 sm:mb-1">
                  Permanent Delete Warning
                </h4>
                <p className="leading-snug sm:leading-relaxed break-words">
                  You are about to permanently delete <strong className="font-extrabold text-rose-950">{target?.recordCount || 0} customer records</strong> for <strong className="font-extrabold text-rose-950">{target?.name}</strong>.
                </p>
              </div>
            </div>

            {/* Target Breakdown Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-[11px] sm:text-xs space-y-2 sm:space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold shrink-0">Target Excel / Roster:</span>
                <span className="font-bold text-slate-900 truncate max-w-full sm:max-w-[280px] text-left sm:text-right" title={target?.name}>
                  {target?.name}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold shrink-0">Records to be Deleted:</span>
                <span className="font-extrabold text-rose-600 text-xs sm:text-sm text-left sm:text-right">
                  {target?.recordCount || 0} Records
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold shrink-0">Deletion Scope:</span>
                <span className="font-medium text-slate-800 text-left sm:text-right break-words">
                  {target?.type === 'agent' ? "Assigned Agent Excel Calling Roster" : 
                   target?.type === 'batch' ? "Imported Excel Batch" : 
                   target?.type === 'records' ? "Custom Selected Customer Records" : "Entire System Database"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2">
                <span className="text-slate-500 font-semibold shrink-0">Authorized HQ Admin:</span>
                <span className="font-semibold text-slate-900 text-left sm:text-right break-all sm:break-normal text-[10.5px] sm:text-xs">
                  {currentUser.name} <span className="text-slate-500 font-normal">({currentUser.email})</span>
                </span>
              </div>
            </div>

            {/* Explicit Acknowledgment Checkbox */}
            <label className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors select-none">
              <input
                id="checkbox-confirm-delete-excel"
                type="checkbox"
                checked={isConfirmedCheckbox}
                onChange={(e) => setIsConfirmedCheckbox(e.target.checked)}
                disabled={isDeleting}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 shrink-0"
              />
              <span className="text-[11px] sm:text-xs text-slate-700 font-medium leading-snug sm:leading-normal">
                I understand this will permanently delete these <strong className="text-slate-900">{target?.recordCount || 0} customer records</strong> and cannot be undone.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50 text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-delete-excel-submit"
                onClick={handleExecuteDelete}
                disabled={!isConfirmedCheckbox || isDeleting}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
