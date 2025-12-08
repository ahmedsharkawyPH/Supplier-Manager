
import React, { useState, useMemo } from 'react';
import { Supplier, Transaction, SupplierSummary, AppSettings, TransactionType, User } from './types';
import * as api from './services/supabaseService';
import SupabaseSetup from './components/SupabaseSetup';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import SupplierList from './components/SupplierList';
import SupplierStatement from './components/SupplierStatement';
import Settings from './components/Settings';
import { LayoutDashboard, Users, PlusCircle, LogOut, PackagePlus, Settings as SettingsIcon, Lock, KeyRound, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'transaction' | 'users' | 'settings'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // App Settings for Branding
  const [appSettings, setAppSettings] = useState<AppSettings>({
    companyName: 'نظام إدارة الموردين',
    logoUrl: '',
    adminPassword: '1234'
  });

  // Navigation State for Supplier Statement
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Navigation state for Dashboard -> Transaction Type
  const [initialTransactionType, setInitialTransactionType] = useState<TransactionType>('invoice');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]); // Staff Users
  const [loading, setLoading] = useState(false);
  
  // New Supplier Form State
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Admin Auth State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');

  // Initial Fetch logic
  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel fetch including Settings
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
      const updatedSuppliers = await api.fetchSuppliers();
      setSuppliers(updatedSuppliers);
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
      // 1. Create the main transaction (Invoice/Return/Payment)
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

      // 2. Check if there is an associated payment (Invoice with payment)
      if (data.hasPayment && data.paymentAmount > 0) {
        const paymentTransData = {
          supplier_id: data.supplier_id,
          type: 'payment', // Force type to payment
          amount: data.paymentAmount,
          date: data.date, // Same date as invoice
          reference_number: data.paymentReference,
          notes: `سداد جزء من الفاتورة رقم: ${data.reference_number || '-'}`,
          created_by: data.created_by
        };
        // @ts-ignore
        await api.createTransaction(paymentTransData);
      }

      // 3. Check if there is an associated return (Invoice with return deduction)
      if (data.hasReturn && data.returnAmount > 0) {
        let returnNotes = `خصم مرتجع أثناء فاتورة رقم: ${data.reference_number || '-'}`;
        if (data.returnOriginalRef) {
          returnNotes += ` - فاتورة أصلية: ${data.returnOriginalRef}`;
        }
        if (data.returnNote) {
          returnNotes += ` - ملاحظات: ${data.returnNote}`;
        }

        const returnTransData = {
          supplier_id: data.supplier_id,
          type: 'return', // Force type to return
          amount: data.returnAmount,
          date: data.date, // Same date as invoice
          reference_number: data.returnReceiptRef, // Use the specific return receipt number
          notes: returnNotes,
          created_by: data.created_by
        };
        // @ts-ignore
        await api.createTransaction(returnTransData);
      }

      // Refresh transactions
      const updatedTrans = await api.fetchTransactions();
      setTransactions(updatedTrans);
      
      setActiveTab('suppliers'); // Go to list to see update
      setSelectedSupplier(null); // Reset view to list
    } catch (error) {
      console.error(error);
      alert("فشل تسجيل العملية");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if(!window.confirm("هل أنت متأكد من حذف هذه العملية؟ سيتم تحديث الرصيد تلقائياً.")) return;
    setLoading(true);
    try {
      await api.deleteTransaction(id);
      const updatedTrans = await api.fetchTransactions();
      setTransactions(updatedTrans);
    } catch (error) {
      alert("فشل حذف العملية");
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    setLoading(true);
    try {
      await api.deleteAllData();
      setSuppliers([]);
      setTransactions([]);
      setSelectedSupplier(null);
      alert("تم حذف جميع بيانات الموردين والعمليات بنجاح.");
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حذف البيانات.");
    } finally {
      setLoading(false);
    }
  };

  // User Management Handlers
  const handleAddUser = async (name: string, code: string) => {
    try {
      await api.createUser(name, code);
      const updatedUsers = await api.fetchUsers();
      setUsers(updatedUsers);
    } catch (error) {
      alert("فشل إضافة المستخدم");
      throw error;
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    try {
      await api.deleteUser(id);
      const updatedUsers = await api.fetchUsers();
      setUsers(updatedUsers);
    } catch (error) {
      alert("فشل حذف المستخدم");
    }
  };

  const handleLogout = () => {
    api.clearCredentials();
    // Force reload to reset app state completely since we rely on env vars
    window.location.reload();
  };

  // Calculate summaries locally
  const summaries = useMemo<SupplierSummary[]>(() => {
    return suppliers.map(supplier => {
      const supplierTrans = transactions.filter(t => t.supplier_id === supplier.id);
      const totalInvoices = supplierTrans
        .filter(t => t.type === 'invoice')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalPayments = supplierTrans
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalReturns = supplierTrans
        .filter(t => t.type === 'return')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        supplier,
        totalInvoices,
        totalPayments,
        totalReturns,
        balance: totalInvoices - (totalPayments + totalReturns)
      };
    });
  }, [suppliers, transactions]);

  // Navigate from Dashboard to Transaction Form
  const handleDashboardNavigate = (type: TransactionType) => {
    setInitialTransactionType(type);
    setActiveTab('transaction');
    setIsMobileMenuOpen(false);
  };

  if (!isSupabaseConfigured) {
    return <SupabaseSetup onConnected={() => { setIsSupabaseConfigured(true); fetchData(); }} />;
  }

  // Handle tab switching
  const handleTabChange = (tab: typeof activeTab) => {
    setIsMobileMenuOpen(false); // Close mobile menu on navigate
    
    if (tab === 'settings' && !isAdminLoggedIn) {
      setShowAdminLogin(true);
      setAdminAuthError('');
      setAdminPasswordInput('');
      return;
    }
    
    setActiveTab(tab);
    if (tab !== 'suppliers') {
      setSelectedSupplier(null);
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = appSettings.adminPassword || '1234';
    if (adminPasswordInput === correctPassword) {
      setIsAdminLoggedIn(true);
      setShowAdminLogin(false);
      setActiveTab('settings');
    } else {
      setAdminAuthError('كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-slate-900 text-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-700">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 {appSettings.logoUrl ? (
                    <img src={appSettings.logoUrl} alt="Logo" className="h-8 w-auto rounded bg-white p-0.5" />
                 ) : (
                    <PackagePlus className="w-6 h-6 text-primary-500" />
                 )}
                 <span className="font-bold text-lg">القائمة</span>
               </div>
               <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            {/* Nav Links */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <button 
                  onClick={() => handleTabChange('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'dashboard' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>الرئيسية</span>
                </button>
                
                <button 
                  onClick={() => handleTabChange('suppliers')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'suppliers' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  <Users className="w-5 h-5" />
                  <span>حسابات الموردين</span>
                </button>

                <button 
                  onClick={() => handleTabChange('transaction')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'transaction' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>تسجيل عملية</span>
                </button>

                <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
                   <button 
                    onClick={() => handleTabChange('settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'settings' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  >
                    <SettingsIcon className="w-5 h-5" />
                    <span>الإعدادات</span>
                  </button>
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
               <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>إعادة تحميل النظام</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full right-0 top-0 no-print z-50">
        <div className="p-6 border-b border-slate-800">
          <div className="flex flex-col items-center text-center gap-3">
            {appSettings.logoUrl ? (
              <img src={appSettings.logoUrl} alt="Logo" className="h-16 w-auto object-contain rounded-lg bg-white p-1" />
            ) : (
              <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
                <PackagePlus className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-lg font-bold">{appSettings.companyName || 'نظام الموردين'}</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => handleTabChange('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'dashboard' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>الرئيسية</span>
          </button>
          
          <button 
            onClick={() => handleTabChange('suppliers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'suppliers' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users className="w-5 h-5" />
            <span>حسابات الموردين</span>
          </button>

          <button 
            onClick={() => handleTabChange('transaction')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'transaction' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>تسجيل عملية</span>
          </button>

          <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
             <button 
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${activeTab === 'settings' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span>الإعدادات</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>إعادة تحميل النظام</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:mr-64 p-4 md:p-8">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6 no-print">
           <div className="flex items-center gap-3">
              {/* Menu Trigger */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Logo & Name */}
              <div className="flex items-center gap-2">
                {appSettings.logoUrl && <img src={appSettings.logoUrl} className="h-8 w-auto" alt="Logo" />}
                <h1 className="text-xl font-bold text-slate-800 line-clamp-1">{appSettings.companyName || 'نظام الموردين'}</h1>
              </div>
           </div>

          <div className="flex gap-2">
             <button onClick={() => handleTabChange('transaction')} className="p-2 bg-primary-100 text-primary-600 rounded-full shadow-sm">
               <PlusCircle className="w-6 h-6" />
             </button>
             <button onClick={() => handleTabChange('suppliers')} className="p-2 bg-slate-100 text-slate-600 rounded-full shadow-sm">
               <Users className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="max-w-6xl mx-auto space-y-6">
          
          {loading && (
             <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center">
               <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
             </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-300">
               <Dashboard onNavigate={handleDashboardNavigate} />
            </div>
          )}

          {activeTab === 'transaction' && (
            <div className="animate-in fade-in duration-300">
               <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">تسجيل عملية جديدة</h2>
              </div>
              <TransactionForm 
                suppliers={suppliers} 
                users={users}
                onSubmit={handleTransactionSubmit} 
                isLoading={loading} 
                initialType={initialTransactionType}
              />
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              {!selectedSupplier ? (
                <>
                  {/* Supplier List View */}
                  <div className="flex justify-between items-center flex-wrap gap-4 no-print">
                    <h2 className="text-2xl font-bold text-slate-800">الموردين والأرصدة</h2>
                    <button 
                      onClick={() => setShowAddSupplier(!showAddSupplier)}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm font-bold"
                    >
                      {showAddSupplier ? 'إلغاء' : 'إضافة مورد جديد +'}
                    </button>
                  </div>

                  {showAddSupplier && (
                    <div className="bg-white p-6 rounded-xl border border-primary-100 shadow-sm animate-in slide-in-from-top-4">
                      <form onSubmit={handleAddSupplier} className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">اسم المورد</label>
                            <input
                              type="text"
                              required
                              value={newSupplierName}
                              onChange={(e) => setNewSupplierName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="شركة..."
                            />
                          </div>
                          <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف (اختياري)</label>
                            <input
                              type="text"
                              value={newSupplierPhone}
                              onChange={(e) => setNewSupplierPhone(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="01xxxxxxxxx"
                            />
                          </div>
                          <button type="submit" className="w-full md:w-auto bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 font-bold transition-colors">
                            حفظ المورد
                          </button>
                      </form>
                    </div>
                  )}

                  <SupplierList 
                    summaries={summaries} 
                    onDeleteTransaction={handleDeleteTransaction}
                    onSelectSupplier={setSelectedSupplier}
                  />
                </>
              ) : (
                /* Detailed Statement View */
                <SupplierStatement 
                  supplier={selectedSupplier}
                  transactions={transactions.filter(t => t.supplier_id === selectedSupplier.id)}
                  onBack={() => setSelectedSupplier(null)}
                  settings={appSettings}
                />
              )}
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="animate-in fade-in duration-300">
               <Settings 
                 onSave={(newSettings) => setAppSettings(newSettings)}
                 users={users}
                 onAddUser={handleAddUser}
                 onDeleteUser={handleDeleteUser}
                 onResetData={handleResetData}
               />
             </div>
          )}
        </div>

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border-2 border-primary-500">
              <div className="text-center mb-6">
                <div className="bg-primary-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">تسجيل دخول المشرف</h3>
                <p className="text-slate-500 text-sm mt-1">صفحة الإعدادات محمية. أدخل كلمة المرور للمتابعة.</p>
              </div>

              <form onSubmit={handleAdminLoginSubmit}>
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="password"
                      autoFocus
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="كلمة المرور"
                      className="w-full text-center text-xl py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                    <KeyRound className="absolute left-3 top-4 w-5 h-5 text-slate-400" />
                  </div>
                  {adminAuthError && <p className="text-red-500 text-sm font-bold text-center mt-2">{adminAuthError}</p>}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-bold hover:bg-primary-700 transition-colors"
                  >
                    دخول
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdminLogin(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
