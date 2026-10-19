import { createClient } from '@supabase/supabase-js';
import { CustomerRecord, User, ActivityLog, RoleDefinition, isRecordAssignedBySupervisor } from '../types';

// Helper to sanitize Supabase URL (strips trailing slashes, accidental /rest/v1 paths, or whitespace)
export function sanitizeSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return 'https://mtrcifsbctzcmjefbsut.supabase.co';
  let url = rawUrl.trim();
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // Strip /rest/v1 or /rest/v1/ if user or environment included it
  url = url.replace(/\/rest\/v1\/?$/, '');
  // Strip any remaining trailing slashes
  url = url.replace(/\/+$/, '');
  return url || 'https://mtrcifsbctzcmjefbsut.supabase.co';
}

const RAW_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mtrcifsbctzcmjefbsut.supabase.co';
export const SUPABASE_URL = sanitizeSupabaseUrl(RAW_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10cmNpZnNiY3R6Y21qZWZic3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMTI5ODQsImV4cCI6MjEwNTU4ODk4NH0.jBVeB1WSGumAQor2BbU_nUR8ELmY2WnDDveKdANLKN0';

// Initialize Supabase Client with sanitized endpoint
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

export interface SupabaseSyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  tablesFound: {
    customerRecords: boolean;
    users: boolean;
    activityLogs: boolean;
  };
}

// Convert camelCase CustomerRecord to snake_case DB row
export function toDBCustomerRecord(record: CustomerRecord) {
  // If assigned or reassigned by supervisor, embed metadata tag in supervisor_note so it survives Supabase storage
  let finalSupervisorNote = record.supervisorNote || '';
  if (isRecordAssignedBySupervisor(record)) {
    const metaPayload = {
      assigned: true,
      fromId: record.reassignedFromAgentId || '',
      fromName: record.reassignedFromAgentName || '',
      at: record.reassignedAt || ''
    };
    // Strip any existing tag first to avoid duplicate tags
    const cleanNote = finalSupervisorNote.replace(/^\[SUP_ASSIGN:[^\]]+\]\s*/, '').trim();
    finalSupervisorNote = `[SUP_ASSIGN:${JSON.stringify(metaPayload)}] ${cleanNote}`.trim();
  }

  // Also embed transaction metrics metadata tag if values are provided so they survive any schema state
  if (record.regDate || record.totalTransactions !== undefined || record.firstTransDate || record.lastTransDate || record.dormantDays !== undefined) {
    const transMeta = {
      regDate: record.regDate || '',
      totalTrans: record.totalTransactions ?? 0,
      firstTransDate: record.firstTransDate || '',
      lastTransDate: record.lastTransDate || '',
      dormantDays: record.dormantDays ?? 0
    };
    finalSupervisorNote = finalSupervisorNote.replace(/^\[TRANS_METRICS:[^\]]+\]\s*/, '').trim();
    finalSupervisorNote = `[TRANS_METRICS:${JSON.stringify(transMeta)}] ${finalSupervisorNote}`.trim();
  }

  return {
    id: record.id,
    customer_name: record.customerName,
    phone_number: record.phoneNumber,
    area_of_reg: record.areaOfReg,
    reg_date: record.regDate || '',
    total_transactions: Number(record.totalTransactions ?? 0),
    first_trans_date: record.firstTransDate || '',
    last_trans_date: record.lastTransDate || '',
    dormant_days: Number(record.dormantDays ?? 0),
    call_date: record.callDate,
    status: record.status,
    appointment: record.appointment || '',
    feedback_note: record.feedbackNote || '',
    supervisor_note: finalSupervisorNote,
    assigned_agent_id: record.assignedAgentId || '',
    assigned_agent_name: record.assignedAgentName || '',
    supervisor_id: record.supervisorId || '',
    has_been_called: record.hasBeenCalled ?? false,
    call_count: record.callCount ?? 0,
    imported_batch_id: record.importedBatchId || '',
    updated_at: record.updatedAt || null,
    created_at: record.createdAt || new Date().toISOString(),
  };
}

