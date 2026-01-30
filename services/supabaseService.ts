
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Supplier, Transaction, SupabaseCredentials, User, AppSettings } from '../types';

let supabase: SupabaseClient | null = null;

// --- Local Storage Keys ---
const CACHE_KEYS = {
  SUPPLIERS: 'offline_suppliers',
  TRANSACTIONS: 'offline_transactions',
  USERS: 'offline_users',
  SETTINGS: 'offline_settings',
  SYNC_QUEUE: 'offline_sync_queue',
  LAST_BACKUP: 'app_last_backup_date'
};

// --- Sync Queue Types ---
type QueueAction = 
  | { type: 'CREATE_SUPPLIER'; payload: { name: string; phone: string; tempId: number } }
  | { type: 'CREATE_TRANSACTION'; payload: any; tempId: number }
  | { type: 'UPDATE_TRANSACTION'; id: number; payload: Partial<Transaction> }
  | { type: 'DELETE_TRANSACTION'; id: number }
  | { type: 'DELETE_USER'; id: number }
  | { type: 'CREATE_USER'; payload: { name: string; code: string; tempId: number } }
  | { type: 'SAVE_SETTINGS'; payload: AppSettings };

// --- Helpers ---

const isOnline = () => navigator.onLine;

const saveToCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Cache save failed', e);
  }
};

const getFromCache = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const addToSyncQueue = (action: QueueAction) => {
  const queue: QueueAction[] = getFromCache(CACHE_KEYS.SYNC_QUEUE);
  queue.push(action);
  saveToCache(CACHE_KEYS.SYNC_QUEUE, queue);
};

// Initialize using passed credentials
export const initSupabase = (creds: SupabaseCredentials) => {
  try {
    if (!creds.url || !creds.key) return false;
    supabase = createClient(creds.url, creds.key);
    return true;
  } catch (error) {
    console.error("Invalid Supabase credentials", error);
    return false;
  }
};

export const clearCredentials = () => {
  supabase = null;
};

// --- Sync Function ---

export const syncOfflineChanges = async (): Promise<number> => {
  if (!supabase || !isOnline()) return 0;

  const queue: QueueAction[] = getFromCache(CACHE_KEYS.SYNC_QUEUE);
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  const remainingQueue: QueueAction[] = [];

  for (const action of queue) {
    try {
      switch (action.type) {
        case 'CREATE_SUPPLIER':
          await supabase.from('suppliers').insert([{ name: action.payload.name, phone: action.payload.phone }]);
          break;
        case 'CREATE_TRANSACTION':
          const { tempId, ...transData } = action.payload;
          await supabase.from('transactions').insert([transData]);
          break;
        case 'UPDATE_TRANSACTION':
          await supabase.from('transactions').update(action.payload).eq('id', action.id);
          break;
        case 'DELETE_TRANSACTION':
          if (action.id > 0) {
            await supabase.from('transactions').delete().eq('id', action.id);
          }
          break;
        case 'CREATE_USER':
          await supabase.from('users').insert([{ name: action.payload.name, code: action.payload.code }]);
          break;
        case 'DELETE_USER':
          if (action.id > 0) {
            await supabase.from('users').delete().eq('id', action.id);
          }
          break;
        case 'SAVE_SETTINGS':
           await supabase.from('app_settings').upsert({
            id: 1,
            company_name: action.payload.companyName,
            logo_url: action.payload.logoUrl,
            admin_password: action.payload.adminPassword
          });
          break;
      }
      syncedCount++;
    } catch (error) {
      console.error("Failed to sync item", action, error);
      remainingQueue.push(action); 
    }
  }

  saveToCache(CACHE_KEYS.SYNC_QUEUE, remainingQueue);
  return syncedCount;
};

// --- API Calls ---

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  if (supabase && isOnline()) {
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (!error && data) {
      saveToCache(CACHE_KEYS.SUPPLIERS, data);
      return data;
    }
  }
  return getFromCache<Supplier>(CACHE_KEYS.SUPPLIERS);
};

