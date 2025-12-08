
import React, { useEffect, useState } from 'react';
import { Database, AlertCircle, RefreshCw } from 'lucide-react';
import { initSupabase } from '../services/supabaseService';

interface Props {
  onConnected: () => void;
}

const SupabaseSetup: React.FC<Props> = ({ onConnected }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt auto-connection on mount
    const connect = () => {
      // Safely access env vars
      const url = import.meta.env?.VITE_SUPABASE_URL;
      const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setError('Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing.');
        return;
      }

      const success = initSupabase({ url, key });
      if (success) {
        onConnected();
      } else {
        setError('Failed to initialize Supabase client. Check credentials.');
      }
    };

    connect();
  }, [onConnected]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">فشل الاتصال</h2>
          <p className="text-slate-600 mb-6 text-sm">{error}</p>
          <div className="bg-slate-50 p-4 rounded-lg text-left text-xs font-mono text-slate-500 mb-6 dir-ltr">
            Make sure to add these to Vercel Project Settings:<br/>
            VITE_SUPABASE_URL<br/>
            VITE_SUPABASE_ANON_KEY
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <Database className="w-12 h-12 text-primary-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">جاري الاتصال بقاعدة البيانات...</h2>
        <p className="text-slate-400 text-sm mt-2">يرجى الانتظار لحظات</p>
      </div>
    </div>
  );
};

export default SupabaseSetup;
