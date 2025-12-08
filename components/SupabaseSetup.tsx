
import React, { useState, useEffect } from 'react';
import { Database, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { initSupabase, getSavedCredentials } from '../services/supabaseService';

interface Props {
  onConnected: () => void;
}

const SupabaseSetup: React.FC<Props> = ({ onConnected }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const saved = getSavedCredentials();
    if (saved) {
      const success = initSupabase(saved);
      if (success) onConnected();
    }
  }, [onConnected]);

  const handleConnect = () => {
    if (!url || !key) return;
    const success = initSupabase({ url, key });
    if (success) {
      setStatus('success');
      setTimeout(() => onConnected(), 1000);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="bg-primary-600 p-6 text-white flex items-center gap-3">
          <Database className="w-8 h-8" />
          <h1 className="text-2xl font-bold">إعداد الاتصال بقاعدة البيانات</h1>
        </div>
        
        <div className="p-8">
          <p className="text-slate-600 mb-6 leading-relaxed">
            للبدء، يرجى إدخال بيانات مشروع Supabase الخاص بك. يتم تخزين هذه البيانات محلياً في متصفحك فقط.
          </p>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رابط المشروع (Project URL)</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none dir-ltr text-left"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">مفتاح الوصول (Anon Key)</label>
              <input 
                type="password" 
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none dir-ltr text-left"
              />
            </div>
          </div>

          <button 
            onClick={handleConnect}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>حفظ واتصال</span>
          </button>

          {status === 'success' && (
            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              تم الاتصال بنجاح! جاري التحميل...
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              فشل الاتصال. تأكد من صحة البيانات.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseSetup;
