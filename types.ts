
export type TransactionType = 'invoice' | 'payment' | 'return';

export interface Supplier {
  id: string; // Changed from number to string
  name: string;
  phone?: string;
  code?: string;
  contact_person?: string;
  address?: string;
  opening_balance?: number;
  current_balance?: number;
  created_at?: string;
}

export interface User {
  id: number;
  name: string;
  code: string; 
  created_at?: string;
}

export interface Transaction {
  id: number;
  supplier_id: string; // Changed from number to string
  type: TransactionType;
  amount: number;
  date: string;
  reference_number?: string; 
  notes?: string;
  created_by?: string; 
  created_at?: string;
  supplier?: Supplier; 
}

export interface SupplierSummary {
  supplier: Supplier;
  totalInvoices: number;
  totalPayments: number;
  totalReturns: number;
  balance: number; 
}

export interface SupabaseCredentials {
  url: string;
  key: string;
}

export interface AppSettings {
  companyName: string;
  logoUrl: string;
  adminPassword?: string;
}
