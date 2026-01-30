
import React, { useState, useEffect } from 'react';
// Added missing Database icon to the import list
import { Download, Upload, FileJson, FileCode, CheckCircle, AlertTriangle, RefreshCw, Clock, Database } from 'lucide-react';
import * as api from '../services/supabaseService';

const BackupManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const savedDate = localStorage.getItem('app_last_backup_date');
    if (savedDate) setLastBackup(savedDate);
  }, []);

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    
    const now = new Date().toISOString();
    localStorage.setItem('app_last_backup_date', now);
    setLastBackup(now);
  };

  const handleExportJSON = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBackupData();
      const jsonString = JSON.stringify(data, null, 2);
      const date = new Date().toISOString().split('T')[0];
      downloadFile(jsonString, `SupplierManager_Backup_${date}.json`, 'application/json');
      setStatus({ type: 'success', message: 'تم إنشاء وتحميل ملف النسخة الاحتياطية بنجاح' });
    } catch (error) {
      setStatus({ type: 'error', message: 'فشل تصدير النسخة الاحتياطية' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSQL = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBackupData();
      let sql = `-- Supplier Manager Pro SQL Backup\ -- Generated: ${new Date().toLocaleString()}\n\n`;
      
      // Suppliers
      sql += `-- Suppliers\n`;
      data.suppliers.forEach((s: any) => {
        sql += `INSERT INTO suppliers (id, name, phone, created_at) VALUES (${s.id}, '${s.name.replace(/'/g, "''")}', ${s.phone ? `'${s.phone}'` : 'NULL'}, '${s.created_at}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone;\n`;
      });

      // Users
      sql += `\n-- Users\n`;
      data.users.forEach((u: any) => {
        sql += `INSERT INTO users (id, name, code, created_at) VALUES (${u.id}, '${u.name.replace(/'/g, "''")}', '${u.code}', '${u.created_at}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;\n`;
      });

      // Transactions
      sql += `\n-- Transactions\n`;
      data.transactions.forEach((t: any) => {
        sql += `INSERT INTO transactions (id, supplier_id, type, amount, date, reference_number, notes, created_by, created_at) VALUES (${t.id}, ${t.supplier_id}, '${t.type}', ${t.amount}, '${t.date}', ${t.reference_number ? `'${t.reference_number.replace(/'/g, "''")}'` : 'NULL'}, ${t.notes ? `'${t.notes.replace(/'/g, "''")}'` : 'NULL'}, ${t.created_by ? `'${t.created_by.replace(/'/g, "''")}'` : 'NULL'}, '${t.created_at}') ON CONFLICT (id) DO NOTHING;\n`;
      });

      const date = new Date().toISOString().split('T')[0];
      downloadFile(sql, `SupplierManager_Restore_${date}.sql`, 'text/plain');
      setStatus({ type: 'success', message: 'تم توليد ملف SQL بنجاح' });
    } catch (error) {
      setStatus({ type: 'error', message: 'فشل توليد ملف SQL' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("تحذير: استعادة البيانات سيقوم بحذف كافة البيانات الحالية وتعويضها ببيانات الملف. هل تريد المتابعة؟")) {
      e.target.value = '';
      return;
    }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          await api.restoreFromBackup(json);
          setStatus({ type: 'success', message: 'تم استعادة البيانات بنجاح! يرجى إعادة تحميل الصفحة.' });
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          setStatus({ type: 'error', message: 'الملف غير صالح أو حدث خطأ أثناء الاستعادة' });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      setStatus({ type: 'error', message: 'فشل قراءة الملف' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      
      {/* Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="bg-primary-50 w-20 h-20 rounded-2xl flex items-center justify-center shrink-0">
          <Database className="w-10 h-10 text-primary-600" />
        </div>
        <div className="flex-1 text-center md:text-right">
          <h2 className="text-xl font-bold text-slate-800">مركز النسخ الاحتياطي</h2>
          <p className="text-slate-500 text-sm mt-1">قم بحماية بياناتك عن طريق أخذ نسخ احتياطية دورية وحفظها خارج النظام.</p>
          {lastBackup && (
            <div className="flex items-center justify-center md:justify-start gap-2 mt-3 text-xs text-slate-400 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>آخر نسخة تم تحميلها: {new Date(lastBackup).toLocaleString('ar-EG')}</span>
            </div>
          )}
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in duration-300 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-bold">{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b font-bold text-slate-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            تصدير البيانات
          </div>
          <div className="p-6 space-y-4">
            <button 
              onClick={handleExportJSON}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-primary-50 hover:border-primary-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileJson className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">تحميل نسخة JSON</p>
                  <p className="text-xs text-slate-500">شاملة لكل الجداول (موصى بها)</p>
                </div>
              </div>
              <Download className="w-5 h-5 text-slate-400" />
            </button>

            <button 
              onClick={handleExportSQL}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">تحميل ملف SQL</p>
                  <p className="text-xs text-slate-500">أوامر لاستعادة القاعدة برمجياً</p>
                </div>
              </div>
              <Download className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 bg-red-50 border-b font-bold text-red-700 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            استعادة البيانات
          </div>
          <div className="p-6">
            <div className="border-2 border-dashed border-red-200 rounded-xl p-8 text-center bg-red-50/30">
              <label className="cursor-pointer block">
                <div className="bg-white w-12 h-12 rounded-full shadow-md flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {isLoading ? <RefreshCw className="w-6 h-6 text-red-500 animate-spin" /> : <Upload className="w-6 h-6 text-red-500" />}
                </div>
                <p className="font-bold text-slate-800">اختر ملف JSON للنسخة الاحتياطية</p>
                <p className="text-xs text-red-600 mt-2 font-bold flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  تحذير: سيتم مسح البيانات الحالية
                </p>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportJSON}
                  disabled={isLoading}
                />
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* Cloud Backup Info */}
      <div className="bg-slate-800 text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
           <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
             <RefreshCw className="w-8 h-8 text-primary-400" />
           </div>
           <div>
             <h3 className="text-lg font-bold">نصيحة للمزامنة التلقائية</h3>
             <p className="text-slate-300 text-sm mt-1">
               بما أنك تستخدم Supabase، يتم حفظ بياناتك سحابياً بشكل لحظي. 
               لتفعيل النسخ التلقائي اليومي على مستوى الخادم، يمكنك ترقية خطة Supabase أو استخدام 
               <code className="bg-black/30 px-2 py-0.5 rounded mx-1 text-primary-400">pg_cron</code> لإعداد مهام مجدولة.
             </p>
           </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-500/10 rounded-full"></div>
      </div>
    </div>
  );
};

export default BackupManager;
