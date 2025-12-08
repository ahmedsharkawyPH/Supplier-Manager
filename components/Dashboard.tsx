
import React from 'react';
import { FileText, DollarSign, FileWarning, ArrowLeft } from 'lucide-react';
import { TransactionType } from '../types';

interface Props {
  onNavigate: (type: TransactionType) => void;
}

const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 mt-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">مرحباً بك 👋</h2>
        <p className="text-slate-500">اختر العملية التي تريد القيام بها</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        
        {/* Invoice Card */}
        <button
          onClick={() => onNavigate('invoice')}
          className="group relative bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-right overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-700">فاتورة مشتريات</h3>
          <p className="text-slate-500 text-sm mb-6">تسجيل فاتورة جديدة من مورد وإدراج الأصناف</p>
          <div className="flex items-center text-blue-600 font-bold text-sm">
            <span>بدء التسجيل</span>
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          </div>
        </button>

        {/* Payment Card */}
        <button
          onClick={() => onNavigate('payment')}
          className="group relative bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-right overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
          <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <DollarSign className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-emerald-700">سداد دفعة</h3>
          <p className="text-slate-500 text-sm mb-6">تسجيل سداد نقدي أو شيك لمورد لخصمه من الحساب</p>
          <div className="flex items-center text-emerald-600 font-bold text-sm">
            <span>بدء التسجيل</span>
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          </div>
        </button>

        {/* Return Card */}
        <button
          onClick={() => onNavigate('return')}
          className="group relative bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-right overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
          <div className="bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
            <FileWarning className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-orange-700">مرتجع بضاعة</h3>
          <p className="text-slate-500 text-sm mb-6">تسجيل رد بضاعة لمورد وخصم قيمتها من المديونية</p>
          <div className="flex items-center text-orange-600 font-bold text-sm">
            <span>بدء التسجيل</span>
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          </div>
        </button>

      </div>
    </div>
  );
};

export default Dashboard;
