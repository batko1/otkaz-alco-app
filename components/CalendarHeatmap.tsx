import React, { useMemo, useState } from 'react';
import { DailyReport } from '../services/types';

interface CalendarHeatmapProps {
  reports: DailyReport[];
  onDayClick: (date: string) => void;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ reports, onDayClick }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const reportsMap = useMemo(() => {
    const map = new Map<string, DailyReport>();
    reports.forEach(r => {
      const dateKey = new Date(r.date).toISOString().split('T')[0];
      map.set(dateKey, r);
    });
    return map;
  }, [reports]);

  const gridData = useMemo(() => {
    const today = new Date();
    const weeks = 20; 
    const daysToRender = weeks * 7;
    
    const dates: Date[] = [];
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToRender + 1);
    
    // Align to Monday
    const dayOfWeek = startDate.getDay(); 
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - offset);

    for (let i = 0; i < daysToRender + 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      if (d > today) break; 
      dates.push(d);
    }

    return dates;
  }, []);

  const weeksData = useMemo(() => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    gridData.forEach((date) => {
      currentWeek.push(date);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
  }, [gridData]);

  const getColorClass = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const report = reportsMap.get(dateKey);
    const isSelected = selectedDate === dateKey;
    const baseClass = "w-[12px] h-[12px] rounded-[3px] transition-all duration-300";

    if (isSelected) return `${baseClass} ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1C1C1E] z-10 scale-125`;

    if (!report) return `${baseClass} bg-gray-200 dark:bg-white/10`;

    if (report.didDrink) return `${baseClass} bg-red-500`;

    if (report.moodLevel >= 8) return `${baseClass} bg-green-500`; // Excellent
    if (report.moodLevel >= 5) return `${baseClass} bg-green-400`; // Good
    return `${baseClass} bg-green-300`; // Tough
  };

  const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const handleDayClick = (date: Date) => {
    if (window.Telegram?.WebApp?.HapticFeedback && window.Telegram.WebApp.isVersionAtLeast('6.1')) {
        try {
            window.Telegram.WebApp.HapticFeedback.selectionChanged();
        } catch (e) {
            // ignore
        }
    }
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    onDayClick(dateStr);
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="flex justify-between items-end mb-2 px-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Карта трезвости</span>
        <div className="flex gap-1 text-[9px] text-gray-400 items-center">
            <span>Меньше</span>
            <div className="w-2 h-2 bg-gray-200 dark:bg-white/10 rounded-[1px]"></div>
            <div className="w-2 h-2 bg-green-300 rounded-[1px]"></div>
            <div className="w-2 h-2 bg-green-500 rounded-[1px]"></div>
            <span>Больше</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        <div className="flex gap-[3px] min-w-max">
            <div className="flex flex-col gap-[3px] mr-1 text-[9px] text-gray-300 font-medium pt-[15px]">
                <div className="h-[12px]"></div> 
                <div className="h-[12px] flex items-center">Пн</div>
                <div className="h-[12px]"></div>
                <div className="h-[12px] flex items-center">Ср</div>
                <div className="h-[12px]"></div>
                <div className="h-[12px] flex items-center">Пт</div>
                <div className="h-[12px]"></div>
            </div>

            {weeksData.map((week, weekIdx) => {
                const firstDayOfWeek = week[0];
                const showMonthLabel = firstDayOfWeek.getDate() <= 7; 

                return (
                    <div key={weekIdx} className="flex flex-col gap-[3px]">
                        <div className="h-[12px] mb-[3px] text-[9px] text-gray-400 font-bold overflow-visible whitespace-nowrap">
                            {showMonthLabel ? MONTHS[firstDayOfWeek.getMonth()] : ''}
                        </div>
                        
                        {week.map((date, dayIdx) => (
                            <div 
                                key={dayIdx}
                                onClick={() => handleDayClick(date)}
                                className={getColorClass(date)}
                            />
                        ))}
                    </div>
                );
            })}
        </div>
      </div>
      
      {selectedDate && (
          <div className="mt-2 text-xs text-center text-gray-500 animate-fade-in">
              Выбран: <span className="font-bold text-gray-800 dark:text-white">
                  {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </span>
          </div>
      )}
    </div>
  );
};