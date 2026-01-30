
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Supplier, Transaction, SupabaseCredentials, User, AppSettings } from '../types';

let supabase: SupabaseClient | null = null;

const CACHE_KEYS = {
  SUPPLIERS: 'offline_suppliers',
  TRANSACTIONS: 'offline_transactions',
  USERS: 'offline_users',
  SETTINGS: 'offline_settings',
  SYNC_QUEUE: 'offline_sync_queue',
  LAST_BACKUP: 'app_last_backup_date'
};

type QueueAction = 
  | { type: 'CREATE_SUPPLIER'; payload: Partial<Supplier> }
  | { type: 'CREATE_TRANSACTION'; payload: any; tempId: number }
  | { type: 'UPDATE_TRANSACTION'; id: number; payload: Partial<Transaction> }
  | { type: 'DELETE_TRANSACTION'; id: number }
  | { type: 'DELETE_USER'; id: number }
  | { type: 'CREATE_USER'; payload: { name: string; code: string; tempId: number } }
  | { type: 'SAVE_SETTINGS'; payload: AppSettings };

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
          await supabase.from('suppliers').insert([action.payload]);
          break;
        case 'CREATE_TRANSACTION':
          const { tempId, ...transData } = action.payload;
          await supabase.from('transactions').insert([transData]);
          break;
        case 'UPDATE_TRANSACTION':
          await supabase.from('transactions').update(action.payload).eq('id', action.id);
          break;
        case 'DELETE_TRANSACTION':
          if (action.id > 0) await supabase.from('transactions').delete().eq('id', action.id);
          break;
        case 'CREATE_USER':
          await supabase.from('users').insert([{ name: action.payload.name, code: action.payload.code }]);
          break;
        case 'DELETE_USER':
          if (action.id > 0) await supabase.from('users').delete().eq('id', action.id);
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
      remainingQueue.push(action); 
    }
  }
  saveToCache(CACHE_KEYS.SYNC_QUEUE, remainingQueue);
  return syncedCount;
};

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
  const newId = Date.now().toString();
  const payload = { id: newId, name, phone, opening_balance: 0, current_balance: 0 };
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    addToSyncQueue({ type: 'CREATE_SUPPLIER', payload });
    const cached = getFromCache<Supplier>(CACHE_KEYS.SUPPLIERS);
    const newSupp = { ...payload, created_at: new Date().toISOString() };
    cached.push(newSupp);
    saveToCache(CACHE_KEYS.SUPPLIERS, cached);
    return newSupp;
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
  return getFromCache<Transaction>(CACHE_KEYS.TRANSACTIONS);
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
    addToSyncQueue({ type: 'CREATE_TRANSACTION', payload: { ...transaction, tempId }, tempId });
    return { id: tempId, ...transaction, created_at: new Date().toISOString() } as Transaction;
  }
};

export const updateTransaction = async (id: number, payload: Partial<Transaction>): Promise<void> => {
  if (supabase && isOnline()) {
    await supabase.from('transactions').update(payload).eq('id', id);
  } else {
    addToSyncQueue({ type: 'UPDATE_TRANSACTION', id, payload });
  }
};

export const deleteTransaction = async (id: number): Promise<void> => {
   if (supabase && isOnline()) {
     await supabase.from('transactions').delete().eq('id', id);
   } else {
     addToSyncQueue({ type: 'DELETE_TRANSACTION', id });
   }
};

export const deleteAllData = async (): Promise<void> => {
  if (!supabase || !isOnline()) return;
  await supabase.from('transactions').delete().gt('id', 0);
  await supabase.from('suppliers').delete().neq('id', '0');
  localStorage.removeItem(CACHE_KEYS.SUPPLIERS);
  localStorage.removeItem(CACHE_KEYS.TRANSACTIONS);
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
    return newUser;
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  if (supabase && isOnline()) {
    await supabase.from('users').delete().eq('id', id);
  } else {
    addToSyncQueue({ type: 'DELETE_USER', id });
  }
};

export const fetchAppSettings = async (): Promise<AppSettings> => {
  if (supabase && isOnline()) {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (!error && data) {
      return { companyName: data.company_name, logoUrl: data.logo_url, adminPassword: data.admin_password };
    }
  }
  return { companyName: 'نظام إدارة الموردين', logoUrl: '', adminPassword: '1234' };
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  if (supabase && isOnline()) {
    await supabase.from('app_settings').upsert({ id: 1, company_name: settings.companyName, logo_url: settings.logoUrl, admin_password: settings.adminPassword });
  } else {
    addToSyncQueue({ type: 'SAVE_SETTINGS', payload: settings });
  }
};

export const getBackupData = async () => {
  if (!supabase || !isOnline()) return null;
  const [supps, trans, users, settings] = await Promise.all([
    supabase.from('suppliers').select('*'),
    supabase.from('transactions').select('*'),
    supabase.from('users').select('*'),
    supabase.from('app_settings').select('*').eq('id', 1).single()
  ]);
  return { suppliers: supps.data, transactions: trans.data, users: users.data, settings: settings.data };
};

export const restoreFromBackup = async (backupJson: any) => {
  if (!supabase || !isOnline()) throw new Error("Offline");
  await deleteAllData();
  if (backupJson.suppliers?.length) await supabase.from('suppliers').insert(backupJson.suppliers);
  if (backupJson.users?.length) await supabase.from('users').insert(backupJson.users);
  if (backupJson.transactions?.length) await supabase.from('transactions').insert(backupJson.transactions);
  if (backupJson.settings) await supabase.from('app_settings').upsert(backupJson.settings);
  return true;
};