// Convert snake_case DB row to camelCase CustomerRecord
export function fromDBCustomerRecord(row: any): CustomerRecord {
  let appointmentAssignedBySupervisor = Boolean(row.appointment_assigned_by_supervisor ?? row.appointmentAssignedBySupervisor);
  let reassignedFromAgentId: string | undefined = row.reassigned_from_agent_id || row.reassignedFromAgentId || undefined;
  let reassignedFromAgentName: string | undefined = row.reassigned_from_agent_name || row.reassignedFromAgentName || undefined;
  let reassignedAt: string | undefined = row.reassigned_at || row.reassignedAt || undefined;

  let supervisorNote = row.supervisor_note || row.supervisorNote || '';

  // Extract embedded metadata tag from supervisorNote if present
  if (typeof supervisorNote === 'string') {
    const tagMatch = supervisorNote.match(/\[SUP_ASSIGN:([^\]]+)\]/);
    if (tagMatch) {
      try {
        const parsed = JSON.parse(tagMatch[1]);
        if (parsed.assigned) appointmentAssignedBySupervisor = true;
        if (parsed.fromId) reassignedFromAgentId = parsed.fromId;
        if (parsed.fromName) reassignedFromAgentName = parsed.fromName;
        if (parsed.at) reassignedAt = parsed.at;
        supervisorNote = supervisorNote.replace(tagMatch[0], '').trim();
      } catch (e) {
        // ignore parse error
      }
    }
  }

  let regDate = row.reg_date || row.regDate || '';
  let totalTransactions = row.total_transactions !== undefined && row.total_transactions !== null 
    ? Number(row.total_transactions) 
    : (row.totalTransactions !== undefined ? Number(row.totalTransactions) : 0);
  let firstTransDate = row.first_trans_date || row.firstTransDate || '';
  let lastTransDate = row.last_trans_date || row.lastTransDate || '';
  let dormantDays = row.dormant_days !== undefined && row.dormant_days !== null 
    ? Number(row.dormant_days) 
    : (row.dormantDays !== undefined ? Number(row.dormantDays) : 0);

  // Extract embedded [TRANS_METRICS:...] tag from supervisorNote if present
  if (typeof supervisorNote === 'string') {
    const transMatch = supervisorNote.match(/\[TRANS_METRICS:([^\]]+)\]/);
    if (transMatch) {
      try {
        const parsed = JSON.parse(transMatch[1]);
        if (!regDate && parsed.regDate) regDate = parsed.regDate;
        if (!totalTransactions && parsed.totalTrans !== undefined) totalTransactions = Number(parsed.totalTrans);
        if (!firstTransDate && parsed.firstTransDate) firstTransDate = parsed.firstTransDate;
        if (!lastTransDate && parsed.lastTransDate) lastTransDate = parsed.lastTransDate;
        if (!dormantDays && parsed.dormantDays !== undefined) dormantDays = Number(parsed.dormantDays);
        supervisorNote = supervisorNote.replace(transMatch[0], '').trim();
      } catch (e) {
        // ignore parse error
      }
    }
  }

  // Heuristic fallback: check if supervisorNote text itself indicates supervisor assignment
  if (!appointmentAssignedBySupervisor && !reassignedFromAgentId && typeof supervisorNote === 'string') {
    const lower = supervisorNote.toLowerCase();
    if (
      lower.includes('by supervisor') ||
      lower.includes('assigned by supervisor') ||
      lower.startsWith('assigned to ') ||
      lower.includes('supervisor assigned')
    ) {
      appointmentAssignedBySupervisor = true;
    }
  }

  return {
    id: String(row.id),
    customerName: row.customer_name || row.customerName || '',
    phoneNumber: row.phone_number || row.phoneNumber || '',
    areaOfReg: row.area_of_reg || row.areaOfReg || 'General',
    regDate: regDate,
    totalTransactions: totalTransactions,
    firstTransDate: firstTransDate,
    lastTransDate: lastTransDate,
    dormantDays: dormantDays,
    callDate: row.call_date || row.callDate || '',
    status: row.status || 'Uncalled',
    appointment: row.appointment || '',
    feedbackNote: row.feedback_note || row.feedbackNote || '',
    supervisorNote: supervisorNote,
    assignedAgentId: row.assigned_agent_id || row.assignedAgentId || '',
    assignedAgentName: row.assigned_agent_name || row.assignedAgentName || '',
    supervisorId: row.supervisor_id || row.supervisorId || '',
    hasBeenCalled: Boolean(row.has_been_called ?? row.hasBeenCalled),
    callCount: Number(row.call_count ?? row.callCount ?? 0),
    importedBatchId: row.imported_batch_id || row.importedBatchId,
    appointmentAssignedBySupervisor: appointmentAssignedBySupervisor || undefined,
    reassignedFromAgentId: reassignedFromAgentId,
    reassignedFromAgentName: reassignedFromAgentName,
    reassignedAt: reassignedAt,
    updatedAt: row.updated_at || row.updatedAt || '',
    createdAt: row.created_at || row.createdAt || '',
  };
}

