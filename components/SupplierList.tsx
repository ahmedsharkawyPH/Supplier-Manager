
import React from 'react';
import { Supplier, SupplierSummary } from '../types';
import { Phone, FileSpreadsheet, ChevronLeft, Edit2, UserPlus } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  summaries: SupplierSummary[];
  onDeleteTransaction: (id: number) => void;
  onSelectSupplier: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onAddNewSupplier: () => void;
}

const SupplierList: React.FC<Props> = ({ summaries, onSelectSupplier, onEditSupplier, onAddNewSupplier }) => {

  const handleExportExcel = () => {
    const summaryData = summaries.map(s => ({
      'المورد': s.supplier.name,
      'رقم الهاتف': s.supplier.phone || '-',
      'إجمالي الفواتير': s.totalInvoices,
      'إجمالي السداد': s.totalPayments,
      'إجمالي المرتجع': s.totalReturns,
      'الرصيد الحالي': s.balance
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص الموردين");

    const date = new Date();
    const formattedDate = `${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}`;
    XLSX.writeFile(wb, `Suppliers_Summary_${formattedDate}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
       <div className="border-b border-slate-100 p-4 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
        <h2 className="font-bold text-lg text-slate-800">قائمة الموردين</h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddNewSupplier}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            مورد جديد
          </button>
          
          <button 
            onClick={handleExportExcel}
            disabled={summaries.length === 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            تصدير القائمة
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-slate-100">
        {summaries.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            لا يوجد موردين حالياً. قم بإضافة مورد جديد للبدء.
          </div>
        )}
        {summaries.map((summary) => (
          <div key={summary.supplier.id} className="group transition-colors hover:bg-slate-50 flex items-center pr-4">
            
            <button 
              onClick={() => onEditSupplier(summary.supplier)}
              className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
              title="تعديل بيانات المورد"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Summary Row - Clickable to open Statement */}
            <div 
              className="flex-1 p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              onClick={() => onSelectSupplier(summary.supplier)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                  {summary.supplier.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                     {summary.supplier.name}
                  </h3>
                  {summary.supplier.phone && (
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Phone className="w-3 h-3" />
                      <span>{summary.supplier.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <span className="block text-slate-400 text-xs">فواتير</span>
                  <span className="font-medium text-slate-700">{summary.totalInvoices.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="block text-slate-400 text-xs">سداد</span>
                  <span className="font-medium text-emerald-600">{summary.totalPayments.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="block text-slate-400 text-xs">مرتجع</span>
                  <span className="font-medium text-orange-600">{summary.totalReturns.toLocaleString()}</span>
                </div>
                 <div className="text-center min-w-[100px] border-r border-slate-200 pr-4">
                  <span className="block text-slate-400 text-xs">الرصيد المتبقي</span>
                  <span className={`font-bold text-lg ${summary.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {summary.balance.toLocaleString()}
                  </span>
                </div>
                <div className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 text-xs text-primary-600 font-bold">
                    كشف حساب
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplierList;
