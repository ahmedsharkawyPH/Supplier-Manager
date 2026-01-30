
import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, Transaction, SupplierSummary, AppSettings, TransactionType, User } from './types';
import * as api from './services/supabaseService';
import SupabaseSetup from './components/SupabaseSetup';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import SupplierList from './components/SupplierList';
import SupplierStatement from './components/SupplierStatement';
import Settings from './components/Settings';
import { LayoutDashboard, Users, PlusCircle, LogOut, PackagePlus, Settings as SettingsIcon, Lock, KeyRound, Menu, X, WifiOff, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'transaction' | 'users' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
    companyName: 'نظام إدارة الموردين',
    logoUrl: '',
    adminPassword: '1234'
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [initialTransactionType, setInitialTransactionType] = useState<TransactionType>('invoice');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        const count = await api.syncOfflineChanges();
        await fetchData();
      } catch (e) {
        console.error("Sync failed", e);
      } finally {
        setIsSyncing(false);
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supps, trans, fetchedUsers, fetchedSettings] = await Promise.all([
        api.fetchSuppliers(),
        api.fetchTransactions(),
        api.fetchUsers(),
        api.fetchAppSettings()
      ]);
      setSuppliers(supps);
      setTransactions(trans);
      setUsers(fetchedUsers);
      setAppSettings(fetchedSettings);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName) return;
    setLoading(true);
    try {
      await api.createSupplier(newSupplierName, newSupplierPhone);
      await fetchData();
      setNewSupplierName('');
      setNewSupplierPhone('');
      setShowAddSupplier(false);
    } catch (error) {
      alert("فشل إضافة المورد");
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSubmit = async (data: any) => {
    setLoading(true);
    try {
      let notes = data.notes;
      if (data.type === 'return' && data.original_invoice_number) {
        notes = `${notes ? notes + ' - ' : ''}فاتورة أصلية رقم: ${data.original_invoice_number}`;
      }

      const mainTransData = {
        supplier_id: data.supplier_id,
        type: data.type,
        amount: data.amount,
        date: data.date,
        reference_number: data.reference_number,
        notes: notes,
        created_by: data.created_by
      };
      await api.createTransaction(mainTransData);

      if (data.hasPayment && data.paymentAmount > 0) {
        await api.createTransaction({
          supplier_id: data.supplier_id,
          type: 'payment',
          amount: data.paymentAmount,
          date: data.date,
          reference_number: data.paymentReference,
          notes: `سداد جزء من الفاتورة رقم: ${data.reference_number || '-'}`,
          created_by: data.created_by
        });
      }

      await fetchData();
      setActiveTab('suppliers');
      setSelectedSupplier(null);
    } catch (error) {
      alert("فشل تسجيل العملية");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTransaction = async (id: number, payload: Partial<Transaction>) => {
    setLoading(true);
    try {
      await api.updateTransaction(id, payload);
      await fetchData();
    } catch (error) {
      alert("فشل تحديث العملية");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if(!window.confirm("هل أنت متأكد من الحذف؟")) return;
    setLoading(true);
    try {
      await api.deleteTransaction(id);
      await fetchData();
    } catch (error) {
      alert("فشل حذف العملية");
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    if(!window.confirm("سيتم حذف كل البيانات!")) return;
    setLoading(true);
    try {
      await api.deleteAllData();
      await fetchData();
      alert("تم الحذف");
    } finally {
      setLoading(false);
    }
  };

  const summaries = useMemo<SupplierSummary[]>(() => {
    return suppliers.map(supplier => {
      const supplierTrans = transactions.filter(t => t.supplier_id === supplier.id);
      const opBal = Number(supplier.opening_balance || 0); // Include the opening balance from DB
      const totalInvoices = supplierTrans.filter(t => t.type === 'invoice').reduce((sum, t) => sum + t.amount, 0);
      const totalPayments = supplierTrans.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
      const totalReturns = supplierTrans.filter(t => t.type === 'return').reduce((sum, t) => sum + t.amount, 0);
      
      return {
        supplier,
        totalInvoices,
        totalPayments,
        totalReturns,
        balance: opBal + totalInvoices - (totalPayments + totalReturns)
      };
    });
  }, [suppliers, transactions]);

  if (!isSupabaseConfigured) {
    return <SupabaseSetup onConnected={() => { setIsSupabaseConfigured(true); fetchData(); }} />;
  }

  const handleTabChange = (tab: typeof activeTab) => {
    setIsMobileMenuOpen(false);
    if (tab === 'settings' && !isAdminLoggedIn) {
      setShowAdminLogin(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-slate-900 text-white p-6 shadow-2xl">
             <h2 className="text-xl font-bold mb-8">القائمة</h2>
             <nav className="space-y-4">
                <button onClick={() => handleTabChange('dashboard')} className="w-full text-right py-3 border-b border-slate-800">الرئيسية</button>
                <button onClick={() => handleTabChange('suppliers')} className="w-full text-right py-3 border-b border-slate-800">حسابات الموردين</button>
                <button onClick={() => handleTabChange('transaction')} className="w-full text-right py-3 border-b border-slate-800">تسجيل عملية</button>
             </nav>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full right-0 top-0 no-print z-50">
        <div className="p-6 border-b border-slate-800 text-center">
            <h1 className="text-lg font-bold">{appSettings.companyName}</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => handleTabChange('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-primary-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard className="w-5 h-5" /> <span>الرئيسية</span>
          </button>
          <button onClick={() => handleTabChange('suppliers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'suppliers' ? 'bg-primary-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Users className="w-5 h-5" /> <span>الموردين</span>
          </button>
          <button onClick={() => handleTabChange('transaction')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'transaction' ? 'bg-primary-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            <PlusCircle className="w-5 h-5" /> <span>تسجيل فاتورة</span>
          </button>
          <button onClick={() => handleTabChange('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'settings' ? 'bg-primary-600' : 'text-slate-400 hover:bg-slate-800'}`}>
            <SettingsIcon className="w-5 h-5" /> <span>الإعدادات</span>
          </button>
        </nav>
      </aside>

      <main className={`flex-1 md:mr-64 p-4 md:p-8`}>
        <div className="max-w-6xl mx-auto">
          {loading && <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center"><RefreshCw className="animate-spin w-8 h-8 text-primary-600" /></div>}
          
          {activeTab === 'dashboard' && <Dashboard onNavigate={(t) => { setInitialTransactionType(t); setActiveTab('transaction'); }} />}
          {activeTab === 'transaction' && <TransactionForm suppliers={suppliers} users={users} onSubmit={handleTransactionSubmit} isLoading={loading} initialType={initialTransactionType} />}
          {activeTab === 'suppliers' && (
            selectedSupplier ? (
              <SupplierStatement supplier={selectedSupplier} transactions={transactions.filter(t => t.supplier_id === selectedSupplier.id)} onBack={() => setSelectedSupplier(null)} settings={appSettings} />
            ) : (
              <SupplierList summaries={summaries} onSelectSupplier={setSelectedSupplier} onDeleteTransaction={handleDeleteTransaction} />
            )
          )}
          {activeTab === 'settings' && <Settings onSave={setAppSettings} users={users} transactions={transactions} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} onAddUser={(n, c) => api.createUser(n, c).then(() => fetchData())} onDeleteUser={(id) => api.deleteUser(id).then(() => fetchData())} onResetData={handleResetData} />}
        </div>
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
             <h3 className="text-xl font-bold text-center mb-4">كلمة مرور المشرف</h3>
             <input type="password" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} className="w-full p-3 border-2 rounded-lg text-center mb-4" />
             <div className="flex gap-2">
                <button onClick={() => { if(adminPasswordInput === appSettings.adminPassword) { setIsAdminLoggedIn(true); setShowAdminLogin(false); setActiveTab('settings'); } }} className="flex-1 bg-primary-600 text-white py-2 rounded-lg">دخول</button>
                <button onClick={() => setShowAdminLogin(false)} className="flex-1 bg-slate-100 py-2 rounded-lg">إلغاء</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