export const createSupplier = async (name: string, phone: string): Promise<Supplier> => {
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ name, phone }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const tempId = -Date.now();
    const tempSupplier = { id: tempId, name, phone, created_at: new Date().toISOString() };
    addToSyncQueue({ type: 'CREATE_SUPPLIER', payload: { name, phone, tempId } });
    const cached = getFromCache<Supplier>(CACHE_KEYS.SUPPLIERS);
    cached.push(tempSupplier);
    saveToCache(CACHE_KEYS.SUPPLIERS, cached);
    return tempSupplier;
  }
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, supplier:suppliers(name)`)
      .order('date', { ascending: false });
    
    if (!error && data) {
      saveToCache(CACHE_KEYS.TRANSACTIONS, data);
      return data;
    }
  }
  
  const cached = getFromCache<Transaction>(CACHE_KEYS.TRANSACTIONS);
  const queue = getFromCache<QueueAction>(CACHE_KEYS.SYNC_QUEUE);
  
  const offlineTransactions = queue
    .filter(q => q.type === 'CREATE_TRANSACTION')
    .map((q: any) => {
        const suppliers = getFromCache<Supplier>(CACHE_KEYS.SUPPLIERS);
        const supplier = suppliers.find(s => s.id === q.payload.supplier_id);
        return {
            ...q.payload,
            id: q.payload.tempId || -Date.now(),
            created_at: new Date().toISOString(),
            supplier: { name: supplier?.name || 'مورد محلي' }
        } as Transaction;
    });

  const all = [...offlineTransactions, ...cached].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return all;
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at' | 'supplier'>): Promise<Transaction> => {
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const tempId = -Date.now();
    // @ts-ignore
    const payload = { ...transaction, tempId };
    addToSyncQueue({ type: 'CREATE_TRANSACTION', payload, tempId });
    return { id: tempId, ...transaction, created_at: new Date().toISOString() } as Transaction;
  }
};

export const updateTransaction = async (id: number, payload: Partial<Transaction>): Promise<void> => {
  if (supabase && isOnline()) {
    const { error } = await supabase.from('transactions').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    addToSyncQueue({ type: 'UPDATE_TRANSACTION', id, payload });
    // Update local cache
    const cached = getFromCache<Transaction>(CACHE_KEYS.TRANSACTIONS);
    const index = cached.findIndex(t => t.id === id);
    if (index !== -1) {
      cached[index] = { ...cached[index], ...payload };
      saveToCache(CACHE_KEYS.TRANSACTIONS, cached);
    }
  }
};

export const deleteTransaction = async (id: number): Promise<void> => {
   if (supabase && isOnline()) {
     const { error } = await supabase.from('transactions').delete().eq('id', id);
     if (error) throw error;
   } else {
     addToSyncQueue({ type: 'DELETE_TRANSACTION', id });
     const cached = getFromCache<Transaction>(CACHE_KEYS.TRANSACTIONS);
     const updated = cached.filter(t => t.id !== id);
     saveToCache(CACHE_KEYS.TRANSACTIONS, updated);
   }
};

export const deleteAllData = async (): Promise<void> => {
  if (!supabase) throw new Error("Supabase not initialized");
  if (!isOnline()) throw new Error("Cannot reset data while offline");
  
  const { error: transError } = await supabase.from('transactions').delete().gt('id', 0);
  if (transError) throw transError;

  const { error: suppError } = await supabase.from('suppliers').delete().gt('id', 0);
  if (suppError) throw suppError;

  localStorage.removeItem(CACHE_KEYS.SUPPLIERS);
  localStorage.removeItem(CACHE_KEYS.TRANSACTIONS);
  localStorage.removeItem(CACHE_KEYS.SYNC_QUEUE);
};

export const fetchUsers = async (): Promise<User[]> => {
  if (supabase && isOnline()) {
    const { data, error } = await supabase.from('users').select('*').order('name');
    if (!error && data) {
      saveToCache(CACHE_KEYS.USERS, data);
      return data;
    }
  }
  return getFromCache<User>(CACHE_KEYS.USERS);
};

export const createUser = async (name: string, code: string): Promise<User> => {
  if (supabase && isOnline()) {
    const { data, error } = await supabase.from('users').insert([{ name, code }]).select().single();
    if (error) throw error;
    return data;
  } else {
    const tempId = -Date.now();
    const newUser = { id: tempId, name, code, created_at: new Date().toISOString() };
    addToSyncQueue({ type: 'CREATE_USER', payload: { name, code, tempId } });
    const cached = getFromCache<User>(CACHE_KEYS.USERS);
    cached.push(newUser);
    saveToCache(CACHE_KEYS.USERS, cached);
    return newUser;
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  if (supabase && isOnline()) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  } else {
    addToSyncQueue({ type: 'DELETE_USER', id });
    const cached = getFromCache<User>(CACHE_KEYS.USERS);
    const updated = cached.filter(u => u.id !== id);
    saveToCache(CACHE_KEYS.USERS, updated);
  }
};

export const fetchAppSettings = async (): Promise<AppSettings> => {
  if (supabase && isOnline()) {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (!error && data) {
      const settings = {
        companyName: data.company_name,
        logoUrl: data.logo_url,
        adminPassword: data.admin_password
      };
      saveToCache(CACHE_KEYS.SETTINGS, settings);
      return settings;
    }
  }
  const cached = localStorage.getItem(CACHE_KEYS.SETTINGS);
  if (cached) return JSON.parse(cached);
  return { companyName: 'نظام إدارة الموردين', logoUrl: '', adminPassword: '1234' };
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  saveToCache(CACHE_KEYS.SETTINGS, settings);
  if (supabase && isOnline()) {
    const dbPayload = {
      id: 1,
      company_name: settings.companyName,
      logo_url: settings.logoUrl,
      admin_password: settings.adminPassword
    };
    const { error } = await supabase.from('app_settings').upsert(dbPayload);
    if (error) throw error;
  } else {
    addToSyncQueue({ type: 'SAVE_SETTINGS', payload: settings });
  }
};

// --- Backup & Restore ---

export const getBackupData = async () => {
  if (!supabase || !isOnline()) {
    // Return cached data if offline
    return {
      suppliers: getFromCache(CACHE_KEYS.SUPPLIERS),
      transactions: getFromCache(CACHE_KEYS.TRANSACTIONS),
      users: getFromCache(CACHE_KEYS.USERS),
      settings: getFromCache(CACHE_KEYS.SETTINGS),
      backup_date: new Date().toISOString(),
      offline: true
    };
  }

  const [supps, trans, users, settings] = await Promise.all([
    supabase.from('suppliers').select('*'),
    supabase.from('transactions').select('*'),
    supabase.from('users').select('*'),
    supabase.from('app_settings').select('*').eq('id', 1).single()
  ]);

  return {
    suppliers: supps.data || [],
    transactions: trans.data || [],
    users: users.data || [],
    settings: settings.data || null,
    backup_date: new Date().toISOString(),
    version: '1.0'
  };
};

export const restoreFromBackup = async (backupJson: any) => {
  if (!supabase || !isOnline()) throw new Error("يجب توفر اتصال بالإنترنت لاستعادة البيانات");

  // Step 1: Clear existing (DANGEROUS)
  await deleteAllData();

  // Step 2: Insert Suppliers first (due to FK)
  if (backupJson.suppliers?.length > 0) {
    const { error } = await supabase.from('suppliers').insert(backupJson.suppliers);
    if (error) throw error;
  }

  // Step 3: Insert Users
  if (backupJson.users?.length > 0) {
    const { error } = await supabase.from('users').insert(backupJson.users);
    if (error) throw error;
  }

  // Step 4: Insert Transactions
  if (backupJson.transactions?.length > 0) {
    const { error } = await supabase.from('transactions').insert(backupJson.transactions);
    if (error) throw error;
  }

  // Step 5: Restore Settings
  if (backupJson.settings) {
    const { error } = await supabase.from('app_settings').upsert(backupJson.settings);
    if (error) throw error;
  }
  
  return true;
};
