
import React, { useState } from 'react';
import { User } from '../types';
import { Users, Trash2, KeyRound, UserPlus, Eye, EyeOff } from 'lucide-react';

interface Props {
  users: User[];
  onAddUser: (name: string, code: string) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
}

const UserManagement: React.FC<Props> = ({ users, onAddUser, onDeleteUser }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCodes, setVisibleCodes] = useState<Record<number, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    
    setIsLoading(true);
    try {
      await onAddUser(name, code);
      setName('');
      setCode('');
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVisibility = (id: number) => {
    setVisibleCodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 p-6 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-500" />
            إدارة المستخدمين
          </h2>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-1">اسم المستخدم</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  placeholder="محمد أحمد..."
                />
                <UserPlus className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-1">الكود الخاص (رقم سري)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none dir-ltr text-left font-mono"
                  placeholder="1234"
                />
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full md:w-auto bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 font-bold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'جاري الحفظ...' : 'إضافة مستخدم'}
            </button>
          </form>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 text-slate-700 font-bold text-sm">
                <tr>
                  <th className="p-4 text-right">الاسم</th>
                  <th className="p-4 text-right">الكود</th>
                  <th className="p-4 text-center w-20">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">لا يوجد مستخدمين مسجلين</td>
                  </tr>
                )}
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">{user.name}</td>
                    <td className="p-4 font-mono text-slate-600 flex items-center gap-3">
                      <span className="min-w-[40px]">
                        {visibleCodes[user.id] ? user.code : '••••'}
                      </span>
                      <button 
                        onClick={() => toggleVisibility(user.id)}
                        className="text-slate-400 hover:text-primary-600 transition-colors"
                        title={visibleCodes[user.id] ? "إخفاء" : "إظهار"}
                      >
                        {visibleCodes[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => onDeleteUser(user.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                        title="حذف المستخدم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;