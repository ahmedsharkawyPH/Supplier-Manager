
export type TransactionType = 'invoice' | 'payment' | 'return';

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  created_at?: string;
}

export interface User {
  id: number;
  name: string;
  code: string; // The access PIN
  created_at?: string;
}

export interface Transaction {
  id: number;
  supplier_id: number;
  type: TransactionType;
  amount: number;
  date: string;
  reference_number?: string; // Invoice number or Check number
  notes?: string;
  created_by?: string; // Name of the user who created it
  created_at?: string;
  supplier?: Supplier; // For join queries
}

export interface SupplierSummary {
  supplier: Supplier;
  totalInvoices: number;
  totalPayments: number;
  totalReturns: number;
  balance: number; // Invoices - (Payments + Returns)
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