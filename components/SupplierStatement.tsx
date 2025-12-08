
import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, Transaction, AppSettings } from '../types';
import { Printer, FileSpreadsheet, ArrowRight, Filter, Calendar, FileDown, Search, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  supplier: Supplier;
  transactions: Transaction[];
  onBack: () => void;
  settings: AppSettings;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const [y, m, d] = parts;
  // Ensure strict dd/mm/yyyy padding
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};

const SupplierStatement: React.FC<Props> = ({ supplier, transactions, onBack, settings }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Default to last 2 weeks
  const today = new Date().toISOString().split('T')[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(twoWeeksAgo);
  const [endDate, setEndDate] = useState(today);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState({
    invoice: true,
    payment: true,
    return: true
  });

  // Update document title for Print Filename fallback
  useEffect(() => {
    const originalTitle = document.title;
    if (supplier) {
      const dateStr = formatDate(endDate).replace(/\//g, '-');
      document.title = `كشف_حساب_${supplier.name.replace(/\s+/g, '_')}_${dateStr}`;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [supplier, endDate]);

  // Process Data
  const { openingBalance, periodTransactions, runningBalance, totals } = useMemo(() => {
    // 1. Sort all transactions ascending by date
    const sortedAll = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Split into before period and within period
    // Normalize dates for comparison (ignore time)
    const start = startDate;
    const end = endDate;

    let opBalance = 0;
    let currentPeriod: Transaction[] = [];
    
    // First Pass: Calculate Opening Balance (Strictly based on Date)
    // And gather potential period transactions
    sortedAll.forEach(t => {
      const tDateStr = t.date; 
      if (tDateStr < start) {
        if (t.type === 'invoice') opBalance += t.amount;
        else opBalance -= t.amount; // Payment or Return
      } else if (tDateStr >= start && tDateStr <= end) {
        currentPeriod.push(t);
      }
    });

    // Second Pass: Filter Period Transactions based on Search & Type
    const filteredPeriod = currentPeriod.filter(t => {
      // Type Filter
      if (t.type === 'invoice' && !selectedTypes.invoice) return false;
      if (t.type === 'payment' && !selectedTypes.payment) return false;
      if (t.type === 'return' && !selectedTypes.return) return false;

      // Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const ref = (t.reference_number || '').toLowerCase();
        // Also search in notes? Optional, but helpful
        // const notes = (t.notes || '').toLowerCase();
        return ref.includes(query); 
      }
      return true;
    });

    // Third Pass: Calculate Totals for the *Filtered* view
    const periodTotals = { debit: 0, credit: 0 };
    filteredPeriod.forEach(t => {
       if (t.type === 'invoice') periodTotals.debit += t.amount;
       else periodTotals.credit += t.amount;
    });

    return {
      openingBalance: opBalance,
      periodTransactions: filteredPeriod,
      // Running balance for display starts with Opening and adds filtered transactions
      runningBalance: opBalance + (periodTotals.debit - periodTotals.credit),
      totals: periodTotals
    };
  }, [transactions, startDate, endDate, searchQuery, selectedTypes]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const element = document.getElementById('printable-content');
    
    // Format filename
    const dateStr = formatDate(endDate).replace(/\//g, '-');
    const safeName = supplier.name.replace(/\s+/g, '_');
    const filename = `كشف_حساب_${safeName}_${dateStr}.pdf`;

    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number], // top, left, bottom, right in inches
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    try {
      // Dynamic import to avoid initialization errors
      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;
      
      await html2pdf().set(opt).from(element).save();
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء تحميل الملف (يرجى المحاولة مرة أخرى)');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportExcel = () => {
    const data = [];
    
    // Header Info
    data.push({
      'التاريخ': `كشف حساب: ${supplier.name}`, 
      'نوع العملية': '', 
      'رقم المستند': '', 
      'ملاحظات': '', 
      'المستخدم': '',
      'مدين (علينا)': '', 
      'دائن (لنا)': '', 
      'الرصيد': ''
    });
    data.push({
      'التاريخ': `من: ${formatDate(startDate)} إلى: ${formatDate(endDate)}`, 
      'نوع العملية': '', 
      'رقم المستند': '', 
      'ملاحظات': '', 
      'المستخدم': '',
      'مدين (علينا)': '', 
      'دائن (لنا)': '', 
      'الرصيد': ''
    });
    data.push({}); // Empty row

    // Opening Balance
    data.push({
      'التاريخ': formatDate(startDate),
      'نوع العملية': 'رصيد افتتاحي ما قبل الفترة',
      'رقم المستند': '-',
      'ملاحظات': '-',
      'المستخدم': '-',
      'مدين (علينا)': openingBalance > 0 ? openingBalance : 0,
      'دائن (لنا)': openingBalance < 0 ? Math.abs(openingBalance) : 0,
      'الرصيد': openingBalance
    });

    let currentBalance = openingBalance;

    periodTransactions.forEach(t => {
      const isDebit = t.type === 'invoice';
      if (isDebit) currentBalance += t.amount;
      else currentBalance -= t.amount;

      let typeAr = t.type === 'invoice' ? 'فاتورة مشتريات' : t.type === 'payment' ? 'سداد نقدي' : 'مرتجع بضاعة';
      
      data.push({
        'التاريخ': formatDate(t.date),
        'نوع العملية': typeAr,
        'رقم المستند': t.reference_number || '',
        'ملاحظات': t.notes || '',
        'المستخدم': t.created_by || '',
        'مدين (علينا)': isDebit ? t.amount : 0,
        'دائن (لنا)': !isDebit ? t.amount : 0,
        'الرصيد': currentBalance
      });
    });

    // Totals
    data.push({});
    data.push({
      'التاريخ': 'الإجمالي',
      'نوع العملية': '',
      'رقم المستند': '',
      'ملاحظات': '',
      'المستخدم': '',
      'مدين (علينا)': totals.debit,
      'دائن (لنا)': totals.credit,
      'الرصيد': currentBalance
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Adjust column widths (8 columns)
    ws['!cols'] = [
      { wch: 15 }, // التاريخ
      { wch: 20 }, // نوع العملية
      { wch: 15 }, // رقم المستند
      { wch: 40 }, // ملاحظات
      { wch: 15 }, // المستخدم
      { wch: 15 }, // مدين
      { wch: 15 }, // دائن
      { wch: 15 }  // الرصيد
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "كشف حساب");
    const filenameDate = formatDate(endDate).replace(/\//g, '-');
    XLSX.writeFile(wb, `Statement_${supplier.name}_${filenameDate}.xlsx`);
  };

  // Helper to calculate running balance for display
  let runningBal = openingBalance;

  const toggleType = (type: keyof typeof selectedTypes) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="bg-white min-h-screen pb-10">
      {/* Header - No Print */}
      <div className="no-print border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm">
        
        {/* Row 1: Title, Date Range, Actions */}
        <div className="flex flex-col xl:flex-row items-center justify-between p-3 gap-3">
           
           {/* Left: Back & Title */}
           <div className="flex items-center gap-3 w-full xl:w-auto">
             <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
               <ArrowRight className="w-6 h-6 text-slate-600" />
             </button>
             <h2 className="font-bold text-lg text-slate-800 line-clamp-1">
               كشف حساب: <span className="text-primary-600">{supplier.name}</span>
             </h2>
           </div>

           {/* Center: Date Picker */}
           <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm w-full xl:w-auto justify-center">
             <Calendar className="w-4 h-4 text-slate-500" />
             <div className="flex items-center gap-1">
               <span className="text-xs text-slate-500 font-bold">من</span>
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)}
                 className="text-sm border-none focus:ring-0 text-slate-700 w-24 p-0 bg-transparent"
               />
             </div>
             <span className="text-slate-300">|</span>
             <div className="flex items-center gap-1">
               <span className="text-xs text-slate-500 font-bold">إلى</span>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={(e) => setEndDate(e.target.value)}
                 className="text-sm border-none focus:ring-0 text-slate-700 w-24 p-0 bg-transparent"
               />
             </div>
           </div>

           {/* Right: Actions */}
           <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
             <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">
               <Printer className="w-4 h-4" />
               طباعة
             </button>

             <button 
               onClick={handleDownloadPDF} 
               disabled={isGeneratingPdf}
               className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
             >
               <FileDown className="w-4 h-4" />
               {isGeneratingPdf ? '...' : 'PDF'}
             </button>
             
             <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">
               <FileSpreadsheet className="w-4 h-4" />
               Excel
             </button>
           </div>
        </div>

        {/* Row 2: Search & Type Filters */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 px-3 pb-3 border-t border-slate-200/50 pt-3">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم المستند..."
                className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            </div>

            {/* Type Filters */}
            <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shrink-0 shadow-sm">
              <button 
                onClick={() => toggleType('invoice')}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-bold border-l ${selectedTypes.invoice ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {selectedTypes.invoice ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                فواتير
              </button>
              <button 
                onClick={() => toggleType('payment')}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-bold border-l ${selectedTypes.payment ? 'bg-green-50 text-green-700' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {selectedTypes.payment ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                سداد
              </button>
              <button 
                onClick={() => toggleType('return')}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-bold ${selectedTypes.return ? 'bg-red-50 text-red-700' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {selectedTypes.return ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                مرتجع
              </button>
            </div>
        </div>
      </div>

      {/* Printable Content - Targeted by ID for PDF generation */}
      <div id="printable-content" className="p-8 max-w-5xl mx-auto print:max-w-none print:w-full print:p-0 bg-white">
        
        {/* Print Header */}
        <div className="mb-8 border-b pb-6">
          <div className="flex justify-between items-start mb-4">
            {/* Right: Company Info */}
            <div>
               <h1 className="text-2xl font-bold text-slate-900">{settings?.companyName || 'نظام إدارة الموردين'}</h1>
               <p className="text-sm text-slate-500 mt-1">كشف حساب مورد</p>
            </div>
            
             {/* Left: Logo */}
             {settings?.logoUrl && (
                <img src={settings.logoUrl} alt="Logo" className="h-20 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
             )}
          </div>

          <div className="text-center mt-6">
             <h2 className="text-xl text-primary-700 font-bold">{supplier.name}</h2>
             {supplier.phone && <p className="text-sm text-slate-500 mt-1">هاتف: {supplier.phone}</p>}
          </div>

          <div className="flex justify-center gap-6 mt-4 text-sm text-slate-600 bg-slate-50 py-2 rounded-lg border border-slate-100">
             <span>من تاريخ: <span className="font-bold text-slate-900">{formatDate(startDate)}</span></span>
             <span>إلى تاريخ: <span className="font-bold text-slate-900">{formatDate(endDate)}</span></span>
          </div>
        </div>

        {/* Totals Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
             <p className="text-xs text-slate-500 mb-1">رصيد ما قبل الفترة</p>
             <p className="font-bold text-lg dir-ltr">{openingBalance.toLocaleString()}</p>
           </div>
           <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
             <p className="text-xs text-blue-600 mb-1">مشتريات خلال الفترة</p>
             <p className="font-bold text-lg text-blue-700 dir-ltr">{totals.debit.toLocaleString()}</p>
           </div>
           <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
             <p className="text-xs text-green-600 mb-1">سداد/مرتجع خلال الفترة</p>
             <p className="font-bold text-lg text-green-700 dir-ltr">{totals.credit.toLocaleString()}</p>
           </div>
           <div className="bg-slate-800 p-4 rounded-lg text-white text-center">
             <p className="text-xs text-slate-300 mb-1">الرصيد النهائي الحالي</p>
             <p className="font-bold text-xl dir-ltr">{runningBalance.toLocaleString()}</p>
           </div>
        </div>

        {/* Detailed Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-800 font-bold">
              <tr>
                <th className="p-3 text-right border-b">التاريخ</th>
                <th className="p-3 text-right border-b">نوع العملية</th>
                <th className="p-3 text-right border-b">رقم المستند</th>
                <th className="p-3 text-right border-b w-1/3">ملاحظات</th>
                <th className="p-3 text-center border-b">مدين (علينا)</th>
                <th className="p-3 text-center border-b">دائن (لنا)</th>
                <th className="p-3 text-center border-b bg-slate-100">الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Opening Balance Row */}
              <tr className="bg-amber-50 print:bg-amber-50">
                <td className="p-3 text-slate-500">{formatDate(startDate)}</td>
                <td className="p-3 font-bold text-slate-700">رصيد افتتاحي (ما قبل الفترة)</td>
                <td className="p-3 text-center">-</td>
                <td className="p-3 text-center">-</td>
                <td className="p-3 text-center text-slate-400">-</td>
                <td className="p-3 text-center text-slate-400">-</td>
                <td className="p-3 text-center font-bold dir-ltr">{openingBalance.toLocaleString()}</td>
              </tr>

              {periodTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">لا توجد عمليات مطابقة للبحث/الفلتر خلال هذه الفترة</td>
                </tr>
              )}

              {periodTransactions.map((t) => {
                 const isDebit = t.type === 'invoice';
                 const amount = t.amount;
                 if (isDebit) runningBal += amount;
                 else runningBal -= amount;

                 // Determine background color based on type
                 // Invoice -> Blue, Payment -> Green, Return -> Red
                 let rowClass = 'bg-white';
                 if (t.type === 'invoice') rowClass = 'bg-blue-50/70 print:bg-blue-50';
                 else if (t.type === 'payment') rowClass = 'bg-green-50/70 print:bg-green-50';
                 else if (t.type === 'return') rowClass = 'bg-red-50/70 print:bg-red-50';

                 return (
                   <tr key={t.id} className={`${rowClass} border-b border-white print:border-slate-200 print:break-inside-avoid`}>
                     <td className="p-3 text-slate-700 font-mono align-top">{formatDate(t.date)}</td>
                     <td className="p-3 align-top">
                       <div className="font-bold text-slate-900">
                         {t.type === 'invoice' ? 'فاتورة مشتريات' : t.type === 'payment' ? 'سداد نقدي/شيك' : 'مرتجع بضاعة'}
                       </div>
                       {t.created_by && (
                         <div className="text-xs text-slate-500 mt-1 opacity-75">بواسطة: {t.created_by}</div>
                       )}
                     </td>
                     <td className="p-3 text-slate-600 font-mono text-xs align-top">{t.reference_number || '-'}</td>
                     
                     {/* Notes Column */}
                     <td className="p-3 text-slate-600 text-sm align-top whitespace-pre-wrap break-words">
                       {t.notes || '-'}
                     </td>

                     {/* Debit Column (Invoices) */}
                     <td className="p-3 text-center align-top">
                       {isDebit ? <span className="font-bold text-blue-800">{amount.toLocaleString()}</span> : '-'}
                     </td>

                     {/* Credit Column (Payments/Returns) */}
                     <td className="p-3 text-center align-top">
                       {!isDebit ? <span className="font-bold text-green-800">{amount.toLocaleString()}</span> : '-'}
                     </td>

                     {/* Balance */}
                     <td className="p-3 text-center font-bold text-slate-800 bg-white/40 dir-ltr align-top">
                       {runningBal.toLocaleString()}
                     </td>
                   </tr>
                 );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <tr>
                <td colSpan={4} className="p-3 text-center">الإجمالي (للمعروض فقط)</td>
                <td className="p-3 text-center text-blue-800">{totals.debit.toLocaleString()}</td>
                <td className="p-3 text-center text-green-800">{totals.credit.toLocaleString()}</td>
                <td className="p-3 text-center bg-slate-200 text-slate-900 dir-ltr">{runningBal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer for Print */}
        <div className="mt-12 pt-8 border-t hidden print-only">
          <div className="flex justify-between text-slate-500 text-sm">
             <p>تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}</p>
             <p>{settings?.companyName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierStatement;
