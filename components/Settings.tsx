
import React, { useState, useEffect } from 'react';
import { Save, Building2, Image as ImageIcon, Lock, Settings as SettingsIcon, Users, AlertTriangle, Trash2, History } from 'lucide-react';
import { AppSettings, User, Transaction } from '../types';
import * as api from '../services/supabaseService';
import UserManagement from './UserManagement';
import TransactionManager from './TransactionManager';

interface Props {
  onSave: (settings: AppSettings) => void;
  // User Management Props
  users: User[];
  onAddUser: (name: string, code: string) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
  // Transaction Management Props
  transactions: Transaction[];
  onUpdateTransaction: (id: number, payload: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: number) => Promise<void>;
  // Data Management Props
  onResetData: () => Promise<void>;
}

const Settings: React.FC<Props> = ({ onSave, users, onAddUser, onDeleteUser, transactions, onUpdateTransaction, onDeleteTransaction, onResetData }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'operations'>('general');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // Load settings from DB on mount
  useEffect(() => {
    const load = async () => {
      try {
        const settings = await api.fetchAppSettings();
        setCompanyName(settings.companyName);
        setLogoUrl(settings.logoUrl);
        setAdminPassword(settings.adminPassword || '1234');
      } catch (e) {
        console.error("Failed to load settings in component", e);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const newSettings: AppSettings = { companyName, logoUrl, adminPassword };
    
    try {
      await api.saveAppSettings(newSettings);
      onSave(newSettings); // Update App state
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (error) {
      alert("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetClick = () => {
    if (window.confirm("تحذير خطير: هل أنت متأكد تماماً من حذف جميع بيانات الموردين والعمليات؟\n\nلا يمكن التراجع عن هذه العملية وسيتم تصفير النظام بالكامل (مع الاحتفاظ بالمستخدمين والإعدادات).")) {
      if (window.confirm("تأكيد نهائي: هل أنت متأكد؟")) {
         onResetData();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 mb-6 no-print">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
            activeTab === 'general' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
          إعدادات عامة
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
            activeTab === 'operations' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          إدارة العمليات (الفواتير)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
            activeTab === 'users' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Users className="w-5 h-5" />
          إدارة المستخدمين
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="max-w-2xl space-y-8 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-100 p-6 bg-slate-50">
              <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-slate-500" />
                إعدادات المؤسسة
              </h2>
              <p className="text-slate-500 text-sm mt-1">تخصيص اسم المؤسسة، الشعار، وأمان التطبيق</p>
            </div>

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم المؤسسة / الشركة</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="مثال: شركة النور للتجارة"
                      className="w-full pl-3 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      required
                    />
                    <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">رابط الشعار (Logo URL)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full pl-3 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none dir-ltr text-left"
                    />
                    <ImageIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">يفضل استخدام رابط صورة مباشر (PNG/JPG).</p>
                </div>

                {logoUrl && (
                  <div className="mt-4 p-4 border rounded-lg bg-slate-50 text-center">
                    <img src={logoUrl} alt="Logo Preview" className="h-24 mx-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}

                <hr className="border-slate-100 my-6" />

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">كلمة مرور المشرف (للإعدادات والمستخدمين)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="1234"
                      className="w-full pl-3 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none dir-ltr text-left font-mono tracking-widest"
                    />
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    <span>{isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات في قاعدة البيانات'}</span>
                  </button>
                </div>

                {savedMessage && (
                  <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center font-bold animate-in fade-in">تم حفظ الإعدادات بنجاح!</div>
                )}
              </form>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <div className="border-b border-red-100 p-6 bg-red-100/50">
              <h2 className="font-bold text-xl text-red-800 flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-red-600" /> منطقة الخطر</h2>
            </div>
            <div className="p-8">
              <button 
                onClick={handleResetClick}
                className="w-full bg-white border-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-5 h-5" />
                <span>حذف جميع بيانات الموردين والعمليات (تصفير النظام)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'operations' && (
        <div className="animate-in fade-in">
          <TransactionManager 
            transactions={transactions}
            onUpdate={onUpdateTransaction}
            onDelete={onDeleteTransaction}
          />
        </div>
      )}

      {activeTab === 'users' && (
        <div className="animate-in fade-in">
          <UserManagement 
            users={users}
            onAddUser={onAddUser}
            onDeleteUser={onDeleteUser}
          />
        </div>
      )}
    </div>
  );
};

export default Settings;
