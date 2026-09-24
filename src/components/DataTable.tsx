import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Phone, 
  Copy, 
  Check, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  RotateCcw,
  Type,
  Trash2
} from 'lucide-react';
import { CustomerRecord, CallStatus, User } from '../types';

export type ColumnKey = 
  | 'select' 
  | 'status' 
  | 'customerName' 
  | 'phoneNumber' 
  | 'areaOfReg' 
  | 'callDate' 
  | 'appointment' 
  | 'feedbackNote' 
  | 'supervisorNote' 
  | 'assignedAgent' 
  | 'dossier';

const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  select: 46,
  status: 145,
  customerName: 190,
  phoneNumber: 155,
  areaOfReg: 145,
  callDate: 140,
  appointment: 180,
  feedbackNote: 220,
  supervisorNote: 190,
  assignedAgent: 135,
  dossier: 75,
};

const MIN_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  select: 38,
  status: 110,
  customerName: 120,
  phoneNumber: 120,
  areaOfReg: 100,
  callDate: 110,
  appointment: 130,
  feedbackNote: 140,
  supervisorNote: 130,
  assignedAgent: 100,
  dossier: 55,
};

interface DataTableProps {
  records: CustomerRecord[];
  currentUser: User;
  onUpdateRecord: (updatedRecord: CustomerRecord, changeDetails: string) => void;
  onOpenCustomerDrawer?: (record: CustomerRecord) => void;
  onRequestDeleteRecords?: (recordIds: string[]) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  currentUser,
  onUpdateRecord,
  onOpenCustomerDrawer,
  onRequestDeleteRecords
}) => {
  // Sort state
  const [sortField, setSortField] = useState<keyof CustomerRecord>('callDate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Density state
  const [isCompact, setIsCompact] = useState<boolean>(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Column width state with persistence
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try {
      const saved = localStorage.getItem('mycash_col_widths_v2');
      if (saved) {
        return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback to defaults
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  const [resizingCol, setResizingCol] = useState<ColumnKey | null>(null);

  // Table Font choice state with persistence (Default: IBM Plex Sans)
  const [tableFont, setTableFont] = useState<'ibm' | 'jakarta' | 'mono'>(() => {
    return (localStorage.getItem('mycash_table_font') as any) || 'ibm';
  });

  useEffect(() => {
    localStorage.setItem('mycash_table_font', tableFont);
  }, [tableFont]);

  // Notes Modal state
  const [activeNoteModal, setActiveNoteModal] = useState<{
    record: CustomerRecord;
    field: 'feedbackNote' | 'supervisorNote';
  } | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Role permissions
  const isAgent = currentUser.role === 'TEAM_MEMBER';
  const canEditCustomerInfo = currentUser.role === 'HQ_ADMIN' || currentUser.role === 'SUPERVISOR';
  const canEditSupervisorNote = currentUser.role === 'HQ_ADMIN' || currentUser.role === 'SUPERVISOR';

  // Handle Column Resize Drag (Mouse)
  const handleMouseDownResize = (colKey: ColumnKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = columnWidths[colKey] ?? DEFAULT_COLUMN_WIDTHS[colKey];
    setResizingCol(colKey);

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const diff = moveEvent.clientX - startX;
      const min = MIN_COLUMN_WIDTHS[colKey] || 50;
      const newWidth = Math.max(min, Math.min(650, Math.round(startWidth + diff)));

      setColumnWidths(prev => {
        const updated = { ...prev, [colKey]: newWidth };
        try {
          localStorage.setItem('mycash_col_widths_v2', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    };

    const onMouseUp = () => {
      setResizingCol(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Column Resize Drag (Touch)
  const handleTouchStartResize = (colKey: ColumnKey, e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startWidth = columnWidths[colKey] ?? DEFAULT_COLUMN_WIDTHS[colKey];
    setResizingCol(colKey);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const currentX = moveEvent.touches[0].clientX;
      const diff = currentX - startX;
      const min = MIN_COLUMN_WIDTHS[colKey] || 50;
      const newWidth = Math.max(min, Math.min(650, Math.round(startWidth + diff)));

      setColumnWidths(prev => {
        const updated = { ...prev, [colKey]: newWidth };
        try {
          localStorage.setItem('mycash_col_widths_v2', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    };

    const onTouchEnd = () => {
      setResizingCol(null);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleResetColumns = () => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.setItem('mycash_col_widths_v2', JSON.stringify(DEFAULT_COLUMN_WIDTHS));
    } catch {
      // ignore
    }
  };

  const getFontClass = () => {
    switch (tableFont) {
      case 'jakarta':
        return "font-['Plus_Jakarta_Sans',sans-serif]";
      case 'mono':
        return "font-table-mono";
      case 'ibm':
      default:
        return "font-table-data";
    }
  };

  // Handle Sort
  const handleSort = (field: keyof CustomerRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Copy phone helper
  const handleCopyPhone = (id: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Status Change Logic
  const handleStatusChange = (record: CustomerRecord, newStatus: CallStatus) => {
    const isFirstTimeCalled = !record.hasBeenCalled && newStatus !== 'Uncalled';
    const today = new Date().toISOString().slice(0, 10);

    const updatedRecord: CustomerRecord = {
      ...record,
      status: newStatus,
      callDate: record.callDate || (isFirstTimeCalled ? today : record.callDate),
      hasBeenCalled: record.hasBeenCalled || (newStatus !== 'Uncalled'),
      callCount: isFirstTimeCalled ? 1 : Math.max(1, record.callCount),
      updatedAt: new Date().toISOString()
    };

    onUpdateRecord(
      updatedRecord,
      `Status changed from "${record.status}" to "${newStatus}". (Deduplicated Unique Call: ${updatedRecord.callCount})`
    );
  };

  // Handle Call Date edit
  const handleCallDateChange = (record: CustomerRecord, newDate: string) => {
    const updatedRecord: CustomerRecord = {
      ...record,
      callDate: newDate,
      updatedAt: new Date().toISOString()
    };
    onUpdateRecord(updatedRecord, `Call Date updated to ${newDate}`);
  };

  // Handle Appointment edit
  const handleAppointmentChange = (record: CustomerRecord, newAppointment: string) => {
    const updatedRecord: CustomerRecord = {
      ...record,
      appointment: newAppointment,
      updatedAt: new Date().toISOString()
    };
    onUpdateRecord(updatedRecord, `Follow-up appointment scheduled for ${newAppointment}`);
  };

  // Open note modal
  const handleOpenNoteModal = (record: CustomerRecord, field: 'feedbackNote' | 'supervisorNote', e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNoteModal({ record, field });
    setTempNoteText(record[field] || '');
  };

  // Save note modal
  const handleSaveNoteModal = () => {
    if (!activeNoteModal) return;
    const { record, field } = activeNoteModal;
    const updatedRecord: CustomerRecord = {
      ...record,
      [field]: tempNoteText.trim(),
      updatedAt: new Date().toISOString()
    };
    const fieldName = field === 'feedbackNote' ? 'Feedback Note' : 'Supervisor Note';
    onUpdateRecord(updatedRecord, `${fieldName} modified.`);
    setActiveNoteModal(null);
  };

  // Batch action handlers
  const handleSelectAllOnPage = (recordsOnPage: CustomerRecord[]) => {
    const pageIds = recordsOnPage.map(r => r.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleBatchStatus = (status: CallStatus) => {
    selectedIds.forEach(id => {
      const rec = records.find(r => r.id === id);
      if (rec) {
        handleStatusChange(rec, status);
      }
    });
    setSelectedIds([]);
  };

  // Sort records
  const sortedRecords = [...records].sort((a, b) => {
    let aVal: any = a[sortField] || '';
    let bVal: any = b[sortField] || '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  // Paginate
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + pageSize);

  const getStatusBadgeStyle = (status: CallStatus) => {
    switch (status) {
      case 'Success':
        return 'bg-emerald-100/80 text-emerald-800 border-emerald-300';
      case 'In-progress':
        return 'bg-amber-100/80 text-amber-800 border-amber-300';
      case 'Not Available':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Rejected':
        return 'bg-rose-100/80 text-rose-800 border-rose-300';
      case 'Uncalled':
      default:
        return 'bg-zinc-100 text-zinc-600 border-zinc-300';
    }
  };

  const totalTableWidth = Object.values(columnWidths).reduce((acc, w) => acc + w, 0);

  const renderResizer = (colKey: ColumnKey, label: string) => (
    <div
      role="separator"
      aria-orientation="vertical"
      title={`Drag to resize "${label}" column (Current: ${columnWidths[colKey]}px)`}
      onMouseDown={(e) => handleMouseDownResize(colKey, e)}
      onTouchStart={(e) => handleTouchStartResize(colKey, e)}
      onClick={(e) => e.stopPropagation()}
      className={`absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center z-20 group/handle ${
        resizingCol === colKey ? 'bg-blue-500/80 text-white' : 'hover:bg-blue-400/30'
      }`}
    >
      <div className={`w-[2px] h-3.5 transition-colors ${
        resizingCol === colKey ? 'bg-white' : 'bg-slate-300 group-hover/handle:bg-blue-600'
      }`} />
    </div>
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-md shadow-xs overflow-hidden">
      {/* Table Action Controls Toolbar */}
      <div className="px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 text-[10px] sm:text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-bold text-slate-800 text-[11px] sm:text-xs">
            {records.length} Records
          </span>

          {/* Reset Columns Width Button */}
          <button
            onClick={handleResetColumns}
            title="Reset all column widths to default balance"
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500" />
            <span>Reset Columns</span>
          </button>

          <span className="hidden xl:inline-flex text-[10px] text-slate-400 italic">
            (Drag header edges to resize columns)
          </span>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-3 border-l border-slate-300 flex-wrap">
              <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-xs text-[10px] sm:text-[11px]">
                {selectedIds.length} Sel
              </span>
              <span className="text-slate-400 hidden sm:inline">|</span>
              <span className="text-slate-600 hidden sm:inline text-[11px]">Batch:</span>
              <button
                onClick={() => handleBatchStatus('Success')}
                className="px-1.5 sm:px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xs cursor-pointer text-[9.5px] sm:text-xs"
              >
                Success
              </button>
              <button
                onClick={() => handleBatchStatus('In-progress')}
                className="px-1.5 sm:px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-xs cursor-pointer text-[9.5px] sm:text-xs"
              >
                In-prog
              </button>
              <button
                onClick={() => handleBatchStatus('Not Available')}
                className="px-1.5 sm:px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xs cursor-pointer text-[9.5px] sm:text-xs"
              >
                No Answer
              </button>

              {currentUser.role === 'HQ_ADMIN' && onRequestDeleteRecords && (
                <button
                  id="btn-batch-delete-records"
                  onClick={() => onRequestDeleteRecords(selectedIds)}
                  className="px-1.5 sm:px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xs cursor-pointer text-[9.5px] sm:text-xs flex items-center gap-1"
                  title="Delete selected customer records from frontend and Supabase"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete ({selectedIds.length})</span>
                </button>
              )}

              <button
                onClick={() => setSelectedIds([])}
                className="text-[10px] sm:text-xs text-slate-400 hover:text-slate-600 underline ml-0.5 sm:ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* View Options */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border font-medium transition-colors cursor-pointer text-[10px] sm:text-xs ${
              isCompact 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isCompact ? 'Comfortable' : 'Compact'}
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-slate-500 text-[10px] sm:text-xs">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer text-[10px] sm:text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Responsive Table with Resizable Columns and Custom Font */}
      <div className="overflow-x-auto select-auto">
        <table 
          style={{ minWidth: `${totalTableWidth}px` }}
          className={`w-full text-left text-xs border-collapse table-fixed ${getFontClass()}`}
        >
          <thead>
            <tr className="bg-slate-100/95 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-tight text-[9.5px]">
              {/* Checkbox */}
              <th 
                style={{ width: `${columnWidths.select}px` }}
                className="relative py-3 px-2 text-center select-none"
              >
                <input
                  type="checkbox"
                  checked={paginatedRecords.length > 0 && paginatedRecords.every(r => selectedIds.includes(r.id))}
                  onChange={() => handleSelectAllOnPage(paginatedRecords)}
                  className="rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                {renderResizer('select', 'Selection')}
              </th>

              {/* Customer Name */}
              <th 
                style={{ width: `${columnWidths.customerName}px` }}
                className="relative py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap select-none"
                onClick={() => handleSort('customerName')}
              >
                <div className="flex items-center gap-1 pr-2">
                  <span>Customer Name</span>
                  {sortField === 'customerName' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  {!canEditCustomerInfo && <span title="Locked for Agents"><Lock className="w-3 h-3 text-slate-400 ml-1" /></span>}
                </div>
                {renderResizer('customerName', 'Customer Name')}
              </th>

              {/* Phone Number */}
              <th 
                style={{ width: `${columnWidths.phoneNumber}px` }}
                className="relative py-3 px-3 whitespace-nowrap select-none"
              >
                <div className="flex items-center gap-1 pr-2">
                  <span>Phone Number</span>
                  {!canEditCustomerInfo && <span title="Locked for Agents"><Lock className="w-3 h-3 text-slate-400 ml-1" /></span>}
                </div>
                {renderResizer('phoneNumber', 'Phone Number')}
              </th>

              {/* Area of Reg. */}
              <th 
                style={{ width: `${columnWidths.areaOfReg}px` }}
                className="relative py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap select-none"
                onClick={() => handleSort('areaOfReg')}
              >
                <div className="flex items-center gap-1 pr-2">
                  <span>Area of Reg.</span>
                  {sortField === 'areaOfReg' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  {!canEditCustomerInfo && <span title="Locked for Agents"><Lock className="w-3 h-3 text-slate-400 ml-1" /></span>}
                </div>
                {renderResizer('areaOfReg', 'Area of Reg.')}
              </th>

              {/* Status (Editable by All) */}
              <th 
                style={{ width: `${columnWidths.status}px` }}
                className="relative py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1 text-blue-900 pr-2">
                  <span>Status</span>
                  {sortField === 'status' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded-xs font-normal">All</span>
                </div>
                {renderResizer('status', 'Status')}
              </th>

              {/* Call Date */}
              <th 
                style={{ width: `${columnWidths.callDate}px` }}
                className="relative py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap select-none"
                onClick={() => handleSort('callDate')}
              >
                <div className="flex items-center gap-1 text-blue-900 pr-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Call Date</span>
                  {sortField === 'callDate' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded-xs font-normal">All</span>
                </div>
                {renderResizer('callDate', 'Call Date')}
              </th>

              {/* Appointment */}
              <th 
                style={{ width: `${columnWidths.appointment}px` }}
                className="relative py-3 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap select-none"
                onClick={() => handleSort('appointment')}
              >
                <div className="flex items-center gap-1 text-blue-900 pr-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Appointment</span>
                  {sortField === 'appointment' && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded-xs font-normal">All</span>
                </div>
                {renderResizer('appointment', 'Appointment')}
              </th>

              {/* Feedback Note */}
              <th 
                style={{ width: `${columnWidths.feedbackNote}px` }}
                className="relative py-3 px-3 whitespace-nowrap select-none"
              >
                <div className="flex items-center gap-1 text-blue-900 pr-2">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Feedback Note</span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded-xs font-normal">All</span>
                </div>
                {renderResizer('feedbackNote', 'Feedback Note')}
              </th>

              {/* Supervisor Note */}
              <th 
                style={{ width: `${columnWidths.supervisorNote}px` }}
                className="relative py-3 px-3 whitespace-nowrap select-none"
              >
                <div className="flex items-center gap-1 pr-2">
                  <span>Supervisor Note</span>
                  {!canEditSupervisorNote && <span title="Locked for Agents"><Lock className="w-3 h-3 text-slate-400 ml-1" /></span>}
                </div>
                {renderResizer('supervisorNote', 'Supervisor Note')}
              </th>

              {/* Agent Assigned */}
              <th 
                style={{ width: `${columnWidths.assignedAgent}px` }}
                className="relative py-3 px-3 whitespace-nowrap select-none"
              >
                <div className="pr-2">
                  <span>Agent</span>
                </div>
                {renderResizer('assignedAgent', 'Agent')}
              </th>

              {/* Centered Popup Dossier Trigger */}
              <th 
                style={{ width: `${columnWidths.dossier}px` }}
                className="relative py-3 px-2 text-center whitespace-nowrap select-none"
              >
                <span>Popup</span>
                {renderResizer('dossier', 'Popup')}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div className="font-semibold text-sm">No customer records match active filters</div>
                  <div className="text-xs text-slate-400 mt-1">Try expanding the date range or clearing status filters.</div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => {
                const isSelected = selectedIds.includes(record.id);
                const pyClass = isCompact ? 'py-1.5' : 'py-2.5';

                return (
                  <tr 
                    key={record.id}
                    className={`transition-colors group hover:bg-slate-50/90 ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td 
                      style={{ width: `${columnWidths.select}px` }}
                      className={`${pyClass} px-2 text-center overflow-hidden`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedIds(prev => 
                            prev.includes(record.id) 
                              ? prev.filter(i => i !== record.id) 
                              : [...prev, record.id]
                          );
                        }}
                        className="rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Customer Name */}
                    <td 
                      style={{ width: `${columnWidths.customerName}px` }}
                      className={`${pyClass} px-3 font-bold text-slate-900 overflow-hidden`}
                    >
                      {canEditCustomerInfo ? (
                        <input
                          type="text"
                          defaultValue={record.customerName}
                          onBlur={(e) => {
                            if (e.target.value !== record.customerName) {
                              onUpdateRecord({ ...record, customerName: e.target.value }, 'Customer Name updated');
                            }
                          }}
                          className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 font-bold text-slate-900 focus:outline-none truncate"
                        />
                      ) : (
                        <div className="flex items-center gap-1 text-slate-800 truncate">
                          <span className="truncate">{record.customerName}</span>
                          <span title="Locked for Agents"><Lock className="w-3 h-3 text-slate-400 shrink-0" /></span>
                        </div>
                      )}
                    </td>

                    {/* Phone Number */}
                    <td 
                      style={{ width: `${columnWidths.phoneNumber}px` }}
                      className={`${pyClass} px-3 overflow-hidden`}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-slate-700 truncate">
                        <a 
                          href={`tel:${record.phoneNumber}`}
                          className="hover:text-emerald-600 flex items-center gap-1 truncate"
                          title="Click to dial via device tele-client"
                        >
                          <Phone className="w-3 h-3 text-slate-400 hover:text-emerald-600 shrink-0" />
                          <span className="truncate">{record.phoneNumber}</span>
                        </a>
                        <button
                          onClick={(e) => handleCopyPhone(record.id, record.phoneNumber, e)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors shrink-0 cursor-pointer"
                          title="Copy phone"
                        >
                          {copiedId === record.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Area of Reg. */}
                    <td 
                      style={{ width: `${columnWidths.areaOfReg}px` }}
                      className={`${pyClass} px-3 text-slate-700 overflow-hidden`}
                    >
                      <span className="inline-block px-2 py-0.5 rounded-xs text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-full">
                        {record.areaOfReg}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td 
                      style={{ width: `${columnWidths.status}px` }}
                      className={`${pyClass} px-3 overflow-hidden`}
                    >
                      <select
                        value={record.status}
                        onChange={(e) => handleStatusChange(record, e.target.value as CallStatus)}
                        className={`text-xs font-bold px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs transition-all w-full truncate ${getStatusBadgeStyle(record.status)}`}
                      >
                        <option value="Uncalled">Uncalled</option>
                        <option value="Success">Success</option>
                        <option value="In-progress">In-progress</option>
                        <option value="Not Available">Not Available</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>

                    {/* Call Date (Editable by All) */}
                    <td 
                      style={{ width: `${columnWidths.callDate}px` }}
                      className={`${pyClass} px-3 overflow-hidden`}
                    >
                      <input
                        type="date"
                        value={record.callDate || ''}
                        onChange={(e) => handleCallDateChange(record, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                      />
                    </td>

                    {/* Appointment (Editable by All) */}
                    <td 
                      style={{ width: `${columnWidths.appointment}px` }}
                      className={`${pyClass} px-3 overflow-hidden`}
                    >
                      <input
                        type="datetime-local"
                        value={record.appointment || ''}
                        onChange={(e) => handleAppointmentChange(record, e.target.value)}
                        placeholder="Set date & time"
                        className={`w-full bg-white border rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px] ${
                          record.appointment ? 'border-red-300 bg-red-50/40 text-red-900 font-semibold' : 'border-slate-200'
                        }`}
                      />
                    </td>

                    {/* Feedback Note (Editable by All) */}
                    <td 
                      style={{ width: `${columnWidths.feedbackNote}px` }}
                      className={`${pyClass} px-3 overflow-hidden`}
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="truncate text-slate-600 text-xs flex-1">
                          {record.feedbackNote || <span className="text-slate-400 italic">No notes logged...</span>}
                        </span>
                        <button
                          onClick={(e) => handleOpenNoteModal(record, 'feedbackNote', e)}
                          className="p-1 hover:bg-slate-200 text-blue-600 rounded transition-colors shrink-0 cursor-pointer"
                          title="Edit qualitative customer feedback"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Supervisor Note (Admin, Supervisor) */}
                    <td 
                      style={{ width: `${columnWidths.supervisorNote}px` }}
                      className={`${pyClass} px-3 overflow-hidden`}
                    >
                      {canEditSupervisorNote ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="truncate text-slate-600 text-xs flex-1">
                            {record.supervisorNote || <span className="text-slate-400 italic">No directive...</span>}
                          </span>
                          <button
                            onClick={(e) => handleOpenNoteModal(record, 'supervisorNote', e)}
                            className="p-1 hover:bg-slate-200 text-red-600 rounded transition-colors shrink-0 cursor-pointer"
                            title="Edit supervisor directive"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 truncate">
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate italic">{record.supervisorNote || 'Locked'}</span>
                        </div>
                      )}
                    </td>

                    {/* Assigned Agent */}
                    <td 
                      style={{ width: `${columnWidths.assignedAgent}px` }}
                      className={`${pyClass} px-3 text-slate-700 font-medium truncate overflow-hidden`}
                    >
                      <span className="truncate block">{record.assignedAgentName}</span>
                    </td>

                    {/* Dossier Centered Popup Trigger */}
                    <td 
                      style={{ width: `${columnWidths.dossier}px` }}
                      className={`${pyClass} px-2 text-center overflow-hidden`}
                    >
                      <button
                        onClick={() => onOpenCustomerDrawer && onOpenCustomerDrawer(record)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Open customer dossier centered popup"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
          <span className="font-bold text-slate-900">
            {Math.min(startIndex + pageSize, records.length)}
          </span>{' '}
          of <span className="font-bold text-slate-900">{records.length}</span> records
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="font-medium text-slate-700">
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Note Editing Modal */}
      {activeNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 space-y-3.5 sm:space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {activeNoteModal.field === 'feedbackNote' ? 'Customer Feedback & Objections' : 'Internal Supervisor Directive'}
                </h3>
                <p className="text-xs text-slate-500">
                  Target: {activeNoteModal.record.customerName} ({activeNoteModal.record.phoneNumber})
                </p>
              </div>
              <button
                onClick={() => setActiveNoteModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={5}
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
              placeholder="Record detailed notes..."
              className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveNoteModal(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNoteModal}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-xs"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