// Convert User to DB row
export function toDBUser(user: User) {
  // Store password and force password change status securely in the avatar metadata string
  const isDefaultPassword = user.password === 'amal123' || !user.password;
  const requiresChange = user.mustChangePassword !== undefined ? user.mustChangePassword : isDefaultPassword;
  
  const securityPayload = JSON.stringify({
    pwd: user.password || 'amal123',
    mustChangePassword: requiresChange,
    avatarUrl: user.avatar && !user.avatar.startsWith('{') ? user.avatar : null,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch,
    supervisor_id: user.supervisorId || null,
    phone: user.phone || null,
    active: user.active ?? true,
    custom_permissions: user.customPermissions || [],
    avatar: securityPayload,
    updated_at: new Date().toISOString(),
  };
}

// Convert DB row to User
export function fromDBUser(row: any): User {
  let password = 'amal123';
  let mustChangePassword = false;
  let avatarUrl: string | undefined = undefined;

  if (row.avatar && typeof row.avatar === 'string' && row.avatar.startsWith('{')) {
    try {
      const parsed = JSON.parse(row.avatar);
      if (parsed.pwd) password = parsed.pwd;
      if (parsed.mustChangePassword !== undefined) {
        mustChangePassword = Boolean(parsed.mustChangePassword);
      } else if (password === 'amal123') {
        mustChangePassword = true;
      }
      avatarUrl = parsed.avatarUrl || undefined;
    } catch (e) {
      avatarUrl = row.avatar;
    }
  } else {
    avatarUrl = row.avatar;
    if (row.password) {
      password = row.password;
    }
    // If password is standard amal123, mark mustChangePassword
    if (password === 'amal123') {
      mustChangePassword = true;
    }
  }

  // Pre-configured admin u-admin-1 starts with mustChangePassword: false unless explicitly flagged
  if (row.id === 'u-admin-1' && (row.avatar === null || !row.avatar?.includes('"mustChangePassword":true'))) {
    mustChangePassword = false;
  }

  return {
    id: String(row.id),
    name: row.name || '',
    email: row.email || '',
    role: row.role || 'TEAM_MEMBER',
    branch: row.branch || 'Headquarters',
    supervisorId: row.supervisor_id || row.supervisorId,
    phone: row.phone,
    active: row.active ?? true,
    avatar: avatarUrl,
    password: password,
    mustChangePassword: mustChangePassword,
    customPermissions: row.custom_permissions || row.customPermissions,
  };
}

// Convert ActivityLog to DB row
export function toDBActivityLog(log: ActivityLog) {
  return {
    id: log.id,
    timestamp: log.timestamp,
    user_id: log.userId,
    user_name: log.userName,
    user_role: log.userRole,
    record_id: log.recordId,
    customer_name: log.customerName,
    action: log.action,
    previous_value: log.previousValue || null,
    new_value: log.newValue || null,
    details: log.details || '',
  };
}

// Convert DB row to ActivityLog
export function fromDBActivityLog(row: any): ActivityLog {
  return {
    id: String(row.id),
    timestamp: row.timestamp || new Date().toISOString(),
    userId: row.user_id || row.userId || '',
    userName: row.user_name || row.userName || '',
    userRole: row.user_role || row.userRole || 'TEAM_MEMBER',
    recordId: row.record_id || row.recordId || '',
    customerName: row.customer_name || row.customerName || '',
    action: row.action || 'STATUS_CHANGE',
    previousValue: row.previous_value || row.previousValue,
    newValue: row.new_value || row.newValue,
    details: row.details || '',
  };
}

// Database query helpers with fallback & error handling
export const supabaseDb = {
  // Test connectivity
  async testConnection(): Promise<{ success: boolean; message: string; tables: { customerRecords: boolean; users: boolean; activityLogs: boolean } }> {
    try {
      const tables = { customerRecords: false, users: false, activityLogs: false };
      
      const { error: customerErr } = await supabase.from('customer_records').select('id').limit(1);
      tables.customerRecords = !customerErr;

      const { error: usersErr } = await supabase.from('users').select('id').limit(1);
      tables.users = !usersErr;

      const { error: logsErr } = await supabase.from('activity_logs').select('id').limit(1);
      tables.activityLogs = !logsErr;

      const anyAvailable = tables.customerRecords || tables.users || tables.activityLogs;
      return {
        success: true,
        message: anyAvailable ? 'Connected to Supabase project tables' : 'Connected to Supabase project (ready to create tables)',
        tables,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to connect to Supabase',
        tables: { customerRecords: false, users: false, activityLogs: false },
      };
    }
  },

  // Fetch all customer records with automatic pagination across 1,000-row limits
  async fetchCustomers(): Promise<CustomerRecord[] | null> {
    try {
      const rowMap = new Map<string, any>();
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from('customer_records')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to);

        if (error) {
          console.warn('Supabase fetchCustomers notice:', error.message);
          // If we already retrieved earlier pages, return what we got
          if (rowMap.size > 0) break;
          return null;
        }

        if (data && data.length > 0) {
          for (const row of data) {
            if (row && row.id && !rowMap.has(row.id)) {
              rowMap.set(row.id, row);
            }
          }
          if (data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      const uniqueRows = Array.from(rowMap.values());
      console.log(`[Supabase fetchCustomers: Complete] Successfully fetched ${uniqueRows.length} unique customer records.`);
      return uniqueRows.map(fromDBCustomerRecord);
    } catch (err) {
      console.warn('Supabase fetchCustomers error:', err);
      return null;
    }
  },

  // Check if new transaction & registration columns exist in the remote Supabase database
  async checkTransactionColumnsExist(): Promise<boolean> {
    try {
      const { error } = await supabase.from('customer_records').select('reg_date').limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  // Upsert a customer record (with schema-adaptive fallback)
  async upsertCustomer(record: CustomerRecord): Promise<boolean> {
    try {
      const row = toDBCustomerRecord(record);
      let { error } = await supabase
        .from('customer_records')
        .upsert(row, { onConflict: 'id' });

      // If database columns have not been migrated yet, retry with base schema (data is safely preserved in supervisor_note tag)
      if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
        const { reg_date, total_transactions, first_trans_date, last_trans_date, dormant_days, ...baseRow } = row as any;
        const fallback = await supabase
          .from('customer_records')
          .upsert(baseRow, { onConflict: 'id' });
        error = fallback.error;
      }

      if (error) {
        console.warn('Supabase upsertCustomer notice:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase upsertCustomer error:', err);
      return false;
    }
  },

  // Batch insert/upsert records with chunked uploads and schema-adaptive fallback
  async batchUpsertCustomers(records: CustomerRecord[]): Promise<boolean> {
    try {
      if (records.length === 0) return true;
      const rows = records.map(toDBCustomerRecord);
      const CHUNK_SIZE = 500;
      
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        let { error } = await supabase
          .from('customer_records')
          .upsert(chunk, { onConflict: 'id' });

        // If database columns have not been migrated yet, retry with base schema (data is safely preserved in supervisor_note tag)
        if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
          const baseChunk = chunk.map(r => {
            const { reg_date, total_transactions, first_trans_date, last_trans_date, dormant_days, ...baseRow } = r as any;
            return baseRow;
          });
          const fallback = await supabase
            .from('customer_records')
            .upsert(baseChunk, { onConflict: 'id' });
          error = fallback.error;
        }

        if (error) {
          console.warn('Supabase batchUpsertCustomers notice on chunk:', error.message);
          return false;
        }
      }
      return true;
    } catch (err) {
      console.warn('Supabase batchUpsertCustomers error:', err);
      return false;
    }
  },

  // Delete customer record
  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customer_records')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase deleteCustomer notice:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase deleteCustomer error:', err);
      return false;
    }
  },

  // Delete customer records by array of IDs in chunks
  async deleteCustomers(ids: string[]): Promise<boolean> {
    try {
      if (ids.length === 0) return true;
      const CHUNK_SIZE = 100;
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('customer_records')
          .delete()
          .in('id', chunk);

        if (error) {
          console.warn('Supabase deleteCustomers notice:', error.message);
          return false;
        }
      }
      return true;
    } catch (err) {
      console.warn('Supabase deleteCustomers error:', err);
      return false;
    }
  },

  // Delete customer records assigned to an agent by agent ID and/or name
  async deleteCustomersByAgent(agentId: string, agentName?: string): Promise<boolean> {
    try {
      let success = true;
      if (agentId) {
        const { error } = await supabase
          .from('customer_records')
          .delete()
          .eq('assigned_agent_id', agentId);
        if (error) {
          console.warn('Supabase deleteCustomersByAgent (by id) notice:', error.message);
          success = false;
        }
      }
      if (agentName) {
        const { error } = await supabase
          .from('customer_records')
          .delete()
          .eq('assigned_agent_name', agentName);
        if (error) {
          console.warn('Supabase deleteCustomersByAgent (by name) notice:', error.message);
          success = false;
        }
      }
      return success;
    } catch (err) {
      console.warn('Supabase deleteCustomersByAgent error:', err);
      return false;
    }
  },

  // Delete customer records belonging to an imported batch ID
  async deleteCustomersByBatch(batchId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customer_records')
        .delete()
        .eq('imported_batch_id', batchId);

      if (error) {
        console.warn('Supabase deleteCustomersByBatch notice:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase deleteCustomersByBatch error:', err);
      return false;
    }
  },

  // Delete all customer records
  async deleteAllCustomers(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customer_records')
        .delete()
        .neq('id', '');

      if (error) {
        console.warn('Supabase deleteAllCustomers notice:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase deleteAllCustomers error:', err);
      return false;
    }
  },

  // Delete all customer records that have no valid agent user assigned in cloud database
  async purgeOrphanedCustomerRecords(validUsers: User[]): Promise<{ deletedCount: number; success: boolean }> {
    try {
      console.group('[Supabase DB: purgeOrphanedCustomerRecords]');
      const { data, error } = await supabase
        .from('customer_records')
        .select('id, assigned_agent_id, assigned_agent_name');

      if (error || !data) {
        console.warn('Supabase purgeOrphanedCustomerRecords query notice:', error?.message);
        console.groupEnd();
        return { deletedCount: 0, success: false };
      }

      const agentUsers = validUsers.filter(u => u.role === 'TEAM_MEMBER');
      const effectiveAgents = agentUsers.length > 0 ? agentUsers : validUsers;
      const validAgentIds = new Set(effectiveAgents.map(u => u.id));
      const validAgentNames = new Set(effectiveAgents.map(u => u.name.trim().toLowerCase()));

      const orphanedIds: string[] = [];
      for (const row of data) {
        const agentId = row.assigned_agent_id ? String(row.assigned_agent_id).trim() : '';
        const agentName = row.assigned_agent_name ? String(row.assigned_agent_name).trim().toLowerCase() : '';

        const hasValidId = agentId && agentId !== 'unassigned' && validAgentIds.has(agentId);
        const hasValidName = agentName && agentName !== 'unassigned' && validAgentNames.has(agentName);

        if (!hasValidId && !hasValidName) {
          orphanedIds.push(row.id);
        }
      }

      if (orphanedIds.length > 0) {
        console.log(`[Supabase DB: purgeOrphanedCustomerRecords] Found ${orphanedIds.length} orphaned customer records with no agent user. Purging...`);
        const success = await this.deleteCustomers(orphanedIds);
        console.groupEnd();
        return { deletedCount: orphanedIds.length, success };
      }

      console.log('[Supabase DB: purgeOrphanedCustomerRecords] Database is clean. No orphaned records found.');
      console.groupEnd();
      return { deletedCount: 0, success: true };
    } catch (err) {
      console.warn('Supabase purgeOrphanedCustomerRecords error:', err);
      console.groupEnd();
      return { deletedCount: 0, success: false };
    }
  },

  // Fetch users with detailed logging
  async fetchUsers(): Promise<User[] | null> {
    try {
      console.log('[Supabase fetchUsers: Query] Querying users table: SELECT * FROM users ORDER BY name ASC');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[Supabase fetchUsers: Error] Failed to retrieve users from cloud database:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return null;
      }
      console.log(`[Supabase fetchUsers: Success] Retrieved ${data ? data.length : 0} user record(s) from cloud database.`);
      return data ? data.map(fromDBUser) : [];
    } catch (err: any) {
      console.error('[Supabase fetchUsers: Exception] Unexpected failure reading users:', err);
      return null;
    }
  },

  // Upsert user with transactional logging and structured outcome
  async upsertUser(user: User): Promise<{ success: boolean; error?: string; code?: string }> {
    console.group(`[Supabase DB Transaction: upsertUser] User: ${user.name} (${user.id})`);
    try {
      const row = toDBUser(user);
      console.log('[Supabase upsertUser: Payload]', {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        branch: row.branch,
        supervisor_id: row.supervisor_id,
        phone: row.phone,
        active: row.active
      });

      console.log('[Supabase upsertUser: Executing] Submitting upsert transaction to "users" table...');
      let { data, error } = await supabase
        .from('users')
        .upsert(row, { onConflict: 'id' })
        .select();

      // If select failed or path returned an error, fallback to standard upsert without representation
      if (error) {
        console.warn('[Supabase upsertUser: Retry] Primary upsert with select returned error, attempting direct upsert:', error.message);
        const fallbackRes = await supabase
          .from('users')
          .upsert(row, { onConflict: 'id' });
        
        if (!fallbackRes.error) {
          console.log('[Supabase upsertUser: Committed via Fallback] Database record written successfully.');
          console.groupEnd();
          return { success: true };
        }
        
        // Use the fallback error if both fail
        error = fallbackRes.error;
      }

      if (error) {
        console.error('[Supabase upsertUser: Rejected] Supabase rejected database upsert:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        console.groupEnd();
        return { 
          success: false, 
          error: error.message || 'Database rejected upsert transaction', 
          code: error.code 
        };
      }

      console.log('[Supabase upsertUser: Committed] Database record written successfully:', data);
      console.groupEnd();
      return { success: true };
    } catch (err: any) {
      console.error('[Supabase upsertUser: Exception] Fatal exception during user upsert:', err);
      console.groupEnd();
      return { 
        success: false, 
        error: err?.message || 'Network or communication failure with database' 
      };
    }
  },

  // Batch insert/upsert users
  async batchUpsertUsers(users: User[]): Promise<{ success: boolean; count: number; error?: string }> {
    console.group(`[Supabase DB Transaction: batchUpsertUsers] Count: ${users.length}`);
    try {
      if (users.length === 0) {
        console.groupEnd();
        return { success: true, count: 0 };
      }
      const rows = users.map(toDBUser);
      console.log(`[Supabase batchUpsertUsers: Executing] Upserting ${rows.length} user rows...`);
      const { error } = await supabase
        .from('users')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.error('[Supabase batchUpsertUsers: Error]', error);
        console.groupEnd();
        return { success: false, count: 0, error: error.message };
      }

      console.log(`[Supabase batchUpsertUsers: Committed] Successfully upserted ${users.length} users.`);
      console.groupEnd();
      return { success: true, count: users.length };
    } catch (err: any) {
      console.error('[Supabase batchUpsertUsers: Exception]', err);
      console.groupEnd();
      return { success: false, count: 0, error: err?.message || 'Failed batch upserting users' };
    }
  },

  // Directly update user private password and mark mustChangePassword false
  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const securityPayload = JSON.stringify({
        pwd: newPassword,
        mustChangePassword: false,
      });

      const { error } = await supabase
        .from('users')
        .update({
          avatar: securityPayload,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.warn('Supabase updateUserPassword notice:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase updateUserPassword error:', err);
      return false;
    }
  },

  // Delete user and automatically cascade delete all associated customer records from cloud database
  async deleteUser(userId: string, userName?: string): Promise<boolean> {
    try {
      console.group(`[Supabase DB: deleteUser] Purging user ${userId} (${userName || 'Unknown'})`);

      // 1. Purge all customer records assigned to this user from customer_records table
      if (userId) {
        const { error: errId } = await supabase
          .from('customer_records')
          .delete()
          .eq('assigned_agent_id', userId);
        if (errId) {
          console.warn('[Supabase deleteUser] Error removing records by assigned_agent_id:', errId.message);
        }

        // Also clean up records if supervisor
        const { error: errSup } = await supabase
          .from('customer_records')
          .delete()
          .eq('supervisor_id', userId);
        if (errSup) {
          console.warn('[Supabase deleteUser] Error removing records by supervisor_id:', errSup.message);
        }
      }

      if (userName && userName.trim()) {
        const { error: errName } = await supabase
          .from('customer_records')
          .delete()
          .eq('assigned_agent_name', userName.trim());
        if (errName) {
          console.warn('[Supabase deleteUser] Error removing records by assigned_agent_name:', errName.message);
        }
      }

      // 2. Delete user account from users table
      const { error: errUser } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (errUser) {
        console.error('[Supabase deleteUser: Error] Failed to delete user from database:', errUser.message);
        console.groupEnd();
        return false;
      }

      console.log(`[Supabase deleteUser: Success] Successfully deleted user ${userId} and cascaded customer record deletion.`);
      console.groupEnd();
      return true;
    } catch (err: any) {
      console.error('[Supabase deleteUser: Exception]', err);
      return false;
    }
  },

  // Fetch Activity Logs
  async fetchActivityLogs(): Promise<ActivityLog[] | null> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Supabase fetchActivityLogs notice:', error.message);
        return null;
      }
      return data ? data.map(fromDBActivityLog) : [];
    } catch (err) {
      console.warn('Supabase fetchActivityLogs error:', err);
      return null;
    }
  },

  // Insert Activity Log
  async insertActivityLog(log: ActivityLog): Promise<boolean> {
    try {
      const row = toDBActivityLog(log);
      const { error } = await supabase
        .from('activity_logs')
        .insert(row);

      if (error) {
        console.warn('Supabase insertActivityLog notice:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase insertActivityLog error:', err);
      return false;
    }
  },

  // Seed default data to Supabase if tables are empty
  async seedInitialDataIfEmpty(
    initialRecords: CustomerRecord[],
    initialUsers: User[],
    initialLogs: ActivityLog[]
  ) {
    try {
      // Check customer records
      const { count: recordCount, error: recErr } = await supabase
        .from('customer_records')
        .select('*', { count: 'exact', head: true });

      if (!recErr && (recordCount === null || recordCount === 0)) {
        console.log('Seeding initial customer records to Supabase...');
        const rows = initialRecords.map(toDBCustomerRecord);
        await supabase.from('customer_records').upsert(rows);
      }

      // Check users
      const { count: userCount, error: userErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (!userErr && (userCount === null || userCount === 0)) {
        console.log('Seeding initial users to Supabase...');
        const userRows = initialUsers.map(toDBUser);
        await supabase.from('users').upsert(userRows);
      }
    } catch (err) {
      console.warn('Supabase seed notice:', err);
    }
  },
};

// SQL Schema for the user to run in Supabase SQL Editor if creating from scratch or migrating
export const SUPABASE_SQL_SCHEMA = `-- MYCASH Calling Portal Database Schema for Supabase
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/mtrcifsbctzcmjefbsut/sql)

-- 1. Create customer_records table (with Transaction & Registration columns)
CREATE TABLE IF NOT EXISTS public.customer_records (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    area_of_reg TEXT DEFAULT 'General',
    reg_date TEXT DEFAULT '',
    total_transactions INTEGER DEFAULT 0,
    first_trans_date TEXT DEFAULT '',
    last_trans_date TEXT DEFAULT '',
    dormant_days INTEGER DEFAULT 0,
    call_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Uncalled',
    appointment TEXT DEFAULT '',
    feedback_note TEXT DEFAULT '',
    supervisor_note TEXT DEFAULT '',
    assigned_agent_id TEXT DEFAULT '',
    assigned_agent_name TEXT DEFAULT '',
    supervisor_id TEXT DEFAULT '',
    has_been_called BOOLEAN DEFAULT false,
    call_count INTEGER DEFAULT 0,
    imported_batch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast column migration for existing customer_records table:
ALTER TABLE public.customer_records 
    ADD COLUMN IF NOT EXISTS reg_date TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS total_transactions INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS first_trans_date TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_trans_date TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS dormant_days INTEGER DEFAULT 0;

-- 2. Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'TEAM_MEMBER',
    branch TEXT DEFAULT 'Headquarters',
    supervisor_id TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    avatar TEXT,
    password TEXT DEFAULT 'amal123',
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    record_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    action TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    details TEXT DEFAULT ''
);

-- 4. Enable Row Level Security (RLS) and grant open access for application client
ALTER TABLE public.customer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access with the anon key
CREATE POLICY "Allow public all on customer_records" ON public.customer_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
`;
