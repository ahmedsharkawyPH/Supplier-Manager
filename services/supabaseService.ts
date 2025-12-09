
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Supplier, Transaction, SupabaseCredentials, User, AppSettings } from '../types';

let supabase: SupabaseClient | null = null;

// --- Local Storage Keys ---
const CACHE_KEYS = {
  SUPPLIERS: 'offline_suppliers',
  TRANSACTIONS: 'offline_transactions',
  USERS: 'offline_users',
  SETTINGS: 'offline_settings',
  SYNC_QUEUE: 'offline_sync_queue'
};

// --- Sync Queue Types ---
type QueueAction = 
  | { type: 'CREATE_SUPPLIER'; payload: { name: string; phone: string; tempId: number } }
  | { type: 'CREATE_TRANSACTION'; payload: any; tempId: number }
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
          // Remove temp props before sending
          const { tempId, ...transData } = action.payload;
          await supabase.from('transactions').insert([transData]);
          break;
        case 'DELETE_TRANSACTION':
          // Only delete if it's a real ID (positive)
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
      // If it failed, keep it in queue to try again (unless it's a permanent error, but simplistic for now)
      remainingQueue.push(action); 
    }
  }

  saveToCache(CACHE_KEYS.SYNC_QUEUE, remainingQueue);
  return syncedCount;
};

// --- API Calls (Wrapped with Offline Logic) ---

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
    // Offline Optimistic Update
    const tempId = -Date.now(); // Negative ID for temp items
    const tempSupplier = { id: tempId, name, phone, created_at: new Date().toISOString() };
    
    addToSyncQueue({ type: 'CREATE_SUPPLIER', payload: { name, phone, tempId } });
    
    // Update local cache immediately
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
  
  // Combine cached server data with local offline creations
  const cached = getFromCache<Transaction>(CACHE_KEYS.TRANSACTIONS);
  const queue = getFromCache<QueueAction>(CACHE_KEYS.SYNC_QUEUE);
  
  // We need to re-construct the optimistically added transactions from the queue to show them
  const offlineTransactions = queue
    .filter(q => q.type === 'CREATE_TRANSACTION')
    .map((q: any) => {
        // Need to find supplier name for display
        const suppliers = getFromCache<Supplier>(CACHE_KEYS.SUPPLIERS);
        const supplier = suppliers.find(s => s.id === q.payload.supplier_id);
        return {
            ...q.payload,
            id: q.payload.tempId || -Date.now(),
            created_at: new Date().toISOString(),
            supplier: { name: supplier?.name || 'مورد محلي' }
        } as Transaction;
    });

  // Merge and sort
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
    // Offline
    const tempId = -Date.now();
    // @ts-ignore
    const payload = { ...transaction, tempId };
    
    addToSyncQueue({ type: 'CREATE_TRANSACTION', payload, tempId });
    
    // Construct return object for UI
    return {
        id: tempId,
        ...transaction,
        created_at: new Date().toISOString()
    } as Transaction;
  }
};

export const deleteTransaction = async (id: number): Promise<void> => {
   if (supabase && isOnline()) {
     const { error } = await supabase.from('transactions').delete().eq('id', id);
     if (error) throw error;
   } else {
     addToSyncQueue({ type: 'DELETE_TRANSACTION', id });
     
     // Remove from local cache immediately for UI responsiveness
     const cached = getFromCache<Transaction>(CACHE_KEYS.TRANSACTIONS);
     const updated = cached.filter(t => t.id !== id);
     saveToCache(CACHE_KEYS.TRANSACTIONS, updated);
   }
};

export const deleteAllData = async (): Promise<void> => {
  if (!supabase) throw new Error("Supabase not initialized");
  if (!isOnline()) throw new Error("Cannot reset data while offline"); // Major destructive action needs internet
  
  const { error: transError } = await supabase.from('transactions').delete().gt('id', 0);
  if (transError) throw transError;

  const { error: suppError } = await supabase.from('suppliers').delete().gt('id', 0);
  if (suppError) throw suppError;

  // Clear local caches too
  localStorage.removeItem(CACHE_KEYS.SUPPLIERS);
  localStorage.removeItem(CACHE_KEYS.TRANSACTIONS);
  localStorage.removeItem(CACHE_KEYS.SYNC_QUEUE);
};

// --- User Management ---

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

// --- App Settings ---

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
  // Always save to cache first
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
