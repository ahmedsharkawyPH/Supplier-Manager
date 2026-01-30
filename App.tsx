
import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, Transaction, SupplierSummary, AppSettings, TransactionType, User } from './types';
import * as api from './services/supabaseService';
import SupabaseSetup from './components/SupabaseSetup';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import SupplierList from './components/SupplierList';
import SupplierStatement from './components/SupplierStatement';
import Settings from './components/Settings';
import { LayoutDashboard, Users, PlusCircle, Settings as SettingsIcon, Menu, X, RefreshCw, Save, UserPlus } from 'lucide-react';

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
  
  // Supplier Form State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState({ name: '', phone: '', openingBalance: '0' });

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await api.syncOfflineChanges();
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

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({ name: '', phone: '', openingBalance: '0' });
    setShowSupplierModal(true);
  };

  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({ 
      name: supplier.name, 
      phone: supplier.phone || '', 
      openingBalance: (supplier.opening_balance || 0).toString() 
    });
    setShowSupplierModal(true);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, {
          name: supplierFormData.name,
          phone: supplierFormData.phone,
          opening_balance: parseFloat(supplierFormData.openingBalance)
        });
      } else {
        await api.createSupplier(
          supplierFormData.name, 
          supplierFormData.phone, 
          parseFloat(supplierFormData.openingBalance)
        );
      }
      await fetchData();
      setShowSupplierModal(false);
    } catch (error) {
      alert("حدث خطأ أثناء حفظ بيانات المورد");
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
      const opBal = Number(supplier.opening_balance || 0);
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
             <nav className="space-y-4 text-right">
                <button onClick={() => handleTabChange('dashboard')} className="w-full text-right py-3 border-b border-slate-800">الرئيسية</button>
                <button onClick={() => handleTabChange('suppliers')} className="w-full text-right py-3 border-b border-slate-800">حسابات الموردين</button>
                <button onClick={() => handleTabChange('transaction')} className="w-full text-right py-3 border-b border-slate-800">تسجيل عملية</button>
                <button onClick={() => handleTabChange('settings')} className="w-full text-right py-3 border-b border-slate-800">الإعدادات</button>
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
          <button onClick={() => handleTabChange('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-primary-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard className="w-5 h-5" /> <span>الرئيسية</span>
          </button>
          <button onClick={() => handleTabChange('suppliers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'suppliers' ? 'bg-primary-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Users className="w-5 h-5" /> <span>الموردين</span>
          </button>
          <button onClick={() => handleTabChange('transaction')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'transaction' ? 'bg-primary-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <PlusCircle className="w-5 h-5" /> <span>تسجيل فاتورة</span>
          </button>
          <button onClick={() => handleTabChange('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'settings' ? 'bg-primary-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
            <SettingsIcon className="w-5 h-5" /> <span>الإعدادات</span>
          </button>
        </nav>
        
        {isSyncing && (
          <div className="p-4 bg-slate-800/50 text-xs text-primary-400 flex items-center gap-2">
             <RefreshCw className="w-3 h-3 animate-spin" />
             <span>جاري مزامنة البيانات...</span>
          </div>
        )}
      </aside>

      <main className={`flex-1 md:mr-64 p-4 md:p-8`}>
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100 no-print">
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg">
             <Menu className="w-6 h-6" />
           </button>
           <h2 className="font-bold">{appSettings.companyName}</h2>
           <div className="w-10"></div>
        </div>

        <div className="max-w-6xl mx-auto">
          {loading && <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center"><RefreshCw className="animate-spin w-8 h-8 text-primary-600" /></div>}
          
          {activeTab === 'dashboard' && <Dashboard onNavigate={(t) => { setInitialTransactionType(t); setActiveTab('transaction'); }} />}
          {activeTab === 'transaction' && <TransactionForm suppliers={suppliers} users={users} onSubmit={handleTransactionSubmit} isLoading={loading} initialType={initialTransactionType} />}
          {activeTab === 'suppliers' && (
            selectedSupplier ? (
              <SupplierStatement supplier={selectedSupplier} transactions={transactions.filter(t => t.supplier_id === selectedSupplier.id)} onBack={() => setSelectedSupplier(null)} settings={appSettings} />
            ) : (
              <SupplierList 
                summaries={summaries} 
                onSelectSupplier={setSelectedSupplier} 
                onDeleteTransaction={handleDeleteTransaction}
                onEditSupplier={openEditSupplier}
                onAddNewSupplier={openAddSupplier}
              />
            )
          )}
          {activeTab === 'settings' && <Settings onSave={setAppSettings} users={users} transactions={transactions} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} onAddUser={(n, c) => api.createUser(n, c).then(() => fetchData())} onDeleteUser={(id) => api.deleteUser(id).then(() => fetchData())} onResetData={handleResetData} />}
        </div>
      </main>

      {/* Supplier Form Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                {editingSupplier ? 'تعديل بيانات مورد' : 'إضافة مورد جديد'}
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSupplierSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">اسم المورد</label>
                <input 
                  type="text" 
                  required
                  value={supplierFormData.name}
                  onChange={e => setSupplierFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="شركة النور..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input 
                  type="text" 
                  value={supplierFormData.phone}
                  onChange={e => setSupplierFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="0123456789"
                />
              </div>
              {!editingSupplier && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">الرصيد الافتتاحي (علينا)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={supplierFormData.openingBalance}
                    onChange={e => setSupplierFormData(prev => ({ ...prev, openingBalance: e.target.value }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500 mt-1">المبلغ المستحق للمورد قبل بدء استخدام النظام</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ البيانات'}</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-lg font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm">
             <h3 className="text-xl font-bold text-center mb-4">كلمة مرور المشرف</h3>
             <input type="password" autoFocus value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} className="w-full p-3 border-2 rounded-lg text-center mb-4" />
             <div className="flex gap-2">
                <button onClick={() => { if(adminPasswordInput === appSettings.adminPassword) { setIsAdminLoggedIn(true); setShowAdminLogin(false); setActiveTab('settings'); setAdminPasswordInput(''); } else { alert('كلمة مرور خاطئة'); } }} className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-bold">دخول</button>
                <button onClick={() => { setShowAdminLogin(false); setAdminPasswordInput(''); }} className="flex-1 bg-slate-100 py-2 rounded-lg">إلغاء</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
