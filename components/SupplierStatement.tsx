
import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, Transaction, AppSettings } from '../types';
import { Printer, FileSpreadsheet, ArrowRight, Filter, Calendar, FileDown, Search, CheckSquare, Square, ChevronRight, ChevronLeft } from 'lucide-react';
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
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};

const PAGE_SIZE = 20;

const SupplierStatement: React.FC<Props> = ({ supplier, transactions, onBack, settings }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchQuery, selectedTypes]);

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
  const { 
    openingBalanceAtStart, 
    filteredWithBalances, 
    paginatedTransactions, 
    totalPages,
    totals 
  } = useMemo(() => {
    // 1. Sort all transactions ASCENDING for correct chronological balance calculation
    const sortedAll = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Calculate Opening Balance (before startDate)
    let runningBalance = Number(supplier.opening_balance || 0);
    const inRangeWithBalances: (Transaction & { runningBalance: number })[] = [];
    
    sortedAll.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'invoice') runningBalance += amount;
      else runningBalance -= amount;

      if (t.date >= startDate && t.date <= endDate) {
        // Apply filters
        const matchesSearch = !searchQuery || (t.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedTypes[t.type];
        
        if (matchesSearch && matchesType) {
          inRangeWithBalances.push({ ...t, runningBalance });
        }
      }
    });

    // Calculate initial opening balance for the selected period
    let opBalanceAtStart = Number(supplier.opening_balance || 0);
    sortedAll.forEach(t => {
        if (t.date < startDate) {
            if (t.type === 'invoice') opBalanceAtStart += t.amount;
            else opBalanceAtStart -= t.amount;
        }
    });

    // 3. Totals for the period
    const periodTotals = { debit: 0, credit: 0 };
    inRangeWithBalances.forEach(t => {
       if (t.type === 'invoice') periodTotals.debit += t.amount;
       else periodTotals.credit += t.amount;
    });

    // 4. Sort DESCENDING for display (Newest First)
    const descendingInRange = [...inRangeWithBalances].sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0); // fallback to ID for same-day order
    });

    // 5. Pagination Logic
    const totalItems = descendingInRange.length;
    const pages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageItems = descendingInRange.slice(startIdx, startIdx + PAGE_SIZE);

    return {
      openingBalanceAtStart: opBalanceAtStart,
      filteredWithBalances: descendingInRange,
      paginatedTransactions: pageItems,
      totalPages: pages,
      totals: periodTotals
    };
  }, [transactions, supplier, startDate, endDate, searchQuery, selectedTypes, currentPage]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const element = document.getElementById('printable-content');
    const dateStr = formatDate(endDate).replace(/\//g, '-');
    const safeName = supplier.name.replace(/\s+/g, '_');
    const filename = `كشف_حساب_${safeName}_${dateStr}.pdf`;

    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };

    try {
      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;
      await html2pdf().set(opt).from(element).save();
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء تحميل الملف');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportExcel = () => {
    const data = [];
    data.push({ 'التاريخ': `كشف حساب: ${supplier.name}` });
    data.push({ 'التاريخ': `من: ${formatDate(startDate)} إلى: ${formatDate(endDate)}` });
    data.push({});

    data.push({
      'التاريخ': formatDate(startDate),
      'نوع العملية': 'رصيد افتتاحي ما قبل الفترة',
      'الرصيد': openingBalanceAtStart
    });

    // Excel is often preferred chronological, but we'll follow UI (Descending)
    filteredWithBalances.forEach(t => {
      data.push({
        'التاريخ': formatDate(t.date),
        'نوع العملية': t.type === 'invoice' ? 'فاتورة' : t.type === 'payment' ? 'سداد' : 'مرتجع',
        'رقم المستند': t.reference_number || '',
        'مدين': t.type === 'invoice' ? t.amount : 0,
        'دائن': t.type !== 'invoice' ? t.amount : 0,
        'الرصيد': t.runningBalance
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "كشف حساب");
    XLSX.writeFile(wb, `Statement_${supplier.name}.xlsx`);
  };

  const toggleType = (type: keyof typeof selectedTypes) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="bg-white min-h-screen pb-10">
      {/* Header - No Print */}
      <div className="no-print border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col xl:flex-row items-center justify-between p-3 gap-3">
           <div className="flex items-center gap-3 w-full xl:w-auto">
             <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
               <ArrowRight className="w-6 h-6 text-slate-600" />
             </button>
             <h2 className="font-bold text-lg text-slate-800 line-clamp-1">
               كشف حساب: <span className="text-primary-600">{supplier.name}</span>
             </h2>
           </div>

           <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm w-full xl:w-auto justify-center">
             <Calendar className="w-4 h-4 text-slate-500" />
             <div className="flex items-center gap-1">
               <span className="text-xs text-slate-500 font-bold">من</span>
               <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm border-none focus:ring-0 text-slate-700 w-24 p-0 bg-transparent" />
             </div>
             <span className="text-slate-300">|</span>
             <div className="flex items-center gap-1">
               <span className="text-xs text-slate-500 font-bold">إلى</span>
               <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm border-none focus:ring-0 text-slate-700 w-24 p-0 bg-transparent" />
             </div>
           </div>

           <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
             <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">
               <Printer className="w-4 h-4" /> طباعة
             </button>
             <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
               <FileDown className="w-4 h-4" /> {isGeneratingPdf ? '...' : 'PDF'}
             </button>
             <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors">
               <FileSpreadsheet className="w-4 h-4" /> Excel
             </button>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-3 px-3 pb-3 border-t border-slate-200/50 pt-3">
            <div className="relative w-full md:w-64">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم المستند..." className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-primary-500" />
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shrink-0 shadow-sm">
              <button onClick={() => toggleType('invoice')} className={`flex items-center gap-1 px-3 py-2 text-xs font-bold border-l ${selectedTypes.invoice ? 'bg-blue-50 text-blue-700' : 'text-slate-400'}`}>
                {selectedTypes.invoice ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />} فواتير
              </button>
              <button onClick={() => toggleType('payment')} className={`flex items-center gap-1 px-3 py-2 text-xs font-bold border-l ${selectedTypes.payment ? 'bg-green-50 text-green-700' : 'text-slate-400'}`}>
                {selectedTypes.payment ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />} سداد
              </button>
              <button onClick={() => toggleType('return')} className={`flex items-center gap-1 px-3 py-2 text-xs font-bold ${selectedTypes.return ? 'bg-red-50 text-red-700' : 'text-slate-400'}`}>
                {selectedTypes.return ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />} مرتجع
              </button>
            </div>
            <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              الترتيب: الأحدث أولاً
            </div>
        </div>
      </div>

      <div id="printable-content" className="p-8 max-w-5xl mx-auto print:max-w-none print:w-full print:p-0 bg-white">
        <div className="mb-8 border-b pb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
               <h1 className="text-2xl font-bold text-slate-900">{settings?.companyName}</h1>
               <p className="text-sm text-slate-500 mt-1">كشف حساب مورد</p>
            </div>
             {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-20 object-contain" />}
          </div>
          <div className="text-center mt-6">
             <h2 className="text-xl text-primary-700 font-bold">{supplier.name}</h2>
             {supplier.phone && <p className="text-sm text-slate-500 mt-1">هاتف: {supplier.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 no-print">
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
             <p className="text-xs text-slate-500 mb-1">رصيد ما قبل الفترة</p>
             <p className="font-bold text-lg dir-ltr">{openingBalanceAtStart.toLocaleString()}</p>
           </div>
           <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
             <p className="text-xs text-blue-600 mb-1">مشتريات الفترة</p>
             <p className="font-bold text-lg text-blue-700 dir-ltr">{totals.debit.toLocaleString()}</p>
           </div>
           <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
             <p className="text-xs text-green-600 mb-1">سداد/مرتجع الفترة</p>
             <p className="font-bold text-lg text-green-700 dir-ltr">{totals.credit.toLocaleString()}</p>
           </div>
           <div className="bg-slate-800 p-4 rounded-lg text-white text-center">
             <p className="text-xs text-slate-300 mb-1">الرصيد الإجمالي الحالي</p>
             <p className="font-bold text-xl dir-ltr">{(openingBalanceAtStart + totals.debit - totals.credit).toLocaleString()}</p>
           </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white font-bold">
              <tr>
                <th className="p-3 text-right border-b border-slate-700">التاريخ</th>
                <th className="p-3 text-right border-b border-slate-700">نوع العملية</th>
                <th className="p-3 text-right border-b border-slate-700">رقم المستند</th>
                <th className="p-3 text-right border-b border-slate-700 w-1/3">ملاحظات</th>
                <th className="p-3 text-center border-b border-slate-700">مدين</th>
                <th className="p-3 text-center border-b border-slate-700">دائن</th>
                <th className="p-3 text-center border-b border-slate-700 bg-slate-900">الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold italic">لا توجد عمليات مسجلة في هذه الفترة</td></tr>
              )}

              {paginatedTransactions.map((t) => {
                 const isDebit = t.type === 'invoice';
                 return (
                   <tr key={t.id} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                     <td className="p-3 text-slate-700 font-mono">{formatDate(t.date)}</td>
                     <td className="p-3 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                            t.type === 'invoice' ? 'bg-blue-100 text-blue-700' : 
                            t.type === 'payment' ? 'bg-green-100 text-green-700' : 
                            'bg-orange-100 text-orange-700'
                        }`}>
                            {t.type === 'invoice' ? 'فاتورة' : t.type === 'payment' ? 'سداد' : 'مرتجع'}
                        </span>
                     </td>
                     <td className="p-3 text-slate-600 font-mono text-xs">{t.reference_number || '-'}</td>
                     <td className="p-3 text-slate-600 text-xs">{t.notes || '-'}</td>
                     <td className="p-3 text-center">{isDebit ? <span className="font-bold text-blue-700">{t.amount.toLocaleString()}</span> : '-'}</td>
                     <td className="p-3 text-center">{!isDebit ? <span className="font-bold text-green-700">{t.amount.toLocaleString()}</span> : '-'}</td>
                     <td className="p-3 text-center font-bold dir-ltr bg-slate-50/80 border-r border-slate-100 text-slate-900">{t.runningBalance.toLocaleString()}</td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - No Print */}
        <div className="no-print mt-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-4">
          <div className="text-sm text-slate-500">
            عرض {paginatedTransactions.length} من أصل {filteredWithBalances.length} معاملة
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] md:max-w-none py-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all shrink-0 ${currentPage === i + 1 ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600 border border-slate-200'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="text-xs font-bold text-slate-400">
            صفحة {currentPage} من {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierStatement;
