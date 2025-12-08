
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Supplier, Transaction, SupabaseCredentials, User, AppSettings } from '../types';

let supabase: SupabaseClient | null = null;

export const initSupabase = (creds: SupabaseCredentials) => {
  try {
    supabase = createClient(creds.url, creds.key);
    localStorage.setItem('supabase_url', creds.url);
    localStorage.setItem('supabase_key', creds.key);
    return true;
  } catch (error) {
    console.error("Invalid Supabase credentials", error);
    return false;
  }
};

export const getSavedCredentials = (): SupabaseCredentials | null => {
  const url = localStorage.getItem('supabase_url');
  const key = localStorage.getItem('supabase_key');
  if (url && key) return { url, key };
  return null;
};

export const clearCredentials = () => {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_key');
  supabase = null;
};

// --- API Calls ---

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

export const createSupplier = async (name: string, phone: string): Promise<Supplier> => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{ name, phone }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      supplier:suppliers(name)
    `)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at' | 'supplier'>): Promise<Transaction> => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTransaction = async (id: number): Promise<void> => {
   if (!supabase) throw new Error("Supabase not initialized");
   const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
    
    if (error) throw error;
};

export const deleteAllData = async (): Promise<void> => {
  if (!supabase) throw new Error("Supabase not initialized");
  
  // 1. Delete all transactions first (FK constraint)
  const { error: transError } = await supabase
    .from('transactions')
    .delete()
    .gt('id', 0); // Delete all rows where id > 0

  if (transError) throw transError;

  // 2. Delete all suppliers
  const { error: suppError } = await supabase
    .from('suppliers')
    .delete()
    .gt('id', 0);

  if (suppError) throw suppError;
};

// --- User Management ---

export const fetchUsers = async (): Promise<User[]> => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

export const createUser = async (name: string, code: string): Promise<User> => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase
    .from('users')
    .insert([{ name, code }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteUser = async (id: number): Promise<void> => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// --- App Settings (Persistent) ---

export const fetchAppSettings = async (): Promise<AppSettings> => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
    console.error('Error fetching settings:', error);
  }

  // Map DB columns to AppSettings interface
  if (data) {
    return {
      companyName: data.company_name,
      logoUrl: data.logo_url,
      adminPassword: data.admin_password
    };
  }

  // Return defaults if no settings found
  return {
    companyName: 'نظام إدارة الموردين',
    logoUrl: '',
    adminPassword: '1234'
  };
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  if (!supabase) throw new Error("Supabase not initialized");
  
  const dbPayload = {
    id: 1,
    company_name: settings.companyName,
    logo_url: settings.logoUrl,
    admin_password: settings.adminPassword
  };

  const { error } = await supabase
    .from('app_settings')
    .upsert(dbPayload);

  if (error) throw error;
};
