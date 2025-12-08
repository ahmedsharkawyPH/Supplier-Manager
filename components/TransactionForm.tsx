
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

  // Authentication Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');

  // Update type if initialType changes
  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  // States for Standalone Return Extra Field
  const [originalInvoiceRef, setOriginalInvoiceRef] = useState('');

  // States for immediate payment in invoice
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  // States for immediate return in invoice
  const [isReturnExpanded, setIsReturnExpanded] = useState(false);
  const [returnAmount, setReturnAmount] = useState('');
  const [returnReceiptRef, setReturnReceiptRef] = useState('');
  const [returnOriginalRef, setReturnOriginalRef] = useState('');
  const [returnNote, setReturnNote] = useState('');

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !amount || !date) return;
    
    // Open Auth Modal
    setAuthCode('');
    setAuthError('');
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Verify Code
    const foundUser = users.find(u => u.code === authCode);
    
    if (!foundUser) {
      setAuthError('الكود غير صحيح. يرجى المحاولة مرة أخرى.');
      return;
    }

    // 2. Prepare Data
    const baseData = {
      supplier_id: parseInt(supplierId),
      type,
      amount: parseFloat(amount),
      date,
      reference_number: reference,
      notes,
      original_invoice_number: originalInvoiceRef,
      created_by: foundUser.name // Attach User Name
    };

    // Prepare payload
    const payload: any = { ...baseData };

    // If it's an invoice, check for extra sections
    if (type === 'invoice') {
      // Handle Payment
      if (paidAmount && parseFloat(paidAmount) > 0) {
        payload.hasPayment = true;
        payload.paymentAmount = parseFloat(paidAmount);
        payload.paymentReference = paymentRef;
      }
      
      // Handle Return
      if (isReturnExpanded && returnAmount && parseFloat(returnAmount) > 0) {
        payload.hasReturn = true;
        payload.returnAmount = parseFloat(returnAmount);
        payload.returnReceiptRef = returnReceiptRef;
        payload.returnOriginalRef = returnOriginalRef;
        payload.returnNote = returnNote;
      }
    }

    setShowAuthModal(false); // Close modal
    await onSubmit(payload);

    // Reset basics
    setAmount('');
    setReference('');
    setNotes('');
    setOriginalInvoiceRef('');
    
    // Reset Payment
    setPaidAmount('');
    setPaymentRef('');

    // Reset Return
    setIsReturnExpanded(false);
    setReturnAmount('');
    setReturnReceiptRef('');
    setReturnOriginalRef('');
    setReturnNote('');
  };

  // Helper to get theme colors based on transaction type
  const getTheme = () => {
    switch (type) {
      case 'invoice':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-400',
          text: 'text-blue-900',
          inputBorder: 'border-blue-300',
          focusRing: 'focus:ring-blue-500',
          label: 'بيانات الفاتورة',
          icon: <FileText className="w-5 h-5" />
        };
      case 'payment':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-400',
          text: 'text-emerald-900',
          inputBorder: 'border-emerald-300',
          focusRing: 'focus:ring-emerald-500',
          label: 'بيانات السداد',
          icon: <DollarSign className="w-5 h-5" />
        };
      case 'return':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-400',
          text: 'text-orange-900',
          inputBorder: 'border-orange-300',
          focusRing: 'focus:ring-orange-500',
          label: 'بيانات المرتجع',
          icon: <FileWarning className="w-5 h-5" />
        };
    }
  };

  const theme = getTheme();

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="border-b border-slate-100 p-4 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800">تسجيل عملية جديدة</h2>
        </div>
        
        <div className="p-6">
          {/* Type Selection Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setType('invoice')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${
                type === 'invoice' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              فاتورة مشتريات
            </button>
            <button
              type="button"
              onClick={() => setType('payment')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${
                type === 'payment' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              سداد نقدي/شيك
            </button>
            <button
               type="button"
              onClick={() => setType('return')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${
                type === 'return' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileWarning className="w-4 h-4" />
              مرتجع بضاعة
            </button>
          </div>

          <form onSubmit={handlePreSubmit} className="space-y-6">
            
            {/* Main Transaction Details Frame */}
            <div className={`${theme.bg} ${theme.border} border-2 rounded-lg p-4 relative pt-6`}>
              <div className={`absolute -top-3 right-4 ${theme.bg} ${theme.text} px-3 py-1 rounded border ${theme.border} text-xs font-bold flex items-center gap-2`}>
                {theme.icon}
                {theme.label}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold ${theme.text} mb-1`}>المورد</label>
                  <div className="relative">
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className={`w-full pl-3 pr-10 py-2.5 border ${theme.inputBorder} rounded-lg focus:ring-2 ${theme.focusRing} focus:outline-none appearance-none bg-white`}
                      required
                    >
                      <option value="">اختر المورد...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <User className={`absolute left-3 top-3 w-4 h-4 ${theme.text} opacity-50 pointer-events-none`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.text} mb-1`}>التاريخ</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`w-full pl-3 pr-10 py-2.5 border ${theme.inputBorder} rounded-lg focus:ring-2 ${theme.focusRing} focus:outline-none`}
                      required
                    />
                    <Calendar className={`absolute left-3 top-3 w-4 h-4 ${theme.text} opacity-50 pointer-events-none`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.text} mb-1`}>
                    {type === 'invoice' ? 'قيمة الفاتورة' : type === 'payment' ? 'المبلغ المسدد' : 'قيمة المرتجع'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={`w-full pl-3 pr-10 py-2.5 border ${theme.inputBorder} rounded-lg focus:ring-2 ${theme.focusRing} focus:outline-none`}
                      required
                    />
                    <DollarSign className={`absolute left-3 top-3 w-4 h-4 ${theme.text} opacity-50 pointer-events-none`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.text} mb-1`}>
                     {type === 'invoice' ? 'رقم الفاتورة الحالية' : type === 'return' ? 'رقم وصل المرتجع' : 'رقم الوصل / الشيك'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={type === 'invoice' ? "مثال: 1050" : type === 'return' ? "رقم إيصال الرد" : "رقم السند"}
                      className={`w-full pl-3 pr-10 py-2.5 border ${theme.inputBorder} rounded-lg focus:ring-2 ${theme.focusRing} focus:outline-none`}
                    />
                    <Hash className={`absolute left-3 top-3 w-4 h-4 ${theme.text} opacity-50 pointer-events-none`} />
                  </div>
                </div>

                {/* Extra Field for Standalone Return: Original Invoice Number */}
                {type === 'return' && (
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-bold ${theme.text} mb-1`}>
                       رقم الفاتورة الأصلية (الخاصة بالبضاعة المرتجعة)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={originalInvoiceRef}
                        onChange={(e) => setOriginalInvoiceRef(e.target.value)}
                        placeholder="أدخل رقم فاتورة الشراء الأصلية"
                        className={`w-full pl-3 pr-10 py-2.5 border ${theme.inputBorder} rounded-lg focus:ring-2 ${theme.focusRing} focus:outline-none`}
                      />
                      <ArrowRightLeft className={`absolute left-3 top-3 w-4 h-4 ${theme.text} opacity-50 pointer-events-none`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Invoice Specific Extra Sections */}
            {type === 'invoice' && (
              <div className="space-y-4">
                
                {/* Payment Section (Green) */}
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-4 relative pt-6 mt-4">
                  <div className="absolute -top-3 right-4 bg-emerald-100 text-emerald-800 border border-emerald-400 px-3 py-1 rounded text-xs font-bold flex items-center gap-2">
                     <Wallet className="w-4 h-4" />
                     تحصيل / سداد فوري
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-emerald-900 mb-1">
                        قيمة السداد (جزء من الفاتورة)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-3 pr-10 py-2.5 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                        <DollarSign className="absolute left-3 top-3 w-4 h-4 text-emerald-600 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-emerald-900 mb-1">
                        رقم وصل السداد
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          placeholder="رقم إيصال السداد"
                          className="w-full pl-3 pr-10 py-2.5 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                        <Hash className="absolute left-3 top-3 w-4 h-4 text-emerald-600 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Return Section (Orange) */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsReturnExpanded(!isReturnExpanded)}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${
                      isReturnExpanded ? 'bg-orange-50 text-orange-800' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {isReturnExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>خصم مرتجع بضاعة (من الحساب)</span>
                    </div>
                    {isReturnExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {isReturnExpanded && (
                     <div className="p-4 bg-orange-50 border-t border-orange-200 animate-in slide-in-from-top-2">
                       <div className="border-2 border-orange-400 rounded-lg p-4 relative pt-6 bg-white/50">
                          <div className="absolute -top-3 right-4 bg-orange-100 text-orange-800 border border-orange-400 px-3 py-1 rounded text-xs font-bold flex items-center gap-2">
                            <FileWarning className="w-4 h-4" />
                            بيانات المرتجع
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                               <label className="block text-sm font-bold text-orange-900 mb-1">قيمة المرتجع</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={returnAmount}
                                  onChange={(e) => setReturnAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-3 pr-10 py-2.5 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                                />
                                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-orange-600 pointer-events-none" />
                              </div>
                            </div>

                             <div>
                              <label className="block text-sm font-bold text-orange-900 mb-1">رقم وصل المرتجع</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={returnReceiptRef}
                                  onChange={(e) => setReturnReceiptRef(e.target.value)}
                                  placeholder="رقم سند الرد"
                                  className="w-full pl-3 pr-10 py-2.5 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                                />
                                <Hash className="absolute left-3 top-3 w-4 h-4 text-orange-600 pointer-events-none" />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-orange-900 mb-1">رقم الفاتورة الأصلية</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={returnOriginalRef}
                                  onChange={(e) => setReturnOriginalRef(e.target.value)}
                                  placeholder="الفاتورة التي تم الرد منها"
                                  className="w-full pl-3 pr-10 py-2.5 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                                />
                                <ArrowRightLeft className="absolute left-3 top-3 w-4 h-4 text-orange-600 pointer-events-none" />
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-bold text-orange-900 mb-1">سبب الإرجاع / ملاحظات</label>
                              <input
                                  type="text"
                                  value={returnNote}
                                  onChange={(e) => setReturnNote(e.target.value)}
                                  placeholder="تالف / غير مطابق / ..."
                                  className="w-full px-3 py-2.5 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                                />
                            </div>
                          </div>
                       </div>
                     </div>
                  )}
                </div>

              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات عامة</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none h-20 resize-none"
                placeholder="أي تفاصيل إضافية..."
              ></textarea>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                  type === 'invoice' ? 'bg-blue-600 hover:bg-blue-700' :
                  type === 'payment' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  'bg-orange-600 hover:bg-orange-700'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'جاري الحفظ...' : (
                  <>
                    <SaveIcon type={type} />
                    <span>حفظ {type === 'invoice' ? 'الفاتورة' : type === 'payment' ? 'عملية السداد' : 'المرتجع'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Auth Modal Overlay */}
        {showAuthModal && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in p-4">
             <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border-2 border-primary-500">
                <div className="text-center mb-6">
                  <div className="bg-primary-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">تأكيد هوية المستخدم</h3>
                  <p className="text-slate-500 text-sm mt-1">يرجى إدخال الكود الخاص بك لإتمام العملية</p>
                </div>

                <form onSubmit={handleAuthSubmit}>
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="password"
                        autoFocus
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        placeholder="أدخل الكود هنا"
                        className="w-full text-center text-2xl tracking-widest py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono"
                      />
                      <KeyRound className="absolute left-3 top-4 w-5 h-5 text-slate-400" />
                    </div>
                    {authError && <p className="text-red-500 text-sm font-bold text-center mt-2">{authError}</p>}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-bold hover:bg-primary-700 transition-colors"
                    >
                      تأكيد وحفظ
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(false)}
                      className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </div>
    </>
  );
};

const SaveIcon = ({ type }: { type: TransactionType }) => {
  if (type === 'invoice') return <FileText className="w-5 h-5" />;
  if (type === 'payment') return <DollarSign className="w-5 h-5" />;
  return <FileWarning className="w-5 h-5" />;
}

export default TransactionForm;
