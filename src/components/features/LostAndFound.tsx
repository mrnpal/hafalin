'use client';

import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function LostAndFound() {
  // Dummy data (Nanti tinggal diganti dengan hasil fetch dari services.ts)
  const hafalans = [
    { id: '1', title: 'Surah Al-Mulk: 1-10', status: 'green', next_review: '2026-06-15' },
    { id: '2', title: 'Surah Ar-Rahman: 15-25', status: 'yellow', next_review: 'Hari Ini' },
    { id: '3', title: 'Doa Al-Ma\'tsurat', status: 'red', next_review: 'Overdue!' },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'red': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: <AlertCircle size={16} /> };
      case 'yellow': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: <Clock size={16} /> };
      case 'green': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <CheckCircle2 size={16} /> };
      default: return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: null };
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-nilam-100 p-6">
      <h2 className="text-xl font-semibold text-nilam-600 mb-4 flex items-center gap-2">
        🔍 Lost & Found Tracker
      </h2>
      <div className="space-y-3">
        {hafalans.map((item) => {
          const style = getStatusStyle(item.status);
          return (
            <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:shadow-md transition bg-white">
              <div>
                <h3 className="font-medium text-gray-800">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Jadwal Review: <span className={`font-semibold ${item.status === 'red' ? 'text-red-500' : 'text-nilam-500'}`}>{item.next_review}</span>
                </p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                {style.icon}
                <span className="uppercase">{item.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}