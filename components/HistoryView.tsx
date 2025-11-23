import React, { useEffect, useState } from 'react';
import { DailyReport, TriggerStat } from '../services/types';
import { getReports, calculateStats, calculateTriggerStats } from '../services/storage';
import { Calendar, TrendingUp, ChevronDown, ChevronUp, Beer, FileText, PieChart, Loader2 } from 'lucide-react';
import { Card } from './Card';
import { CalendarHeatmap } from './CalendarHeatmap';
import { TriggerChart } from './TriggerChart';

export const HistoryView: React.FC = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [stats, setStats] = useState({ totalDays: 0, currentStreak: 0, bestStreak: 0, relapseCount: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Analytics
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const [triggerStats, setTriggerStats] = useState<TriggerStat[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getReports();
        setReports(data);
        setStats(calculateStats(data));
        setTriggerStats(calculateTriggerStats(data));
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleExpand = (date: string) => {
    setExpandedId(expandedId === date ? null : date);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';

    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
  };

  const handleHeatmapClick = (dateStr: string) => {
    // Switch to list view to show details
    setViewMode('list');
    
    // Check if report exists
    const hasReport = reports.some(r => r.date.startsWith(dateStr));
    
    if (hasReport) {
        const report = reports.find(r => r.date.startsWith(dateStr));
        if (report) {
            setExpandedId(report.date);
            setTimeout(() => {
                const element = document.getElementById(`report-${report.date}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-blue-500');
                    setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 2000);
                }
            }, 100);
        }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <span className="text-gray-400 text-sm">Загрузка истории...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* --- Stats Overview --- */}
      <div className="grid grid-cols-2 gap-3">
        <Card noPadding className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Текущая серия</span>
            </div>
            <div className="text-3xl font-black">{stats.currentStreak} <span className="text-sm font-normal opacity-80">дн.</span></div>
          </div>
        </Card>
        
        <Card noPadding className="bg-white dark:bg-[#1C1C1E]">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Всего записей</span>
            </div>
            <div className="text-3xl font-black dark:text-white">{stats.totalDays}</div>
          </div>
        </Card>
      </div>

      {/* --- Heatmap --- */}
      <Card noPadding>
        <div className="p-4">
            <CalendarHeatmap reports={reports} onDayClick={handleHeatmapClick} />
        </div>
      </Card>

      {/* --- View Toggle --- */}
      <div className="flex bg-gray-100 dark:bg-[#1C1C1E] p-1 rounded-xl">
        <button 
          onClick={() => setViewMode('list')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-gray-500'}`}
        >
          <FileText className="w-4 h-4" />
          Список
        </button>
        <button 
          onClick={() => setViewMode('analytics')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'analytics' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-gray-500'}`}
        >
          <PieChart className="w-4 h-4" />
          Аналитика
        </button>
      </div>

      {/* --- Content --- */}
      {viewMode === 'analytics' ? (
         <Card title="Топ триггеров">
             <div className="mb-4 text-xs text-gray-500">
               Причины, которые чаще всего вызывают сильную тягу или приводят к срыву.
             </div>
             <TriggerChart data={triggerStats} />
         </Card>
      ) : (
        <div>
          {reports.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <div className="w-16 h-16 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm">Пока нет записей. <br/>Заполни отчет на главной!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report, idx) => (
                <div 
                  key={idx} 
                  id={`report-${report.date}`}
                  onClick={() => toggleExpand(report.date)}
                  className={`bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border transition-all duration-300 active:scale-[0.98] ${
                    report.didDrink 
                      ? 'border-red-100 dark:border-red-900/30' 
                      : 'border-green-100 dark:border-green-900/30'
                  } ${expandedId === report.date ? 'ring-2 ring-blue-500/20 dark:ring-blue-500/40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                        report.didDrink 
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-500' 
                          : 'bg-green-100 dark:bg-green-900/20 text-green-600'
                      }`}>
                        {report.didDrink ? '🍷' : '🛡️'}
                      </div>
                      <div>
                        <div className="font-bold text-base dark:text-white flex items-center gap-2">
                          {formatDate(report.date)}
                          {report.didDrink && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-[10px] rounded-full uppercase font-bold">Срыв</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 font-medium mt-0.5 flex gap-2">
                           <span>Настроение: {report.moodLevel}/10</span>
                           <span>•</span>
                           <span>Тяга: {report.cravingLevel}/10</span>
                        </div>
                      </div>
                    </div>
                    
                    {expandedId === report.date ? <ChevronUp className="w-5 h-5 text-gray-300" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                  </div>

                  {expandedId === report.date && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 animate-fade-in">
                      
                      {report.didDrink && (
                          <div className="mb-3 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl flex items-start gap-3">
                               <Beer className="w-5 h-5 text-red-400 mt-0.5" />
                               <div>
                                   <span className="text-xs font-bold text-red-500 uppercase block mb-1">Детали срыва</span>
                                   <p className="text-sm text-gray-700 dark:text-gray-300">
                                       Выпито: <span className="font-medium text-black dark:text-white">{report.alcoholAmount}</span> ({report.alcoholType})
                                   </p>
                               </div>
                          </div>
                      )}

                      {report.triggers && report.triggers.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs font-bold text-gray-400 uppercase block mb-2">Триггеры</span>
                          <div className="flex flex-wrap gap-1.5">
                            {report.triggers.map((t, i) => (
                              <span key={i} className="px-2.5 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-xs rounded-lg font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.note && (
                        <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                          <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Заметка</span>
                          <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{report.note}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};