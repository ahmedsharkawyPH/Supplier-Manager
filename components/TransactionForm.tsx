
import React, { useState, useEffect } from 'react';
import { Supplier, TransactionType, User as UserType } from '../types';
import { Calendar, FileText, DollarSign, User, FileWarning, Wallet, Hash, ChevronDown, ChevronUp, Plus, Minus, ArrowRightLeft, Lock, KeyRound } from 'lucide-react';

interface Props {
  suppliers: Supplier[];
  users: UserType[];
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
  initialType?: TransactionType;
}

const TransactionForm: React.FC<Props> = ({ suppliers, users, onSubmit, isLoading, initialType = 'invoice' }) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [supplierId, setSupplierId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  const [originalInvoiceRef, setOriginalInvoiceRef] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [isReturnExpanded, setIsReturnExpanded] = useState(false);
  const [returnAmount, setReturnAmount] = useState('');
  const [returnReceiptRef, setReturnReceiptRef] = useState('');
  const [returnOriginalRef, setReturnOriginalRef] = useState('');
  const [returnNote, setReturnNote] = useState('');

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !amount || !date) return;
    setAuthCode('');
    setAuthError('');
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.code === authCode);
    if (!foundUser) {
      setAuthError('الكود غير صحيح. يرجى المحاولة مرة أخرى.');
      return;
    }

    const payload: any = {
      supplier_id: supplierId, // Fix: Removed parseInt here as ID is string
      type,
      amount: parseFloat(amount),
      date,
      reference_number: reference,
      notes,
      original_invoice_number: originalInvoiceRef,
      created_by: foundUser.name
    };

    if (type === 'invoice') {
      if (paidAmount && parseFloat(paidAmount) > 0) {
        payload.hasPayment = true;
        payload.paymentAmount = parseFloat(paidAmount);
        payload.paymentReference = paymentRef;
      }
      if (isReturnExpanded && returnAmount && parseFloat(returnAmount) > 0) {
        payload.hasReturn = true;
        payload.returnAmount = parseFloat(returnAmount);
        payload.returnReceiptRef = returnReceiptRef;
        payload.returnOriginalRef = returnOriginalRef;
        payload.returnNote = returnNote;
      }
    }

    setShowAuthModal(false);
    await onSubmit(payload);
    setAmount('');
    setReference('');
    setNotes('');
    setOriginalInvoiceRef('');
    setPaidAmount('');
    setPaymentRef('');
    setIsReturnExpanded(false);
    setReturnAmount('');
    setReturnReceiptRef('');
    setReturnOriginalRef('');
    setReturnNote('');
  };

  const getTheme = () => {
    switch (type) {
      case 'invoice': return { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-900', inputBorder: 'border-blue-300', focusRing: 'focus:ring-blue-500', label: 'بيانات الفاتورة', icon: <FileText className="w-5 h-5" /> };
      case 'payment': return { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-900', inputBorder: 'border-emerald-300', focusRing: 'focus:ring-emerald-500', label: 'بيانات السداد', icon: <DollarSign className="w-5 h-5" /> };
      case 'return': return { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-900', inputBorder: 'border-orange-300', focusRing: 'focus:ring-orange-500', label: 'بيانات المرتجع', icon: <FileWarning className="w-5 h-5" /> };
    }
  };

  const theme = getTheme();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
      <div className="p-6">
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
          {(['invoice', 'payment', 'return'] as TransactionType[]).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${type === t ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}>
              {t === 'invoice' ? <FileText className="w-4 h-4" /> : t === 'payment' ? <DollarSign className="w-4 h-4" /> : <FileWarning className="w-4 h-4" />}
              {t === 'invoice' ? 'فاتورة' : t === 'payment' ? 'سداد' : 'مرتجع'}
            </button>
          ))}
        </div>

        <form onSubmit={handlePreSubmit} className="space-y-6">
          <div className={`${theme.bg} ${theme.border} border-2 rounded-lg p-4 relative pt-6`}>
            <div className={`absolute -top-3 right-4 ${theme.bg} ${theme.text} px-3 py-1 rounded border ${theme.border} text-xs font-bold flex items-center gap-2`}>
              {theme.icon} {theme.label}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-bold ${theme.text} mb-1`}>المورد</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg bg-white" required>
                  <option value="">اختر المورد...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${theme.text} mb-1`}>التاريخ</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg" required />
              </div>
              <div>
                <label className={`block text-sm font-bold ${theme.text} mb-1`}>{type === 'invoice' ? 'قيمة الفاتورة' : 'المبلغ'}</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2.5 border rounded-lg" required />
              </div>
              <div>
                <label className={`block text-sm font-bold ${theme.text} mb-1`}>رقم المستند</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg" />
              </div>
            </div>
          </div>

          {type === 'invoice' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-4 pt-6 relative">
                <div className="absolute -top-3 right-4 bg-emerald-100 text-emerald-800 border border-emerald-400 px-3 py-1 rounded text-xs font-bold">تحصيل فوري</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="المبلغ المسدد" className="w-full px-3 py-2.5 border rounded-lg bg-white" />
                  <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="رقم إيصال السداد" className="w-full px-3 py-2.5 border rounded-lg bg-white" />
                </div>
              </div>
            </div>
          )}

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 border rounded-lg h-20" placeholder="ملاحظات..."></textarea>
          
          <button type="submit" disabled={isLoading} className={`w-full py-3 rounded-lg font-bold text-white ${type === 'invoice' ? 'bg-blue-600' : type === 'payment' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
            {isLoading ? 'جاري الحفظ...' : 'تأكيد وحفظ العملية'}
          </button>
        </form>
      </div>

      {showAuthModal && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm border-2 border-primary-500">
            <h3 className="text-xl font-bold text-center mb-4">تأكيد الهوية</h3>
            <form onSubmit={handleAuthSubmit}>
              <input type="password" autoFocus value={authCode} onChange={(e) => setAuthCode(e.target.value)} className="w-full text-center text-2xl py-3 border-2 rounded-lg mb-4" placeholder="أدخل كود المستخدم" />
              {authError && <p className="text-red-500 text-sm text-center mb-4">{authError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-bold">تأكيد</button>
                <button type="button" onClick={() => setShowAuthModal(false)} className="flex-1 bg-slate-100 py-2 rounded-lg">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionForm;
