
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Search, Edit2, Trash2, X, Check, Calendar, Hash, DollarSign, Info } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onUpdate: (id: number, payload: Partial<Transaction>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const TransactionManager: React.FC<Props> = ({ transactions, onUpdate, onDelete }) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Edit Form State
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editRef, setEditRef] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return transactions.filter(t => 
      (t.supplier?.name || '').toLowerCase().includes(query) ||
      (t.reference_number || '').toLowerCase().includes(query) ||
      (t.notes || '').toLowerCase().includes(query)
    ).slice(0, 50); // Show last 50 matches for performance
  }, [transactions, search]);

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditAmount(t.amount.toString());
    setEditDate(t.date);
    setEditRef(t.reference_number || '');
    setEditNotes(t.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount)) return;

    await onUpdate(editingId, {
      amount,
      date: editDate,
      reference_number: editRef,
      notes: editNotes
    });
    setEditingId(null);
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'invoice': return 'فاتورة';
      case 'payment': return 'سداد';
      case 'return': return 'مرتجع';
      default: return type;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
            <Edit2 className="w-6 h-6 text-slate-500" />
            إدارة وتعديل العمليات
          </h2>
          <p className="text-slate-500 text-sm mt-1">ابحث عن الفاتورة أو العملية لتعديل بياناتها في حالة الإدخال الخاطئ</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم المستند أو اسم المورد..."
            className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-700 font-bold">
            <tr>
              <th className="p-4 border-b">التاريخ</th>
              <th className="p-4 border-b">المورد</th>
              <th className="p-4 border-b">النوع</th>
              <th className="p-4 border-b">المبلغ</th>
              <th className="p-4 border-b">رقم المستند</th>
              <th className="p-4 border-b">ملاحظات</th>
              <th className="p-4 border-b text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-slate-500">لا توجد نتائج مطابقة لبحثك</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} className={`${editingId === t.id ? 'bg-primary-50' : 'hover:bg-slate-50'} transition-colors`}>
                {editingId === t.id ? (
                  /* Edit Row UI */
                  <>
                    <td className="p-2"><input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full p-2 border rounded border-primary-300" /></td>
                    <td className="p-2 font-bold text-slate-400">{t.supplier?.name}</td>
                    <td className="p-2 font-bold">{getTypeText(t.type)}</td>
                    <td className="p-2"><input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full p-2 border rounded border-primary-300" /></td>
                    <td className="p-2"><input type="text" value={editRef} onChange={e => setEditRef(e.target.value)} className="w-full p-2 border rounded border-primary-300" /></td>
                    <td className="p-2"><input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full p-2 border rounded border-primary-300" /></td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={handleSave} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm"><Check className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="p-2 bg-slate-400 text-white rounded hover:bg-slate-500 shadow-sm"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  /* Static Row UI */
                  <>
                    <td className="p-4 text-slate-600">{t.date}</td>
                    <td className="p-4 font-bold text-slate-800">{t.supplier?.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        t.type === 'invoice' ? 'bg-blue-100 text-blue-700' : 
                        t.type === 'payment' ? 'bg-green-100 text-green-700' : 
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {getTypeText(t.type)}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900">{t.amount.toLocaleString()}</td>
                    <td className="p-4 font-mono text-slate-600">{t.reference_number || '-'}</td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">{t.notes || '-'}</td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => startEdit(t)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="تعديل"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-slate-50 border-t flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4" />
        <span>يتم عرض آخر 50 عملية مطابقة للبحث فقط. العمليات المعدلة ستنعكس فوراً في كشوف الحسابات.</span>
      </div>
    </div>
  );
};

export default TransactionManager;
