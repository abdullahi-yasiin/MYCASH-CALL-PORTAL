import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Download, 
  Building2, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  TrendingUp, 
  ShieldAlert, 
  MessageSquare, 
  FileText, 
  RefreshCw, 
  CheckSquare, 
  Square,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Filter,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  PhoneCall,
  Loader2,
  Lock
} from 'lucide-react';
import { CustomerRecord, BranchInfo, User } from '../types';
import { runAiIntelligenceAnalysis, generateOfflineHeuristicAnalysis, AiAnalysisResult, isRecordAssignedToAgent, isAppointmentRecord, isRecordInBranch, normalizeBranchName } from '../lib/gemini';
import { generateAiIntelligencePdf } from '../utils/aiPdfExport';

interface AiIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allBranches: BranchInfo[];
  allAgents: User[];
  records: CustomerRecord[];
}

type SelectionMode = 'all-branches' | 'multiple-branches' | 'all-agents' | 'multiple-agents';

export const AiIntelligenceModal: React.FC<AiIntelligenceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allBranches,
  allAgents,
  records
}) => {
  // Fast date extraction helper (normalized to YYYY-MM-DD)
  const extractDateString = (raw?: string | null): string | null => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s || s === '-' || s.toLowerCase() === 'none' || s.toLowerCase() === 'uncalled' || s.toLowerCase() === 'null') return null;
    
    // ISO format: YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      return `${y}-${m}-${d}`;
    }
    // Standard timestamp parse
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
      const dt = new Date(parsed);
      const y = dt.getFullYear();
      if (y >= 2000 && y <= 2100) {
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return null;
  };

  // Helper date generators for quick presets
  const getTodayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getYesterdayIso = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDaysAgoIso = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getFirstDayOfMonthIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  // High-performance single-pass indexer:
  // Aggregates combined branches, agents, canonical mapping, and date tags in one fast O(N) pass.
  // This eliminates modal opening latency and ensures instant rendering.
  const indexedData = useMemo(() => {
    const branchList: BranchInfo[] = [...allBranches];
    const branchLookup = new Map<string, string>(); // cleaned alias -> canonical branch name
    const branchTotalCounts = new Map<string, number>();
    const knownBranchNorms = new Set<string>();
    const knownBranchIds = new Set<string>();

    // 1. Index canonical registered branches
    allBranches.forEach(b => {
      branchTotalCounts.set(b.name, 0);
      knownBranchIds.add(b.id);

      const bLower = b.name.toLowerCase().trim();
      branchLookup.set(bLower, b.name);

      const bNorm = normalizeBranchName(b.name);
      if (bNorm) {
        knownBranchNorms.add(bNorm);
        branchLookup.set(bNorm, b.name);
      }

      const bClean = bLower.replace(/branch|hub|office|central|[_-\s]+/gi, '').trim();
      if (bClean && bClean.length >= 3) {
        branchLookup.set(bClean, b.name);
      }

      if (b.region) {
        const regLower = b.region.toLowerCase().trim();
        const regClean = regLower.replace(/branch|hub|office|central|[_-\s]+/gi, '').trim();
        if (regClean && regClean.length >= 3 && !branchLookup.has(regClean)) {
          branchLookup.set(regClean, b.name);
        }
      }
    });

    // 2. Index registered agents
    const agentList: User[] = [...allAgents];
    const agentToBranch = new Map<string, string>();
    const knownAgentNames = new Set<string>();
    const knownAgentIds = new Set<string>();

    allAgents.forEach(ag => {
      knownAgentIds.add(ag.id);
      knownAgentNames.add(ag.name.toLowerCase().trim());

      const agBranchRaw = (ag.branch || '').trim();
      if (agBranchRaw) {
        const matched = branchLookup.get(agBranchRaw.toLowerCase()) ||
                        branchLookup.get(normalizeBranchName(agBranchRaw)) ||
                        branchLookup.get(agBranchRaw.toLowerCase().replace(/branch|hub|office|central|[_-\s]+/gi, '').trim()) ||
                        agBranchRaw;
        if (ag.id) agentToBranch.set(ag.id, matched);
        if (ag.name) {
          agentToBranch.set(ag.name.toLowerCase().trim(), matched);
          const cleanName = ag.name.toLowerCase().replace(/^agent\s+/i, '').trim();
          agentToBranch.set(cleanName, matched);
        }
      }
    });

    // 3. Fast caching for area -> branch resolution
    const areaCache = new Map<string, string>();
    const recordBranchMap = new Map<string, string>();
    const recordDatesMap = new Map<string, { callDate: string | null; apptDate: string | null; hasAppt: boolean }>();

    // 4. Single linear O(Records) pass
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const recId = r.id || `rec-idx-${i}`;
      const area = (r.areaOfReg || '').trim();
      const areaLower = area.toLowerCase();

      // Resolve branch
      let matchedBranch = areaCache.get(areaLower);
      if (!matchedBranch) {
        if (area && areaLower !== 'unassigned') {
          matchedBranch = branchLookup.get(areaLower) || branchLookup.get(normalizeBranchName(area));
          if (!matchedBranch) {
            const areaClean = areaLower.replace(/branch|hub|office|central|[_-\s]+/gi, '').trim();
            if (areaClean && areaClean.length >= 3) {
              matchedBranch = branchLookup.get(areaClean);
            }
          }

          // If still unmatched, dynamically register branch
          if (!matchedBranch) {
            const norm = normalizeBranchName(area);
            if (norm && !knownBranchNorms.has(norm)) {
              knownBranchNorms.add(norm);
              const branchId = `b-dyn-${norm.replace(/[^a-z0-9]+/g, '-')}`;
              if (!knownBranchIds.has(branchId)) {
                knownBranchIds.add(branchId);
                const formattedName = areaLower.endsWith('branch') ? area : `${area} Branch`;
                branchList.push({
                  id: branchId,
                  name: formattedName,
                  region: area,
                  supervisorId: r.supervisorId || '',
                  supervisorName: 'Assigned in Records',
                  targetCallsMonth: 500
                });
                branchTotalCounts.set(formattedName, 0);
                branchLookup.set(norm, formattedName);
                branchLookup.set(areaLower, formattedName);
                matchedBranch = formattedName;
              }
            }
          }
        }

        // Fallback to agent's branch if area unassigned
        if (!matchedBranch && (r.assignedAgentId || r.assignedAgentName)) {
          if (r.assignedAgentId && agentToBranch.has(r.assignedAgentId)) {
            matchedBranch = agentToBranch.get(r.assignedAgentId);
          } else if (r.assignedAgentName) {
            const cleanAg = r.assignedAgentName.toLowerCase().replace(/^agent\s+/i, '').trim();
            matchedBranch = agentToBranch.get(cleanAg) || agentToBranch.get(r.assignedAgentName.toLowerCase().trim());
          }
        }

        // Fallback to HQ Branch or Area name
        if (!matchedBranch) {
          if (!area || areaLower.includes('hq') || areaLower.includes('headquarter')) {
            matchedBranch = branchLookup.get('hq branch') || 'HQ Branch';
          } else {
            matchedBranch = areaLower.endsWith('branch') ? area : `${area} Branch`;
          }
        }

        areaCache.set(areaLower, matchedBranch);
      }

      recordBranchMap.set(recId, matchedBranch);
      branchTotalCounts.set(matchedBranch, (branchTotalCounts.get(matchedBranch) || 0) + 1);

      // Dynamically discover agents
      const agName = (r.assignedAgentName || '').trim();
      if (agName && agName.toLowerCase() !== 'unassigned') {
        const agLower = agName.toLowerCase();
        if (!knownAgentNames.has(agLower)) {
          knownAgentNames.add(agLower);
          const cleanName = agName.replace(/^agent\s+/i, '').trim();
          const agentId = r.assignedAgentId || `agent-${cleanName.toLowerCase().replace(/\s+/g, '-')}`;
          if (!knownAgentIds.has(agentId)) {
            knownAgentIds.add(agentId);
            agentList.push({
              id: agentId,
              name: agName,
              email: `${cleanName.toLowerCase().replace(/\s+/g, '.')}@mycash.so`,
              role: 'TEAM_MEMBER',
              branch: matchedBranch,
              active: true
            });
            agentToBranch.set(agentId, matchedBranch);
            agentToBranch.set(agLower, matchedBranch);
            agentToBranch.set(cleanName.toLowerCase(), matchedBranch);
          }
        }
      }

      // Parse & cache record dates
      const callNorm = extractDateString(r.callDate);
      const apptNorm = extractDateString(r.appointment);
      const hasAppt = isAppointmentRecord(r);
      recordDatesMap.set(recId, { callDate: callNorm, apptDate: apptNorm, hasAppt });
    }

    return {
      combinedBranches: branchList,
      combinedAgents: agentList,
      branchTotalCounts,
      recordBranchMap,
      recordDatesMap
    };
  }, [allBranches, allAgents, records]);

  const combinedBranches = indexedData.combinedBranches;
  const combinedAgents = indexedData.combinedAgents;

  // Filter mode: 'all-branches' | 'multiple-branches' | 'all-agents' | 'multiple-agents'
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('all-branches');

  // Date selection state (From - To)
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<'both' | 'calls' | 'appointments'>('both');

  const isDateFilterActive = Boolean(dateStart || dateEnd);

  // Formatted date period string for report & AI grounding
  const formattedDatePeriod = useMemo(() => {
    if (!dateStart && !dateEnd) {
      return 'All Time (Full Historical Dataset)';
    }
    const typeLabel = dateFilterType === 'calls' 
      ? ' [Call Dates]' 
      : dateFilterType === 'appointments' 
      ? ' [Appointment Dates]' 
      : ' [Call & Appointment Dates]';
      
    if (dateStart && dateEnd) {
      if (dateStart === dateEnd) {
        return `${dateStart}${typeLabel}`;
      }
      return `${dateStart} to ${dateEnd}${typeLabel}`;
    }
    if (dateStart) {
      return `From ${dateStart} onward${typeLabel}`;
    }
    return `Up to ${dateEnd}${typeLabel}`;
  }, [dateStart, dateEnd, dateFilterType]);

  // Compute period-filtered records and per-branch period counts
  const { 
    recordsMatchingDate, 
    branchPeriodCounts, 
    callsInPeriodCount, 
    appointmentsInPeriodCount 
  } = useMemo(() => {
    const periodCounts = new Map<string, number>();
    combinedBranches.forEach(b => periodCounts.set(b.name, 0));

    let callCount = 0;
    let apptCount = 0;

    if (!isDateFilterActive) {
      // If no date filter is active, all records match
      records.forEach(r => {
        const recId = r.id || '';
        const dates = indexedData.recordDatesMap.get(recId);
        if (dates?.callDate) callCount++;
        if (dates?.hasAppt || dates?.apptDate) apptCount++;
      });
      return {
        recordsMatchingDate: records,
        branchPeriodCounts: indexedData.branchTotalCounts,
        callsInPeriodCount: callCount,
        appointmentsInPeriodCount: apptCount
      };
    }

    const matchedRecords: CustomerRecord[] = [];

    records.forEach(r => {
      const recId = r.id || '';
      const dates = indexedData.recordDatesMap.get(recId);
      if (!dates) return;

      const hasCallInRange = Boolean(
        dates.callDate &&
        (!dateStart || dates.callDate >= dateStart) &&
        (!dateEnd || dates.callDate <= dateEnd)
      );

      const hasApptInRange = Boolean(
        dates.apptDate &&
        (!dateStart || dates.apptDate >= dateStart) &&
        (!dateEnd || dates.apptDate <= dateEnd)
      );

      let recordPasses = false;
      if (dateFilterType === 'calls') {
        recordPasses = hasCallInRange;
      } else if (dateFilterType === 'appointments') {
        recordPasses = hasApptInRange || Boolean(dates.hasAppt && !dates.apptDate && dates.callDate && (!dateStart || dates.callDate >= dateStart) && (!dateEnd || dates.callDate <= dateEnd));
      } else {
        // 'both' call dates and appointment dates
        recordPasses = hasCallInRange || hasApptInRange;
      }

      if (recordPasses) {
        matchedRecords.push(r);
        if (dates.callDate) callCount++;
        if (dates.hasAppt || dates.apptDate) apptCount++;

        const bName = indexedData.recordBranchMap.get(recId);
        if (bName) {
          periodCounts.set(bName, (periodCounts.get(bName) || 0) + 1);
        }
      }
    });

    return {
      recordsMatchingDate: matchedRecords,
      branchPeriodCounts: periodCounts,
      callsInPeriodCount: callCount,
      appointmentsInPeriodCount: apptCount
    };
  }, [indexedData, combinedBranches, records, dateStart, dateEnd, dateFilterType, isDateFilterActive]);

  // Selected branches (names)
  const [selectedBranchNames, setSelectedBranchNames] = useState<string[]>(() => 
    combinedBranches.filter(b => (indexedData.branchTotalCounts.get(b.name) || 0) > 0).map(b => b.name)
  );

  // Selected agents (IDs)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(() => combinedAgents.map(a => a.id));

  // Search filters inside selectors
  const [branchSearch, setBranchSearch] = useState<string>('');
  const [agentSearch, setAgentSearch] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active view tab inside modal: 'configure' or 'results'
  const [activeTab, setActiveTab] = useState<'configure' | 'results'>('configure');

  // Loading & Result state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Progressive analysis stage timer for Gemini AI reasoning effect
  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisStage(0);
      return;
    }
    const t1 = setTimeout(() => setAnalysisStage(1), 850);
    const t2 = setTimeout(() => setAnalysisStage(2), 2000);
    const t3 = setTimeout(() => setAnalysisStage(3), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isAnalyzing]);

  // Active visual subtab in results:
  const [resultsSection, setResultsSection] = useState<'overview' | 'complaints' | 'appreciations-rejections' | 'appointments' | 'branches' | 'agents' | 'roadmap'>('overview');

  // Filter branches for display - sort branches with active records first
  const filteredBranchesList = useMemo(() => {
    const q = branchSearch.toLowerCase().trim();
    return combinedBranches
      .filter(b => !q || b.name.toLowerCase().includes(q) || b.region.toLowerCase().includes(q))
      .sort((a, b) => {
        const countA = (isDateFilterActive ? branchPeriodCounts.get(a.name) : indexedData.branchTotalCounts.get(a.name)) || 0;
        const countB = (isDateFilterActive ? branchPeriodCounts.get(b.name) : indexedData.branchTotalCounts.get(b.name)) || 0;
        if (countA !== countB) return countB - countA;
        return a.name.localeCompare(b.name);
      });
  }, [combinedBranches, indexedData.branchTotalCounts, branchPeriodCounts, isDateFilterActive, branchSearch]);

  // Filter agents for display
  const filteredAgentsList = useMemo(() => {
    const q = agentSearch.toLowerCase().trim();
    return combinedAgents.filter(a => !q || a.name.toLowerCase().includes(q) || a.branch.toLowerCase().includes(q));
  }, [combinedAgents, agentSearch]);

  // Compute records scoped to current selection with 100% accurate branch counts & period matching
  const scopedData = useMemo(() => {
    let targetBranches: BranchInfo[] = [];
    let targetAgents: User[] = [];
    let targetRecords: CustomerRecord[] = [];
    let scopeDescription = '';

    if (selectionMode === 'all-branches') {
      targetBranches = combinedBranches;
      targetAgents = combinedAgents;
      targetRecords = recordsMatchingDate;
      scopeDescription = `All Regional Branches (${combinedBranches.length} Branches, Entire Network)`;
    } else if (selectionMode === 'multiple-branches') {
      const selectedSet = new Set(selectedBranchNames);
      targetBranches = combinedBranches.filter(b => selectedSet.has(b.name));

      // Strict accuracy: only records belonging to the selected branches AND matching date filter
      if (selectedBranchNames.length === 0) {
        targetRecords = [];
        scopeDescription = 'No Branches Selected';
      } else {
        targetRecords = recordsMatchingDate.filter(r => {
          const bName = indexedData.recordBranchMap.get(r.id);
          return bName ? selectedSet.has(bName) : false;
        });

        // Filter agents belonging to target branches
        targetAgents = combinedAgents.filter(a => {
          const agBranchNorm = normalizeBranchName(a.branch);
          return targetBranches.some(b => normalizeBranchName(b.name) === agBranchNorm);
        });

        const branchNamesList = targetBranches.map(b => b.name);
        const displayStr = branchNamesList.length <= 2 
          ? branchNamesList.join(', ') 
          : `${branchNamesList.length} Branches (${branchNamesList.slice(0, 2).join(', ')}...)`;
        scopeDescription = `Selected Branches: ${displayStr}`;
      }
    } else if (selectionMode === 'all-agents') {
      targetAgents = combinedAgents;
      targetBranches = combinedBranches;
      targetRecords = recordsMatchingDate;
      scopeDescription = `All Calling Agents (${combinedAgents.length} Agents Across All Branches)`;
    } else {
      // multiple-agents
      targetAgents = combinedAgents.filter(a => selectedAgentIds.includes(a.id));
      targetBranches = combinedBranches.filter(b => targetAgents.some(a => normalizeBranchName(a.branch) === normalizeBranchName(b.name)));
      
      if (selectedAgentIds.length === 0) {
        targetRecords = [];
        scopeDescription = 'No Agents Selected';
      } else {
        targetRecords = recordsMatchingDate.filter(r => targetAgents.some(a => isRecordAssignedToAgent(r, a)));
        scopeDescription = `Selected Agents (${targetAgents.length} of ${combinedAgents.length} Agents: ${targetAgents.map(a => a.name).join(', ')})`;
      }
    }

    return {
      branches: targetBranches,
      agents: targetAgents,
      records: targetRecords,
      scopeDescription
    };
  }, [selectionMode, selectedBranchNames, selectedAgentIds, combinedBranches, combinedAgents, recordsMatchingDate, indexedData.recordBranchMap]);

  // Handle execution of Gemini AI Analysis
  const handleRunAnalysis = async () => {
    setErrorMessage(null);
    if (scopedData.records.length === 0) {
      if (records.length > 0) {
        setErrorMessage(`No customer records match the selected scope and date period (${formattedDatePeriod}). Please select branches that have leads in this period or adjust your date filter.`);
      } else {
        setErrorMessage('The portal does not contain any customer records to analyze yet. Please upload an Excel sheet first.');
      }
      return;
    }

    setIsAnalyzing(true);
    setActiveTab('results');
    try {
      const result = await runAiIntelligenceAnalysis({
        records: scopedData.records,
        branches: scopedData.branches,
        agents: scopedData.agents,
        scopeName: scopedData.scopeDescription,
        datePeriod: formattedDatePeriod
      });
      setAnalysisResult(result);
    } catch (err: any) {
      console.warn('[AI Analysis Error] Falling back to real-data analytical engine:', err);
      try {
        const fallback = generateOfflineHeuristicAnalysis(
          scopedData.records,
          scopedData.branches,
          scopedData.agents,
          formattedDatePeriod
        );
        setAnalysisResult(fallback);
      } catch (fallbackErr) {
        setErrorMessage('Failed to generate analysis. Please try selecting a different scope or re-running.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle PDF Export
  const handleDownloadPdf = () => {
    if (!analysisResult) return;
    setIsExportingPdf(true);
    try {
      generateAiIntelligencePdf(
        analysisResult, 
        currentUser, 
        scopedData.scopeDescription,
        analysisResult.datePeriod || formattedDatePeriod
      );
    } catch (error) {
      console.error('[PDF Export Error]', error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Branch toggle handlers
  const toggleBranch = (name: string) => {
    setSelectedBranchNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const selectAllBranches = () => {
    setSelectedBranchNames(combinedBranches.map(b => b.name));
  };

  const selectBranchesWithLeads = () => {
    const withLeads = combinedBranches
      .filter(b => ((isDateFilterActive ? branchPeriodCounts.get(b.name) : indexedData.branchTotalCounts.get(b.name)) || 0) > 0)
      .map(b => b.name);
    if (withLeads.length > 0) {
      setSelectedBranchNames(withLeads);
    } else {
      setSelectedBranchNames(combinedBranches.map(b => b.name));
    }
  };

  const deselectAllBranches = () => {
    setSelectedBranchNames([]);
  };

  // Agent toggle handlers
  const toggleAgent = (id: string) => {
    setSelectedAgentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllAgents = () => {
    setSelectedAgentIds(combinedAgents.map(a => a.id));
  };

  const deselectAllAgents = () => {
    setSelectedAgentIds([]);
  };

  // Switching mode helpers
  const handleSelectMultipleBranchesMode = () => {
    setSelectionMode('multiple-branches');
    if (selectedBranchNames.length === 0) {
      const withLeads = combinedBranches
        .filter(b => ((isDateFilterActive ? branchPeriodCounts.get(b.name) : indexedData.branchTotalCounts.get(b.name)) || 0) > 0)
        .map(b => b.name);
      setSelectedBranchNames(withLeads.length > 0 ? withLeads : combinedBranches.map(b => b.name));
    }
  };

  const handleSelectMultipleAgentsMode = () => {
    setSelectionMode('multiple-agents');
    if (selectedAgentIds.length === 0) {
      setSelectedAgentIds(combinedAgents.map(a => a.id));
    }
  };

  // Guard after all hooks so React rules of hooks are strictly adhered to
  if (!isOpen || (currentUser.role !== 'HQ_ADMIN' && currentUser.role !== 'SUPERVISOR')) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs sm:text-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-3 sm:px-5 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 id="ai-modal-title" className="text-xs sm:text-base font-black tracking-tight text-white truncate">
                  AI Intelligence & Feedback Analytics
                </h2>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-sm text-[9px] sm:text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Powered by Gemini AI
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5 truncate sm:whitespace-normal">
                Analyzes customer feedback notes from Excel tables (translating Somali notes), categorizing complaints, appreciations, rejections, and coaching calling agents.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            title="Close AI Intelligence Modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Top Nav (Scope Configure vs Analytics Results) */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('configure')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'configure'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Scope Selection & Filters</span>
            </button>

            <button
              id="tab-ai-analysis-insights"
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'results'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
              title="View AI Analysis & Insights"
            >
              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
              <span>2. AI Analysis & Insights</span>
              {analysisResult ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 text-xs font-bold shrink-0 ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {activeTab === 'configure' ? (
            /* ======================================================== */
            /* TAB 1: SELECTION OPTIONS (All Branches, Multiple Branches, All Agents, Multiple Agents) */
            /* ======================================================== */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Step Title */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">1</span>
                  Choose Analysis Scope:
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Select whether you want to analyze all branches, targeted regional branches, all calling agents, or specific agents.
                </p>

                {/* 4 Scope Radio Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  {/* Option 1: All Branches */}
                  <button
                    type="button"
                    onClick={() => setSelectionMode('all-branches')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectionMode === 'all-branches'
                        ? 'border-red-600 bg-red-50/70 ring-1 ring-red-600 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${selectionMode === 'all-branches' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      {selectionMode === 'all-branches' && (
                        <CheckCircle2 className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">All Branches</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Enterprise network ({allBranches.length} Branches)</div>
                    </div>
                  </button>

                  {/* Option 2: Select Multiple Branches */}
                  <button
                    type="button"
                    onClick={handleSelectMultipleBranchesMode}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectionMode === 'multiple-branches'
                        ? 'border-red-600 bg-red-50/70 ring-1 ring-red-600 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${selectionMode === 'multiple-branches' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      {selectionMode === 'multiple-branches' && (
                        <CheckCircle2 className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Select Multiple Branches</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Filter specific regional hubs ({combinedBranches.length} Hubs)</div>
                    </div>
                  </button>

                  {/* Option 3: All Agents */}
                  <button
                    type="button"
                    onClick={() => setSelectionMode('all-agents')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectionMode === 'all-agents'
                        ? 'border-red-600 bg-red-50/70 ring-1 ring-red-600 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${selectionMode === 'all-agents' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      {selectionMode === 'all-agents' && (
                        <CheckCircle2 className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">All Agents</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">All calling team ({combinedAgents.length} Agents)</div>
                    </div>
                  </button>

                  {/* Option 4: Select Multiple Agents */}
                  <button
                    type="button"
                    onClick={handleSelectMultipleAgentsMode}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectionMode === 'multiple-agents'
                        ? 'border-red-600 bg-red-50/70 ring-1 ring-red-600 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${selectionMode === 'multiple-agents' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Users className="w-4 h-4" />
                      </div>
                      {selectionMode === 'multiple-agents' && (
                        <CheckCircle2 className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Select Multiple Agents</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Filter specific agents to coach</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Multi-Selector for Branches */}
              {selectionMode === 'multiple-branches' && (
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Choose Branches ({selectedBranchNames.length} of {combinedBranches.length} selected):
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Select regional branches. Record counts accurately reflect the selected date window.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectBranchesWithLeads}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                        title="Select only branches that have active customer records in this date window"
                      >
                        Select With Leads
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={selectAllBranches}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={deselectAllBranches}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    placeholder="Search branch name or region..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-red-500 outline-none"
                  />

                  {scopedData.records.length === 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate">
                          {selectedBranchNames.length === 0
                            ? 'No branches currently selected. Select at least one branch to run analysis.'
                            : `0 records match the selected branch${selectedBranchNames.length > 1 ? 'es' : ''} in this date period. Click "Select With Leads" to target branches with records.`
                          }
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={selectBranchesWithLeads}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10.5px] rounded-lg shrink-0 cursor-pointer"
                      >
                        Select Branches With Leads
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded-lg bg-slate-50/50">
                    {filteredBranchesList.map(b => {
                      const isChecked = selectedBranchNames.includes(b.name);
                      const totalCount = indexedData.branchTotalCounts.get(b.name) || 0;
                      const periodCount = branchPeriodCounts.get(b.name) || 0;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBranch(b.name)}
                          className={`p-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            isChecked
                              ? 'bg-red-50 border-red-300 text-red-900 font-semibold ring-1 ring-red-400/40'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="min-w-0 pr-1 flex-1">
                            <div className="truncate font-semibold">{b.name}</div>
                            <div className="text-[10px] mt-0.5 flex items-center gap-1">
                              {isDateFilterActive ? (
                                <span className={`px-1.5 py-0.5 rounded-full font-bold ${
                                  periodCount > 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-slate-100 text-slate-400'
                                }`}>
                                  {periodCount} in period ({totalCount} total)
                                </span>
                              ) : (
                                <span className={`px-1.5 py-0.5 rounded-full font-bold ${
                                  totalCount > 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-slate-100 text-slate-400'
                                }`}>
                                  {totalCount} {totalCount === 1 ? 'record' : 'records'}
                                </span>
                              )}
                            </div>
                          </div>
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-red-600 shrink-0 ml-1" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Conditional Multi-Selector for Agents */}
              {selectionMode === 'multiple-agents' && (
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Choose Agents ({selectedAgentIds.length} of {combinedAgents.length} selected):
                      </h4>
                      <p className="text-[11px] text-slate-500">Select individual calling agents to evaluate and coach.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllAgents}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={deselectAllAgents}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search agent name or branch..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-red-500 outline-none"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded-lg bg-slate-50/50">
                    {filteredAgentsList.map(a => {
                      const isChecked = selectedAgentIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleAgent(a.id)}
                          className={`p-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            isChecked
                              ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <div className="truncate font-medium">{a.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{a.branch}</div>
                          </div>
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: DATE SELECTION & OPERATING PERIOD                */}
              {/* Filter by Call Dates and Appointment Created Dates       */}
              {/* ======================================================== */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">2</span>
                      <span>Date Selection (From – To Period):</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Filter by customer call dates and booked appointment dates so the AI knows which agents, branches, and exact timeframe of information it is reading.
                    </p>
                  </div>

                  {/* Quick Period Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => { setDateStart(''); setDateEnd(''); }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        !dateStart && !dateEnd 
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      onClick={() => { const t = getTodayIso(); setDateStart(t); setDateEnd(t); }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        dateStart === getTodayIso() && dateEnd === getTodayIso()
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => { const y = getYesterdayIso(); setDateStart(y); setDateEnd(y); }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        dateStart === getYesterdayIso() && dateEnd === getYesterdayIso()
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDateStart(getDaysAgoIso(7)); setDateEnd(getTodayIso()); }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        dateStart === getDaysAgoIso(7) && dateEnd === getTodayIso()
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDateStart(getFirstDayOfMonthIso()); setDateEnd(getTodayIso()); }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        dateStart === getFirstDayOfMonthIso() && dateEnd === getTodayIso()
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDateStart(getDaysAgoIso(30)); setDateEnd(getTodayIso()); }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        dateStart === getDaysAgoIso(30) && dateEnd === getTodayIso()
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Last 30 Days
                    </button>
                  </div>
                </div>

                {/* Date Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>From Date (Start):</span>
                    </label>
                    <input
                      type="date"
                      id="input-ai-date-from"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>To Date (End):</span>
                    </label>
                    <input
                      type="date"
                      id="input-ai-date-to"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      <span>Filter By Date Field:</span>
                    </label>
                    <select
                      id="select-ai-date-criteria"
                      value={dateFilterType}
                      onChange={(e) => setDateFilterType(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                    >
                      <option value="both">Call Dates & Appointment Dates (Both)</option>
                      <option value="calls">Call Dates Only</option>
                      <option value="appointments">Appointment Dates Only</option>
                    </select>
                  </div>
                </div>

                {/* Active Period Status Pill */}
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-between text-xs text-blue-900 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      <strong>Reading Period:</strong> {formattedDatePeriod}
                    </span>
                    <span className="text-blue-300">•</span>
                    <span className="text-[11px] text-blue-700">
                      <strong>{recordsMatchingDate.length}</strong> of {records.length} total records match ({callsInPeriodCount} with call dates, {appointmentsInPeriodCount} with appointments)
                    </span>
                  </div>

                  {isDateFilterActive && (
                    <button
                      type="button"
                      onClick={() => { setDateStart(''); setDateEnd(''); }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-800 underline cursor-pointer shrink-0"
                    >
                      Reset Date Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Ready to Launch Banner */}
              <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-blue-800/60">
                <div className="space-y-1">
                  <div className="text-[10px] sm:text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>Ready to Generate AI Intelligence Report</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    {scopedData.scopeDescription}
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                    <span>Period: <strong className="text-amber-300">{formattedDatePeriod}</strong></span>
                    <span>•</span>
                    <span>Records: <strong className="text-white">{scopedData.records.length}</strong></span>
                    <span>•</span>
                    <span>Branches: <strong className="text-white">{scopedData.branches.length}</strong></span>
                    <span>•</span>
                    <span>Agents: <strong className="text-white">{scopedData.agents.length}</strong></span>
                  </div>
                  {scopedData.records.length === 0 && (
                    <div className="text-xs text-amber-300 pt-1 flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>0 records match the selected scope and date period. Choose branches with leads or adjust date filters to enable analysis.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* TAB 2: ANALYTICS RESULTS IN CLEAN ENGLISH               */
            /* ======================================================== */
            <div>
              {isAnalyzing ? (
                /* REDESIGNED GEMINI AI LOADING EFFECT */
                <div className="py-6 sm:py-10 max-w-3xl mx-auto space-y-6">
                  {/* Hero Gemini Astral Orb & Reasoning Card */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden text-center">
                    {/* Ambient Aurora Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-44 bg-gradient-to-r from-blue-500/15 via-indigo-500/20 to-rose-500/15 rounded-full blur-3xl pointer-events-none animate-gemini-pulse" />

                    {/* Astral Gemini Orb */}
                    <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-5 flex items-center justify-center">
                      {/* Outer pulsing radial glow */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-rose-400 blur-md opacity-60 animate-gemini-pulse" />
                      
                      {/* Smooth rotating multicolor gradient halo */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 via-violet-500 to-rose-500 p-[2.5px] animate-gemini-spin shadow-xl">
                        <div className="w-full h-full bg-slate-950 rounded-[21px]" />
                      </div>
                      
                      {/* Inner crystal core with breathing Gemini star */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-[20px] flex items-center justify-center border border-white/10 shadow-inner overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/30 via-transparent to-transparent" />
                        <Sparkles className="w-8 h-8 sm:w-9 sm:h-9 text-amber-200 animate-pulse drop-shadow-[0_0_12px_rgba(129,140,248,0.7)]" />
                      </div>
                    </div>

                    {/* Branded Status Header */}
                    <div className="relative z-10 space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold tracking-wide shadow-xs border border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-amber-200 bg-clip-text text-transparent font-bold">
                          Gemini 2.5 Flash Engine
                        </span>
                        <span className="text-slate-400 font-normal">· Real-Time Reasoning</span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {analysisStage === 0 && 'Ingesting Customer Records & Call Logs...'}
                        {analysisStage === 1 && 'Extracting Af-Soomaali Customer Sentiments...'}
                        {analysisStage === 2 && 'Benchmarking Conversion Velocity & Regional Hubs...'}
                        {analysisStage >= 3 && 'Synthesizing English Executive Intelligence...'}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                        Gemini AI is examining customer feedback notes, clustering objection causes, and formatting an actionable management intelligence briefing.
                      </p>

                      {/* Dynamic Stage Description Bar */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-700">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                        <span>
                          {analysisStage === 0 && 'Reading call logs, verification notes, and scheduled appointments...'}
                          {analysisStage === 1 && 'Clustering customer pain points, fees, KYC, and agent behavior feedback...'}
                          {analysisStage === 2 && 'Comparing regional targets, supervisor cohorts, and pipeline bottlenecks...'}
                          {analysisStage >= 3 && 'Drafting executive summary, recommendations, and tactical roadmaps...'}
                        </span>
                      </div>

                      {/* Smooth Shimmer Progress Track */}
                      <div className="mt-3 max-w-md mx-auto">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500 transition-all duration-700 ease-out relative"
                            style={{ width: `${(analysisStage + 1) * 25}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-gemini-shimmer" />
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                          <span>Stage {analysisStage + 1} of 4</span>
                          <span>{Math.round(((analysisStage + 1) / 4) * 100)}% Complete</span>
                        </div>
                      </div>
                    </div>

                    {/* Context Data Scope Badges */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <strong>{scopedData.branches.length}</strong> Branches
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        <strong>{scopedData.agents.length}</strong> Calling Agents
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <strong>{scopedData.records.length}</strong> Customer Records In Scope
                      </span>
                    </div>
                  </div>

                  {/* 4 Multi-Step Telemetry Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { step: 1, title: 'Data Ingestion & Hygiene', desc: 'Parsing calling records, status tags & callback dates', icon: FileText },
                      { step: 2, title: 'Somali Sentiment Extraction', desc: 'Clustering real customer quotes & complaint root causes', icon: MessageSquare },
                      { step: 3, title: 'Hub Velocity Benchmarking', desc: 'Evaluating conversion velocity & agent monthly quotas', icon: TrendingUp },
                      { step: 4, title: 'English Intelligence Briefing', desc: 'Assembling executive summary, actions & roadmap', icon: Sparkles }
                    ].map((stg, idx) => {
                      const isDone = analysisStage > idx;
                      const isCurrent = analysisStage === idx;
                      return (
                        <div
                          key={stg.step}
                          className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                            isCurrent
                              ? 'bg-white border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                              : isDone
                              ? 'bg-emerald-50/60 border-emerald-200/80'
                              : 'bg-white/60 border-slate-200/70 opacity-60'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : isCurrent ? (
                              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                            ) : (
                              <span>{stg.step}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-indigo-950' : isDone ? 'text-emerald-950' : 'text-slate-700'}`}>
                                {stg.title}
                              </h4>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">
                                  Processing
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">
                                  Done
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 leading-tight">
                              {stg.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Shimmer Skeleton Wireframe Preview */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-4 opacity-75 select-none relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/70 to-transparent animate-gemini-shimmer pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-52 bg-slate-200 rounded" />
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-slate-100 rounded" />
                      <div className="h-3 w-11/12 bg-slate-100 rounded" />
                      <div className="h-3 w-4/6 bg-slate-100 rounded" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                      <div className="h-16 bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-2">
                        <div className="h-2.5 w-14 bg-slate-200 rounded" />
                        <div className="h-4 w-16 bg-slate-200 rounded" />
                      </div>
                      <div className="h-16 bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-2">
                        <div className="h-2.5 w-14 bg-slate-200 rounded" />
                        <div className="h-4 w-16 bg-slate-200 rounded" />
                      </div>
                      <div className="h-16 bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-2">
                        <div className="h-2.5 w-14 bg-slate-200 rounded" />
                        <div className="h-4 w-16 bg-slate-200 rounded" />
                      </div>
                      <div className="h-16 bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-2">
                        <div className="h-2.5 w-14 bg-slate-200 rounded" />
                        <div className="h-4 w-16 bg-slate-200 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : analysisResult ? (
                <div className="space-y-6">
                  {/* Results Top Banner */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          English Intelligence Report Ready
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>Period: {analysisResult.datePeriod || formattedDatePeriod}</span>
                        </span>
                        <span className="text-xs text-slate-500">
                          {scopedData.scopeDescription}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        AI Customer Feedback & Tele-Sales Intelligence Report
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Synthesized from customer feedback notes, call logs, and appointment records across selected teams for this period.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={handleDownloadPdf}
                        disabled={isExportingPdf}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        title="Download official PDF report in English"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
                      </button>
                      <button
                        onClick={handleRunAnalysis}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                        title="Re-run Analysis"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Re-run</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Subtabs */}
                  <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-2">
                    <button
                      onClick={() => setResultsSection('overview')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        resultsSection === 'overview'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Executive Summary & Sentiment
                    </button>

                    <button
                      onClick={() => setResultsSection('complaints')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        resultsSection === 'complaints'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Most Frequent Complaints ({analysisResult.topComplaints.length})
                    </button>

                    <button
                      onClick={() => setResultsSection('appreciations-rejections')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        resultsSection === 'appreciations-rejections'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Appreciations & Rejections
                    </button>

                    <button
                      onClick={() => setResultsSection('appointments')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        resultsSection === 'appointments'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Appointments & Callbacks
                    </button>

                    <button
                      onClick={() => setResultsSection('branches')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        resultsSection === 'branches'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Branch Performance ({analysisResult.branchPerformances.length})
                    </button>

                    <button
                      onClick={() => setResultsSection('agents')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        resultsSection === 'agents'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Agent Coaching & Objections ({analysisResult.agentSummaries.length})
                    </button>

                    <button
                      onClick={() => setResultsSection('roadmap')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        resultsSection === 'roadmap'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Strategic Roadmap
                    </button>
                  </div>

                  {/* Subtab 1: Executive Summary & Sentiment */}
                  {resultsSection === 'overview' && (
                    <div className="space-y-4">
                      {/* 4 Feedback Distribution Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                          <div className="flex items-center justify-between text-red-800 text-xs font-bold">
                            <span>Customer Complaints</span>
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="text-2xl font-black text-red-900 mt-2">
                            {analysisResult.feedbackBreakdown.complaintsPercent}%
                          </div>
                          <p className="text-[11px] text-red-700 mt-1">
                            Pricing, network, limit complaints
                          </p>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
                            <span>Appreciations</span>
                            <ThumbsUp className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="text-2xl font-black text-emerald-900 mt-2">
                            {analysisResult.feedbackBreakdown.appreciationsPercent}%
                          </div>
                          <p className="text-[11px] text-emerald-700 mt-1">
                            Praise for speed and service
                          </p>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                          <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                            <span>Call Rejections</span>
                            <ThumbsDown className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="text-2xl font-black text-amber-900 mt-2">
                            {analysisResult.feedbackBreakdown.rejectionsPercent}%
                          </div>
                          <p className="text-[11px] text-amber-700 mt-1">
                            Sales objections and competitor loyalty
                          </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                          <div className="flex items-center justify-between text-blue-800 text-xs font-bold">
                            <span>Follow-ups & Appointments</span>
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="text-2xl font-black text-blue-900 mt-2">
                            {analysisResult.feedbackBreakdown.inquiriesAndFollowupsPercent}%
                          </div>
                          <p className="text-[11px] text-blue-700 mt-1">
                            Callbacks and inquiries requested
                          </p>
                        </div>
                      </div>

                      {/* Executive Summary Card in English */}
                      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          Executive Summary (English):
                        </h4>
                        <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                          {analysisResult.executiveSummary}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subtab 2: Top Customer Complaints */}
                  {resultsSection === 'complaints' && (
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              Most Frequent Customer Complaints & Root Causes (English)
                            </h4>
                            <p className="text-xs text-slate-500">
                              Analyzed from customer feedback notes and ranked by frequency, severity, and customer impact.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {analysisResult.topComplaints.map((item, idx) => (
                            <div 
                              key={idx}
                              className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all bg-white space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                      item.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {item.severity} SEVERITY
                                    </span>
                                    <span className="text-xs text-slate-400 font-semibold">•</span>
                                    <span className="text-xs font-semibold text-slate-600">{item.category}</span>
                                  </div>
                                  <h5 className="text-sm font-bold text-slate-900 mt-1">
                                    {item.issue}
                                  </h5>
                                </div>

                                <div className="text-right">
                                  <div className="text-lg font-black text-red-600">{item.percentage}%</div>
                                  <div className="text-[10px] text-slate-500 font-medium">{item.count} Customer Mentions</div>
                                </div>
                              </div>

                              {/* Customer Quotes translated to English */}
                              {item.customerQuotes && item.customerQuotes.length > 0 && (
                                <div className="bg-slate-50 border-l-2 border-indigo-500 p-2.5 rounded-r-lg space-y-1">
                                  <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                                    Customer Feedback Quotes (Af-Soomaali as in Excel):
                                  </div>
                                  {item.customerQuotes.map((q, qIdx) => (
                                    <div key={qIdx} className="text-xs italic text-slate-700 font-serif">
                                      {q}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Root Cause Analysis in English */}
                              <div className="text-xs text-slate-600 bg-slate-100/60 p-2.5 rounded-lg border border-slate-200">
                                <strong className="text-slate-800">Root Cause Analysis:</strong> {item.rootCause}
                              </div>

                              {/* Action Advice */}
                              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-emerald-900">
                                  <strong className="font-bold">Recommended Action:</strong> {item.actionRecommendation}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subtab 3: Appreciations & Rejections */}
                  {resultsSection === 'appreciations-rejections' && (
                    <div className="space-y-4">
                      {/* Appreciations */}
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                          <ThumbsUp className="w-4 h-4" />
                          <h4>Customer Appreciations & Positive Highlights</h4>
                        </div>
                        <p className="text-xs text-slate-500">
                          Identified themes where customers expressed genuine appreciation or satisfaction.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {analysisResult.topAppreciations.map((apprec, idx) => (
                            <div key={idx} className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="font-bold text-xs text-emerald-950">{apprec.theme}</h5>
                                <span className="text-xs font-black text-emerald-700">{apprec.percentage}%</span>
                              </div>
                              {apprec.customerQuotes && apprec.customerQuotes.length > 0 && (
                                <div className="bg-emerald-100/60 border-l-2 border-emerald-600 p-2 rounded-r space-y-1">
                                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                                    Customer Feedback Quotes (Af-Soomaali as in Excel):
                                  </div>
                                  {apprec.customerQuotes.map((q, qIdx) => (
                                    <div key={qIdx} className="text-xs italic text-emerald-950 font-serif">
                                      "{q}"
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="text-[11px] text-emerald-800 font-medium">
                                <strong>Success Driver:</strong> {apprec.keyDriver}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rejections & Objections */}
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                          <ThumbsDown className="w-4 h-4" />
                          <h4>Customer Rejections & Objection-Handling Coaching</h4>
                        </div>
                        <p className="text-xs text-slate-500">
                          Why customers declined offers and practical script guidance for calling staff to overcome objections.
                        </p>

                        <div className="space-y-3">
                          {analysisResult.rejectionAnalysis.map((rej, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="font-bold text-xs text-slate-900">{rej.reason}</h5>
                                <span className="text-xs font-black text-amber-600">{rej.percentage}% of Rejections</span>
                              </div>
                              <p className="text-xs text-slate-600">
                                <strong className="text-slate-800">Customer Behavior:</strong> {rej.customerExplanation}
                              </p>
                              {rej.customerQuotes && rej.customerQuotes.length > 0 && (
                                <div className="bg-amber-100/60 border-l-2 border-amber-600 p-2 rounded-r space-y-1">
                                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                    Customer Feedback Quotes (Af-Soomaali as in Excel):
                                  </div>
                                  {rej.customerQuotes.map((q, qIdx) => (
                                    <div key={qIdx} className="text-xs italic text-amber-950 font-serif">
                                      "{q}"
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-950">
                                <strong className="text-blue-800">Agent Counter-Script / How to Overcome:</strong> {rej.overcomingScript}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subtab 4: Appointments & Callbacks */}
                  {resultsSection === 'appointments' && (
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                          <Calendar className="w-4 h-4" />
                          <h4>Scheduled Appointments & Callback Intelligence</h4>
                        </div>
                        {analysisResult.appointmentInsights.totalAppointments > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            {analysisResult.appointmentInsights.totalAppointments} Active Bookings Found
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                          <div className="text-xs font-bold text-blue-800">Total Scheduled Appointments & Callbacks</div>
                          <div className="text-2xl font-black text-blue-900 mt-1">
                            {analysisResult.appointmentInsights.totalAppointments}
                          </div>
                          <div className="text-[11px] text-blue-700 mt-0.5">
                            {analysisResult.appointmentInsights.appointmentRate}% of completed calls requested appointments
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-xs font-bold text-slate-800">Follow-up Adherence Protocol</div>
                          <div className="text-xs text-slate-600 mt-1">
                            {analysisResult.appointmentInsights.actionableFollowupAdvice}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-white">
                        <h5 className="text-xs font-bold text-slate-900 mb-1">Key Observations on Customer Callbacks:</h5>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {analysisResult.appointmentInsights.keyObservations}
                        </p>
                      </div>

                      {/* Detailed Booked Appointments Table */}
                      {analysisResult.appointmentInsights.sampleAppointments && analysisResult.appointmentInsights.sampleAppointments.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              Booked Appointment & Callback Roster ({analysisResult.appointmentInsights.sampleAppointments.length} records)
                            </span>
                            <span className="text-[11px] text-slate-500">Fetched directly from Excel tables</span>
                          </div>
                          <div className="overflow-x-auto max-h-72">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                                <tr>
                                  <th className="p-2.5">Customer Name</th>
                                  <th className="p-2.5">Phone</th>
                                  <th className="p-2.5">Calling Agent</th>
                                  <th className="p-2.5">Branch</th>
                                  <th className="p-2.5">Appointment / Callback</th>
                                  <th className="p-2.5">Customer Feedback Note</th>
                                  <th className="p-2.5 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {analysisResult.appointmentInsights.sampleAppointments.map((appt, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-2.5 font-bold text-slate-900">{appt.customerName}</td>
                                    <td className="p-2.5 text-slate-600 font-mono text-[11px]">{appt.phoneNumber || '-'}</td>
                                    <td className="p-2.5 text-slate-800 font-medium">{appt.agentName}</td>
                                    <td className="p-2.5 text-slate-600">{appt.branch}</td>
                                    <td className="p-2.5 font-semibold text-blue-700">{appt.appointmentTime}</td>
                                    <td className="p-2.5 text-slate-700 italic max-w-xs">{appt.feedbackNote || '-'}</td>
                                    <td className="p-2.5 text-center">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                        {appt.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab 5: Branch Performance */}
                  {resultsSection === 'branches' && (
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-4">
                      <h4 className="text-sm font-bold text-slate-900">
                        Regional Branch Performance & Bottleneck Analysis (English)
                      </h4>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <th className="p-3">Branch Name</th>
                              <th className="p-3 text-center">Leads</th>
                              <th className="p-3 text-center">Calls Made</th>
                              <th className="p-3 text-center">Conversion %</th>
                              <th className="p-3">Dominant Customer Complaint</th>
                              <th className="p-3">Observed Strengths</th>
                              <th className="p-3">Operational Bottlenecks</th>
                              <th className="p-3">Managerial Coaching Tip</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {analysisResult.branchPerformances.map((b, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-bold text-slate-900">{b.branchName}</td>
                                <td className="p-3 text-center text-slate-600">{b.totalLeads}</td>
                                <td className="p-3 text-center text-slate-600">{b.callsMade}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    b.successRate >= 45 ? 'bg-emerald-100 text-emerald-800' :
                                    b.successRate >= 25 ? 'bg-blue-100 text-blue-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {b.successRate}%
                                  </span>
                                </td>
                                <td className="p-3 text-slate-700">{b.dominantComplaint}</td>
                                <td className="p-3 text-emerald-700">{b.strengths}</td>
                                <td className="p-3 text-rose-700">{b.bottlenecks}</td>
                                <td className="p-3 text-slate-700 italic font-medium">{b.managerialAdvice}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Subtab 6: Agent Summaries & Coaching */}
                  {resultsSection === 'agents' && (
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Individual Agent Evaluations & Tailored Objection Coaching
                        </h4>
                        <p className="text-xs text-slate-500">
                          Personalized advice on how each calling agent can overcome objections and boost conversions.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysisResult.agentSummaries.map((ag, idx) => (
                          <div 
                            key={idx}
                            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-white flex flex-col justify-between space-y-3"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-bold text-sm text-slate-900">{ag.agentName}</h5>
                                  <div className="text-[11px] text-slate-500">{ag.branch} Hub</div>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-black text-blue-600">{ag.conversionRate}%</span>
                                  <div className="text-[10px] text-slate-400">({ag.conversions} closed of {ag.callsMade})</div>
                                </div>
                              </div>

                              {ag.customerSentimentSummary.includes('CRITICAL') || ag.customerSentimentSummary.includes('several times') || ag.customerSentimentSummary.includes('multiple times') || ag.customerSentimentSummary.includes('Over-dialing') ? (
                                <div className="mt-2 text-xs text-rose-900 bg-rose-50 p-2.5 rounded-lg border border-rose-200 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-rose-800 text-[11px] uppercase tracking-wider">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    <span>Critical Alert: Repeated Calls / Over-Dialing Pushback</span>
                                  </div>
                                  <p className="text-slate-800 leading-relaxed font-medium">
                                    {ag.customerSentimentSummary}
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  <strong className="text-slate-800">Customer Sentiment & Feedback:</strong> {ag.customerSentimentSummary}
                                </div>
                              )}
                            </div>

                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Coaching on How to Overcome Objections:</span>
                              </div>
                              <p className="text-xs text-emerald-950 font-medium mt-1 leading-snug">
                                {ag.tailoredCoachingAdvice}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subtab 7: Strategic Leadership Roadmap */}
                  {resultsSection === 'roadmap' && (
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-600" />
                        Strategic Overcome Roadmap (Executive Actions)
                      </h4>

                      <div className="space-y-3">
                        {analysisResult.strategicOvercomeAdvices.map((adv, idx) => (
                          <div 
                            key={idx}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                                {adv.priority}
                              </span>
                              <h5 className="font-bold text-sm text-slate-900">
                                {adv.title}
                              </h5>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                              {adv.description}
                            </p>
                            <div className="text-xs text-emerald-700 font-semibold">
                              Expected Business Impact: {adv.expectedImpact}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">No Analysis Generated Yet</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Select your target branch or calling agent roster in Step 1, then run analysis to synthesize real customer intelligence.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('configure')}
                      className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      ← Back to Scope Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      disabled={scopedData.records.length === 0}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Analysis Now ({scopedData.records.length})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            Generates a complete executive PDF report in English analyzing Somali customer feedback notes and excel records.
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>

            {activeTab === 'configure' ? (
              <button
                onClick={handleRunAnalysis}
                disabled={scopedData.records.length === 0 || isAnalyzing}
                title={scopedData.records.length === 0 ? "Select branches that have records to run analysis" : undefined}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Run Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            ) : analysisResult ? (
              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating PDF Report...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF Report</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
